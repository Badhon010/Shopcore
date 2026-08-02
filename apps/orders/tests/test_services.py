"""Tests for the orders app services."""
from __future__ import annotations

from decimal import Decimal

import pytest

from apps.accounts.tests.factories import AddressFactory, UserFactory
from apps.cart.models import Cart, CartItem
from apps.coupons.tests.factories import CouponFactory
from apps.inventory.models import Warehouse
from apps.inventory.tests.factories import StockItemFactory
from apps.orders.constants import OrderStatus
from apps.orders.exceptions import InvalidOrderTransitionError
from apps.orders.models import Order
from apps.orders.services import place_order, transition_order_status
from apps.orders.tests.factories import OrderFactory


def _default_warehouse():
    """Return a single shared default warehouse. place_order() -> reserve_stock()
    resolves the warehouse via `Warehouse.objects.filter(is_default=True).first()`
    when none is passed explicitly, so every StockItem used in these tests must
    live in the SAME default warehouse or lookups will pick an unrelated one."""
    warehouse = Warehouse.objects.filter(is_default=True).first()
    if warehouse is None:
        warehouse = Warehouse.objects.create(name="Test Warehouse", code="WH-TEST", is_default=True)
    return warehouse


def _cart_with_stocked_item(user, quantity_on_hand: int = 10):
    """Build an active Cart with one CartItem, backed by a StockItem with
    stock — enough for place_order() to succeed end-to-end."""
    stock = StockItemFactory(
        quantity_on_hand=quantity_on_hand, quantity_reserved=0, warehouse=_default_warehouse()
    )
    cart = Cart.objects.create(user=user, is_active=True)
    CartItem.objects.create(
        cart=cart,
        variant=stock.variant,
        quantity=1,
        unit_price_snapshot=stock.variant.effective_price,
    )
    return cart


def _shipping_address(user):
    return AddressFactory(user=user)


@pytest.mark.django_db
class TestTransitionOrderStatus:
    def test_valid_transition(self):
        order = OrderFactory(status=OrderStatus.PENDING_PAYMENT)
        order = transition_order_status(order, OrderStatus.PAID)
        order.refresh_from_db()
        assert order.status == OrderStatus.PAID

    def test_invalid_transition(self):
        order = OrderFactory(status=OrderStatus.PENDING_PAYMENT)
        with pytest.raises(InvalidOrderTransitionError) as exc_info:
            transition_order_status(order, OrderStatus.DELIVERED)
        assert "INVALID_ORDER_TRANSITION" == exc_info.value.code

    def test_transition_creates_history(self):
        order = OrderFactory(status=OrderStatus.PENDING_PAYMENT)
        transition_order_status(order, OrderStatus.CANCELLED, note="Test cancellation.")
        assert order.status_history.filter(
            to_status=OrderStatus.CANCELLED, note="Test cancellation."
        ).exists()

    def test_cancelled_order_cannot_transition(self):
        order = OrderFactory(status=OrderStatus.CANCELLED)
        with pytest.raises(InvalidOrderTransitionError):
            transition_order_status(order, OrderStatus.PAID)


@pytest.mark.django_db
class TestOrderPermissions:
    def test_user_cannot_see_other_users_orders(self):
        from django.urls import reverse
        from rest_framework.test import APIClient

        from apps.accounts.tests.factories import UserFactory
        from apps.orders.tests.factories import OrderFactory

        user1 = UserFactory()
        user2 = UserFactory()
        OrderFactory(user=user2)

        client = APIClient()
        response = client.post(
            reverse("accounts:login"),
            {"email": user1.email, "password": "testpassword123!"},
            format="json",
        )
        token = response.data["access"]
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        response = client.get(reverse("orders:order-list"))
        assert response.status_code == 200
        assert response.data["count"] == 0


