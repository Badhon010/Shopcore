"""Tests for the payments services — duplicate-payment guard (Fix #5)."""
from __future__ import annotations

import pytest

from apps.orders.constants import OrderStatus
from apps.orders.constants import PaymentStatus as OrderPaymentStatus
from apps.orders.tests.factories import OrderFactory
from apps.payments.constants import PaymentStatus as GatewayPaymentStatus
from apps.payments.exceptions import DuplicatePaymentError
from apps.payments.models import Payment
from apps.payments.services import initiate_payment
from apps.payments.tests.factories import PaymentFactory


@pytest.mark.django_db
class TestInitiatePaymentDuplicateGuard:
    def test_second_initiate_call_raises_duplicate_payment_error(self):
        order = OrderFactory(status=OrderStatus.PENDING_PAYMENT, payment_status=OrderPaymentStatus.PENDING)

        initiate_payment(order, provider="MANUAL")
        order.refresh_from_db()
        assert order.payment_status == OrderPaymentStatus.PAID
        assert Payment.objects.filter(order=order, status=GatewayPaymentStatus.SUCCEEDED).count() == 1

        with pytest.raises(DuplicatePaymentError):
            initiate_payment(order, provider="MANUAL")

        # No second payment row was created by the rejected retry.
        assert Payment.objects.filter(order=order, status=GatewayPaymentStatus.SUCCEEDED).count() == 1

    def test_raises_when_order_already_marked_paid_even_without_payment_row(self):
        """Guards the case where payment_status is PAID but, for whatever
        reason, no SUCCEEDED Payment row exists yet — must still block."""
        order = OrderFactory(status=OrderStatus.PAID, payment_status=OrderPaymentStatus.PAID)
        with pytest.raises(DuplicatePaymentError):
            initiate_payment(order, provider="MANUAL")

    def test_raises_when_existing_succeeded_payment_row_present(self):
        order = OrderFactory(status=OrderStatus.PAID, payment_status=OrderPaymentStatus.PENDING)
        PaymentFactory(order=order, status=GatewayPaymentStatus.SUCCEEDED)
        with pytest.raises(DuplicatePaymentError):
            initiate_payment(order, provider="MANUAL")

    def test_db_constraint_backstops_duplicate_succeeded_payments(self):
        """Even bypassing the application-layer check entirely, the DB
        constraint must reject a second SUCCEEDED payment for the same order."""
        from django.db import IntegrityError

        order = OrderFactory()
        PaymentFactory(order=order, status=GatewayPaymentStatus.SUCCEEDED)
        with pytest.raises(IntegrityError):
            PaymentFactory(order=order, status=GatewayPaymentStatus.SUCCEEDED)
