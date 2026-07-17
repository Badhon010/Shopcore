"""Tests for ManualGateway — atomic payment+transition (Fix #4)."""
from __future__ import annotations

from decimal import Decimal

import pytest

from apps.orders.constants import OrderStatus
from apps.orders.exceptions import InvalidOrderTransitionError
from apps.orders.tests.factories import OrderFactory
from apps.payments.constants import PaymentStatus
from apps.payments.gateways.manual import ManualGateway
from apps.payments.models import Payment


@pytest.mark.django_db
class TestManualGatewayAtomicity:
    def test_successful_initiate_creates_payment_and_transitions_order(self):
        order = OrderFactory(status=OrderStatus.PENDING_PAYMENT)
        intent = ManualGateway().initiate(order=order, amount=order.grand_total, currency="USD")

        order.refresh_from_db()
        assert order.status == OrderStatus.PAID
        payment = Payment.objects.get(pk=intent.payment_id)
        assert payment.status == PaymentStatus.SUCCEEDED
        assert payment.order_id == order.pk

    def test_failed_transition_rolls_back_payment_row(self):
        """An order in a terminal state (CANCELLED) cannot transition to PAID.
        The Payment created inside the same atomic() block must roll back
        too — no orphaned SUCCEEDED payment left on a cancelled order."""
        order = OrderFactory(status=OrderStatus.CANCELLED)

        with pytest.raises(InvalidOrderTransitionError):
            ManualGateway().initiate(order=order, amount=Decimal("50.00"), currency="USD")

        order.refresh_from_db()
        assert order.status == OrderStatus.CANCELLED
        assert not Payment.objects.filter(order=order).exists()