@pytest.mark.django_db
class TestPlaceOrderIdempotency:
    """Fix #1: idempotency keys must be scoped per-user, not global."""

    def test_same_key_different_users_creates_two_orders(self):
        user1, user2 = UserFactory(), UserFactory()
        cart1 = _cart_with_stocked_item(user1)
        cart2 = _cart_with_stocked_item(user2)

        order1 = place_order(user1, cart1, _shipping_address(user1), idempotency_key="shared-key")
        order2 = place_order(user2, cart2, _shipping_address(user2), idempotency_key="shared-key")

        assert order1.pk != order2.pk
        assert order1.user == user1
        assert order2.user == user2

    def test_same_key_same_user_returns_cached_order(self):
        user = UserFactory()
        cart = _cart_with_stocked_item(user)
        address = _shipping_address(user)

        order1 = place_order(user, cart, address, idempotency_key="retry-key")

        # Simulate a client retry: cart is gone/inactive, but the same
        # idempotency key must return the original order, not error out
        # or create a second one.
        order2 = place_order(user, cart, address, idempotency_key="retry-key")

        assert order1.pk == order2.pk
        assert Order.objects.filter(user=user, idempotency_key="retry-key").count() == 1

    def test_concurrent_duplicate_request_resolves_to_single_order(self):
        """Simulates the IntegrityError race window: two 'requests' racing to
        insert the same (user, idempotency_key) pair must resolve to exactly
        one order, with the loser transparently returning the winner's order."""
        user = UserFactory()
        cart = _cart_with_stocked_item(user)
        order1 = place_order(user, cart, _shipping_address(user), idempotency_key="race-key")

        # A second call with a fresh cart but the same key must not create a
        # second order — the pre-check (or IntegrityError fallback) must
        # return the existing order.
        cart2 = _cart_with_stocked_item(user)
        order2 = place_order(user, cart2, _shipping_address(user), idempotency_key="race-key")

        assert order1.pk == order2.pk
        assert Order.objects.filter(user=user, idempotency_key="race-key").count() == 1


@pytest.mark.django_db
class TestTransitionOrderStatusRace:
    """Fix #2: transitions must be re-entrancy safe under the row lock."""

    def test_duplicate_transition_to_same_target_is_rejected(self):
        """Simulates two racing webhook deliveries both trying to mark the
        same order PAID. The second must fail with InvalidOrderTransitionError
        instead of double-applying side effects (e.g. committing stock twice)."""
        order = OrderFactory(status=OrderStatus.PENDING_PAYMENT)
        transition_order_status(order, OrderStatus.PAID)

        order.refresh_from_db()
        with pytest.raises(InvalidOrderTransitionError):
            transition_order_status(order, OrderStatus.PAID)

        order.refresh_from_db()
        assert order.status == OrderStatus.PAID
        assert order.status_history.filter(to_status=OrderStatus.PAID).count() == 1

    def test_transition_revalidates_against_locked_row_state(self):
        """The transition must re-check ALLOWED_TRANSITIONS against the
        freshly-locked DB state, not a stale in-memory status."""
        order = OrderFactory(status=OrderStatus.PENDING_PAYMENT)
        transition_order_status(order, OrderStatus.CANCELLED)

        # `order` in memory is now stale relative to what a second concurrent
        # caller might have seen before the cancellation committed.
        stale_order = Order.objects.get(pk=order.pk)
        stale_order.status = OrderStatus.PENDING_PAYMENT  # simulate stale in-memory copy

        with pytest.raises(InvalidOrderTransitionError):
            transition_order_status(stale_order, OrderStatus.PAID)

        order.refresh_from_db()
        assert order.status == OrderStatus.CANCELLED


@pytest.mark.django_db
class TestPlaceOrderCouponRace:
    """Fix #3: coupon usage must be locked and limit-enforced at checkout."""

    def test_usage_limit_enforced_across_sequential_orders(self):
        """place_order() treats an invalid/exhausted coupon as non-fatal
        (checkout proceeds without the discount rather than failing the
        order) — so the second order must succeed, but WITHOUT the coupon
        applied, and times_used must not be double-counted."""
        coupon = CouponFactory(usage_limit_total=1, times_used=0)
        user1, user2 = UserFactory(), UserFactory()
        cart1 = _cart_with_stocked_item(user1)
        cart2 = _cart_with_stocked_item(user2)

        order1 = place_order(user1, cart1, _shipping_address(user1), coupon_code=coupon.code)
        assert order1.coupon_code_snapshot == coupon.code.upper()
        assert order1.discount_total > Decimal("0.00")

        order2 = place_order(user2, cart2, _shipping_address(user2), coupon_code=coupon.code)
        assert order2.coupon_code_snapshot == ""
        assert order2.discount_total == Decimal("0.00")

        coupon.refresh_from_db()
        assert coupon.times_used == 1

    def test_redemption_increments_times_used_exactly_once_per_order(self):
        coupon = CouponFactory(usage_limit_total=5, times_used=0)
        user = UserFactory()
        cart = _cart_with_stocked_item(user)

        place_order(user, cart, _shipping_address(user), coupon_code=coupon.code)

        coupon.refresh_from_db()
        assert coupon.times_used == 1
