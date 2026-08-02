"""Tests for H9: inventory commit failures must roll back the entire order
transition — the order must never be left in PAID state with uncommitted stock.

Also covers _release_reservations_for_order: if a reservation release fails,
the CANCELLED transition must be rolled back too.
"""
from __future__ import annotations

import pytest

from apps.accounts.tests.factories import AddressFactory, UserFactory
from apps.cart.models import Cart, CartItem
from apps.inventory.models import Warehouse
from apps.inventory.tests.factories import StockItemFactory
from apps.orders.constants import OrderStatus
from apps.orders.services import place_order, transition_order_status
from apps.orders.tests.factories import OrderFactory, OrderItemFactory

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _default_warehouse():
    wh = Warehouse.objects.filter(is_default=True).first()
    if wh is None:
        wh = Warehouse.objects.create(name="Test Warehouse", code="WH-ROLLBACK", is_default=True)
    return wh


def _place_real_order(user):
    """Place a real order so the order has items linked to real variants with stock."""
    stock = StockItemFactory(
        quantity_on_hand=10, quantity_reserved=0, warehouse=_default_warehouse()
    )
    cart = Cart.objects.create(user=user, is_active=True)
    CartItem.objects.create(
        cart=cart,
        variant=stock.variant,
        quantity=2,
        unit_price_snapshot=stock.variant.effective_price,
    )
    address = AddressFactory(user=user)
    order = place_order(user, cart, address)
    # Reload to get fresh DB state.
    order.refresh_from_db()
    return order, stock


# ---------------------------------------------------------------------------
# _commit_sale_for_order rollback
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestInventoryCommitRollback:
    def test_missing_stock_item_rolls_back_paid_transition(self):
        """If commit_sale raises (stock item deleted between order placement
        and payment confirmation), the entire PAID transition must roll back.
        The order must stay in PENDING_PAYMENT — not leave a PAID order with
        uncommitted stock."""
        user = UserFactory()
        order, stock = _place_real_order(user)

        assert order.status == OrderStatus.PENDING_PAYMENT

        # Simulate the stock item disappearing before commit_sale runs.
        stock.delete()

        # The transition must fail with an exception propagating up.
        with pytest.raises(Exception):
            transition_order_status(order, OrderStatus.PAID)

        # The order must still be in PENDING_PAYMENT — the DB transaction
        # was rolled back.
        order.refresh_from_db()
        assert order.status == OrderStatus.PENDING_PAYMENT, (
            "Order must not be left in PAID state when inventory commit fails"
        )

    def test_successful_paid_transition_commits_stock(self):
        """Sanity check: a normal PENDING_PAYMENT → PAID transition with valid
        stock must succeed and decrement stock correctly."""
        user = UserFactory()
        order, stock = _place_real_order(user)

        transition_order_status(order, OrderStatus.PAID)

        order.refresh_from_db()
        assert order.status == OrderStatus.PAID

        stock.refresh_from_db()
        # quantity_reserved should be 0 (released by commit_sale)
        assert stock.quantity_reserved == 0
        # quantity_on_hand should be reduced by the ordered quantity (2)
        assert stock.quantity_on_hand == 8

    def test_no_partial_stock_commit_when_second_item_fails(self):
        """When an order has two items and the second commit_sale fails,
        the entire transition rolls back — not just the second item."""
        user = UserFactory()
        wh = _default_warehouse()

        # First item: has a valid stock row
        stock1 = StockItemFactory(quantity_on_hand=10, quantity_reserved=2, warehouse=wh)
        # Second item: stock row will be deleted before the transition
        stock2 = StockItemFactory(quantity_on_hand=5, quantity_reserved=1, warehouse=wh)

        # Build an order with both items manually (bypassing place_order to
        # control the exact setup without triggering double-reservation).
        order = OrderFactory(status=OrderStatus.PENDING_PAYMENT)
        OrderItemFactory(order=order, variant=stock1.variant, quantity=2)
        OrderItemFactory(order=order, variant=stock2.variant, quantity=1)

        # Delete the second stock item to force commit_sale to fail on it.
        stock2.delete()

        with pytest.raises(Exception):
            transition_order_status(order, OrderStatus.PAID)

        order.refresh_from_db()
        assert order.status == OrderStatus.PENDING_PAYMENT

        # The first stock item must also be unchanged (transaction was rolled back).
        stock1.refresh_from_db()
        assert stock1.quantity_reserved == 2  # unchanged
        assert stock1.quantity_on_hand == 10  # unchanged


# ---------------------------------------------------------------------------
# _release_reservations_for_order rollback
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestInventoryReleaseRollback:
    def test_missing_stock_item_rolls_back_cancelled_transition(self):
        """If release_reservation raises during a PENDING_PAYMENT → CANCELLED
        transition, the order must stay in PENDING_PAYMENT — not be left
        CANCELLED with unreleased reservations."""
        user = UserFactory()
        order, stock = _place_real_order(user)

        assert order.status == OrderStatus.PENDING_PAYMENT

        # Delete the stock item so release_reservation raises DoesNotExist.
        stock.delete()

        with pytest.raises(Exception):
            transition_order_status(order, OrderStatus.CANCELLED)

        order.refresh_from_db()
        assert order.status == OrderStatus.PENDING_PAYMENT, (
            "Order must not be left in CANCELLED state when reservation release fails"
        )

    def test_successful_cancel_releases_reservations(self):
        """Sanity check: a normal PENDING_PAYMENT → CANCELLED transition must
        succeed and release all reservations."""
        user = UserFactory()
        order, stock = _place_real_order(user)

        transition_order_status(order, OrderStatus.CANCELLED)

        order.refresh_from_db()
        assert order.status == OrderStatus.CANCELLED

        stock.refresh_from_db()
        assert stock.quantity_reserved == 0
