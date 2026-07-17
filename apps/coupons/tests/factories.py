"""Test factories for the coupons app."""
from __future__ import annotations

from decimal import Decimal
from datetime import timedelta
import factory
from django.utils import timezone
from factory.django import DjangoModelFactory

from apps.coupons.constants import DiscountType
from apps.coupons.models import Coupon


class CouponFactory(DjangoModelFactory):
    code = factory.Sequence(lambda n: f"COUPON{n:03d}")
    discount_type = DiscountType.PERCENTAGE
    discount_value = Decimal("10")
    valid_from = factory.LazyFunction(timezone.now)
    valid_until = factory.LazyFunction(lambda: timezone.now() + timedelta(days=30))
    is_active = True
    times_used = 0

    class Meta:
        model = Coupon
