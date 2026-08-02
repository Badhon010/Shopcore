"""Tests for audit C-1 / B-4: customers may only cancel UNPAID orders, and a
paid order's only termination path is REFUNDED (via the refund flow).

Regression: previously a PAID order could be cancelled by the customer, which
committed the sale (on_hand decremented) and then only "released" a
reservation that no longer existed — losing stock without a refund.
"""
from __future__ import annotations

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.tests.factories import UserFactory
from apps.orders.constants import OrderStatus, PaymentStatus
from apps.orders.exceptions import InvalidOrderTransitionError
from apps.orders.services import transition_order_status
from apps.orders.tests.factories import OrderFactory


@pytest.mark.django_db
class TestCustomerCancelRestriction:
    def test_customer_can_cancel_unpaid_order(self):
        user = UserFactory()
        order = OrderFactory(
            user=user, status=OrderStatus.PENDING_PAYMENT, payment_status=PaymentStatus.PENDING
        )
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.post(reverse("orders:order-cancel", args=[order.order_number]))

        assert response.status_code == 200
        order.refresh_from_db()
        assert order.status == OrderStatus.CANCELLED

    def test_customer_cannot_cancel_paid_order(self):
        user = UserFactory()
        order = OrderFactory(
            user=user, status=OrderStatus.PAID, payment_status=PaymentStatus.PAID
        )
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.post(reverse("orders:order-cancel", args=[order.order_number]))

        assert response.status_code == 400
        assert response.data["error"]["code"] == "ORDER_CANCELLATION_NOT_ALLOWED"
        order.refresh_from_db()
        assert order.status == OrderStatus.PAID
        assert order.payment_status == PaymentStatus.PAID

    def test_unauthenticated_cannot_cancel_registered_order(self):
        """Guests can only cancel THEIR OWN guest orders via the lookup secret.
        An anonymous request cancelling a registered user's order must get the
        same 404 as a missing order (no existence leak, audit S-5)."""
        user = UserFactory()
        order = OrderFactory(user=user, status=OrderStatus.PENDING_PAYMENT)

        response = APIClient().post(reverse("orders:order-cancel", args=[order.order_number]))

        assert response.status_code == 404
        order.refresh_from_db()
        assert order.status == OrderStatus.PENDING_PAYMENT

    def test_unauthenticated_cannot_cancel_guest_order_without_secret(self):
        """Guest cancel requires the lookup secret (phone, or email + token).
        No secret → 404, order untouched (audit H-4)."""
        from apps.orders.models import Order as OrderModel

        order = OrderModel.objects.create(
            order_number="ORD-GUEST-CANCEL-1",
            user=None,
            status=OrderStatus.PENDING_PAYMENT,
            payment_status=PaymentStatus.PENDING,
            guest_name="Guest",
            guest_email="guest@example.com",
            guest_phone="+8801711111111",
            guest_session_id="g-session",
            subtotal=1,
            grand_total=1,
        )

        response = APIClient().post(reverse("orders:order-cancel", args=[order.order_number]))

        assert response.status_code == 404
        order.refresh_from_db()
        assert order.status == OrderStatus.PENDING_PAYMENT


@pytest.mark.django_db
class TestPaidOrderTransitionMap:
    def test_paid_order_cannot_transition_to_cancelled(self):
        order = OrderFactory(status=OrderStatus.PAID, payment_status=PaymentStatus.PAID)
        with pytest.raises(InvalidOrderTransitionError):
            transition_order_status(order, OrderStatus.CANCELLED)

    def test_processing_order_cannot_transition_to_cancelled(self):
        order = OrderFactory(status=OrderStatus.PROCESSING, payment_status=PaymentStatus.PAID)
        with pytest.raises(InvalidOrderTransitionError):
            transition_order_status(order, OrderStatus.CANCELLED)

    def test_paid_order_can_transition_to_refunded(self):
        order = OrderFactory(status=OrderStatus.PAID, payment_status=PaymentStatus.PAID)
        order = transition_order_status(order, OrderStatus.REFUNDED)
        order.refresh_from_db()
        assert order.status == OrderStatus.REFUNDED
        assert order.payment_status == PaymentStatus.REFUNDED

    def test_unpaid_order_can_still_be_cancelled(self):
        order = OrderFactory(status=OrderStatus.PENDING_PAYMENT, payment_status=PaymentStatus.PENDING)
        transition_order_status(order, OrderStatus.CANCELLED)
        order.refresh_from_db()
        assert order.status == OrderStatus.CANCELLED
