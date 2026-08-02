"""Tests for audit C-2 / B-5: the refund flow.

process_refund() must:
- create a Refund record,
- mark the order's successful Payment REFUNDED,
- transition the order to REFUNDED, and
- restock the committed sale back to inventory (audit C-1: RETURN movement).

Refunds are staff-only via POST /orders/<number>/refund/.
"""
from __future__ import annotations

from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.tests.factories import AddressFactory, StaffUserFactory, UserFactory
from apps.cart.models import Cart, CartItem
from apps.inventory.models import Warehouse
from apps.inventory.tests.factories import StockItemFactory
from apps.orders.constants import OrderStatus, PaymentStatus
from apps.orders.services import place_order
from apps.payments.constants import PaymentStatus as GatewayPaymentStatus
from apps.payments.exceptions import AlreadyRefundedError, OrderNotRefundableError, RefundError
from apps.payments.models import Payment, Refund
from apps.payments.services import process_refund, record_successful_payment


def _default_warehouse():
    wh = Warehouse.objects.filter(is_default=True).first()
    if wh is None:
        wh = Warehouse.objects.create(name="Test Warehouse", code="WH-REFUND", is_default=True)
    return wh


def _place_real_order(user):
    """Place a real order (qty 2) so it has items linked to real stock."""
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
    order.refresh_from_db()
    return order, stock


def _paid_order(user):
    order, stock = _place_real_order(user)
    record_successful_payment(order, "MANUAL", order.grand_total, "USD")
    order.refresh_from_db()
    stock.refresh_from_db()
    assert order.status == OrderStatus.PAID
    assert stock.quantity_on_hand == 8  # 10 - 2 committed
    return order, stock


@pytest.mark.django_db
class TestProcessRefundService:
    def test_refund_paid_order_restocks_and_flags_payment(self):
        user = UserFactory()
        order, stock = _paid_order(user)

        refund = process_refund(order, actor=None)

        order.refresh_from_db()
        assert order.status == OrderStatus.REFUNDED
        assert order.payment_status == PaymentStatus.REFUNDED
        assert refund.amount == order.grand_total

        stock.refresh_from_db()
        assert stock.quantity_on_hand == 10  # restocked
        assert stock.quantity_reserved == 0

        payment = Payment.objects.get(order=order)
        assert payment.status == GatewayPaymentStatus.REFUNDED

        assert Refund.objects.filter(order=order, amount=order.grand_total).count() == 1

    def test_refund_unpaid_order_rejected(self):
        user = UserFactory()
        order, _ = _place_real_order(user)

        with pytest.raises(OrderNotRefundableError):
            process_refund(order, actor=None)

    def test_double_refund_rejected(self):
        user = UserFactory()
        order, _ = _paid_order(user)

        process_refund(order, actor=None)
        with pytest.raises(AlreadyRefundedError):
            process_refund(order, actor=None)

    def test_invalid_amount_rejected(self):
        user = UserFactory()
        order, _ = _paid_order(user)

        with pytest.raises(RefundError):
            process_refund(order, actor=None, amount=Decimal("0.00"))
        with pytest.raises(RefundError):
            process_refund(order, actor=None, amount=order.grand_total + Decimal("1.00"))

    def test_partial_refund_rejected(self):
        """Partial refunds are not supported in this version: a partial amount
        would leave the order marked REFUNDED while only part of the money is
        returned. See the additional audit (partial-refund semantics need a
        sum-of-refunds model)."""
        user = UserFactory()
        order, _ = _paid_order(user)

        with pytest.raises(RefundError):
            process_refund(order, actor=None, amount=Decimal("20.00"), reason="partial")

        # Order untouched after the rejected partial refund.
        order.refresh_from_db()
        assert order.status == OrderStatus.PAID
        assert not Refund.objects.filter(order=order).exists()

    def test_restock_is_idempotent(self):
        """A second REFUNDED transition (e.g. retried delivery) must not
        double-restock inventory."""
        user = UserFactory()
        order, stock = _paid_order(user)

        process_refund(order, actor=None)
        stock.refresh_from_db()
        assert stock.quantity_on_hand == 10


@pytest.mark.django_db
class TestRefundEndpoint:
    def test_staff_can_refund_order(self):
        staff = StaffUserFactory()
        user = UserFactory()
        order, _ = _paid_order(user)
        client = APIClient()
        client.force_authenticate(user=staff)

        response = client.post(
            reverse("orders:order-refund", args=[order.order_number]),
            {"reason": "defective item"},
            format="json",
        )

        assert response.status_code == 201
        assert response.data["order_number"] == order.order_number
        assert response.data["reason"] == "defective item"
        order.refresh_from_db()
        assert order.status == OrderStatus.REFUNDED

    def test_non_staff_cannot_refund(self):
        user = UserFactory()
        order, _ = _paid_order(user)
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.post(reverse("orders:order-refund", args=[order.order_number]), format="json")

        assert response.status_code == 403
        order.refresh_from_db()
        assert order.status == OrderStatus.PAID

    def test_refund_unknown_order_returns_404(self):
        staff = StaffUserFactory()
        client = APIClient()
        client.force_authenticate(user=staff)

        response = client.post(reverse("orders:order-refund", args=["ORD-NOPE"]), format="json")
        assert response.status_code == 404

    def test_refund_unpaid_order_returns_400(self):
        staff = StaffUserFactory()
        user = UserFactory()
        order, _ = _place_real_order(user)
        client = APIClient()
        client.force_authenticate(user=staff)

        response = client.post(reverse("orders:order-refund", args=[order.order_number]), format="json")
        assert response.status_code == 400
        assert response.data["error"]["code"] == "ORDER_NOT_REFUNDABLE"

    def test_partial_refund_via_endpoint_returns_400(self):
        """Partial refunds are a product decision deferred to a sum-of-refunds
        model — the endpoint must reject them without touching the order."""
        staff = StaffUserFactory()
        user = UserFactory()
        order, _ = _paid_order(user)
        client = APIClient()
        client.force_authenticate(user=staff)

        response = client.post(
            reverse("orders:order-refund", args=[order.order_number]),
            {"amount": "20.00", "reason": "partial"},
            format="json",
        )
        assert response.status_code == 400
        assert response.data["error"]["code"] == "REFUND_ERROR"

        order.refresh_from_db()
        assert order.status == OrderStatus.PAID
        assert not Refund.objects.filter(order=order).exists()
