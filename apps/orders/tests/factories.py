"""Test factories for the orders app."""
from __future__ import annotations

from decimal import Decimal
from django.utils import timezone
import factory
from factory.django import DjangoModelFactory

from apps.accounts.tests.factories import AddressFactory, UserFactory
from apps.catalog.tests.factories import ProductVariantFactory
from apps.orders.constants import OrderStatus, PaymentStatus
from apps.orders.models import Order, OrderItem


class OrderFactory(DjangoModelFactory):
    order_number = factory.Sequence(lambda n: f"ORD-20260711-{n:06d}")
    user = factory.SubFactory(UserFactory)
    status = OrderStatus.PENDING_PAYMENT
    payment_status = PaymentStatus.PENDING
    shipping_address_snapshot = factory.LazyAttribute(
        lambda o: {
            "full_name": "Test User",
            "phone_number": "+15551234567",
            "address_line_1": "123 Main St",
            "city": "Test City",
            "state_province": "CA",
            "postal_code": "12345",
            "country": "US",
        }
    )
    billing_address_snapshot = factory.LazyAttribute(lambda o: o.shipping_address_snapshot)
    subtotal = Decimal("99.00")
    discount_total = Decimal("0.00")
    shipping_cost = Decimal("5.00")
    tax_total = Decimal("0.00")
    grand_total = Decimal("104.00")
    placed_at = factory.LazyFunction(timezone.now)

    class Meta:
        model = Order


class OrderItemFactory(DjangoModelFactory):
    order = factory.SubFactory(OrderFactory)
    variant = factory.SubFactory(ProductVariantFactory)
    product_name_snapshot = factory.Sequence(lambda n: f"Product {n}")
    variant_attributes_snapshot = factory.Dict({})
    unit_price_snapshot = Decimal("99.00")
    quantity = 1
    line_total = Decimal("99.00")

    class Meta:
        model = OrderItem
