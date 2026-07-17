"""Test factories for the payments app."""
from __future__ import annotations

from decimal import Decimal

import factory
from factory.django import DjangoModelFactory

from apps.orders.tests.factories import OrderFactory
from apps.payments.constants import PaymentProvider, PaymentStatus
from apps.payments.models import Payment


class PaymentFactory(DjangoModelFactory):
    order = factory.SubFactory(OrderFactory)
    amount = Decimal("104.00")
    currency = "USD"
    provider = PaymentProvider.MANUAL
    status = PaymentStatus.SUCCEEDED
    raw_response = factory.Dict({})

    class Meta:
        model = Payment
