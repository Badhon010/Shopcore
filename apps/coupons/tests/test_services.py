"""Tests for the coupon services."""
from __future__ import annotations

from decimal import Decimal
from datetime import timedelta
import pytest
from django.db import transaction
from django.utils import timezone

from apps.accounts.tests.factories import UserFactory
from apps.catalog.tests.factories import ProductVariantFactory
from apps.coupons.exceptions import (
    CouponExpiredError,
    CouponLimitReachedError,
    CouponMinimumOrderError,
    CouponNotFoundError,
)
from apps.coupons.services import (
    record_coupon_redemption,
    validate_and_apply_coupon,
    validate_and_lock_coupon,
)
from apps.coupons.tests.factories import CouponFactory


@pytest.fixture
def user():
    return UserFactory()


@pytest.fixture
def cart_items():
    variant = ProductVariantFactory()
    # Mock CartItem with minimal interface
    class MockItem:
        def __init__(self, v):
            self.variant = v
    return [MockItem(variant)]


@pytest.mark.django_db
class TestValidateAndApplyCoupon:
    def test_percentage_coupon(self, user, cart_items):
        coupon = CouponFactory(discount_type="PERCENTAGE", discount_value=Decimal("10"))
        discount, applied = validate_and_apply_coupon(
            subtotal=Decimal("100.00"),
            cart_items=cart_items,
            code=coupon.code,
            user=user,
        )
        assert discount == Decimal("10.00")
        assert applied.code == coupon.code

    def test_fixed_amount_coupon(self, user, cart_items):
        from apps.coupons.constants import DiscountType
        coupon = CouponFactory(discount_type=DiscountType.FIXED_AMOUNT, discount_value=Decimal("15"))
        discount, _ = validate_and_apply_coupon(
            subtotal=Decimal("100.00"),
            cart_items=cart_items,
            code=coupon.code,
            user=user,
        )
        assert discount == Decimal("15.00")

    def test_expired_coupon(self, user, cart_items):
        coupon = CouponFactory(
            valid_from=timezone.now() - timedelta(days=10),
            valid_until=timezone.now() - timedelta(days=1),
        )
        with pytest.raises(CouponExpiredError):
            validate_and_apply_coupon(Decimal("100"), cart_items, coupon.code, user)

    def test_usage_limit_reached(self, user, cart_items):
        coupon = CouponFactory(usage_limit_total=5, times_used=5)
        with pytest.raises(CouponLimitReachedError):
            validate_and_apply_coupon(Decimal("100"), cart_items, coupon.code, user)

    def test_minimum_order_not_met(self, user, cart_items):
        coupon = CouponFactory(minimum_order_amount=Decimal("200"))
        with pytest.raises(CouponMinimumOrderError):
            validate_and_apply_coupon(Decimal("100"), cart_items, coupon.code, user)

    def test_unknown_code(self, user, cart_items):
        with pytest.raises(CouponNotFoundError):
            validate_and_apply_coupon(Decimal("100"), cart_items, "NOTEXIST", user)

    def test_discount_capped_at_subtotal(self, user, cart_items):
        from apps.coupons.constants import DiscountType
        coupon = CouponFactory(discount_type=DiscountType.FIXED_AMOUNT, discount_value=Decimal("200"))
        discount, _ = validate_and_apply_coupon(
            subtotal=Decimal("50.00"),
            cart_items=cart_items,
            code=coupon.code,
            user=user,
        )
        assert discount == Decimal("50.00")


@pytest.mark.django_db
class TestValidateAndLockCoupon:
    """Fix #3: checkout must use the locked path, and redemption recording
    must be race-free against concurrent checkouts sharing a coupon."""

    def test_locked_validation_returns_same_discount_as_preview(self, user, cart_items):
        coupon = CouponFactory(discount_type="PERCENTAGE", discount_value=Decimal("10"))
        with transaction.atomic():
            discount, applied = validate_and_lock_coupon(
                subtotal=Decimal("100.00"),
                cart_items=cart_items,
                code=coupon.code,
                user=user,
            )
        assert discount == Decimal("10.00")
        assert applied.code == coupon.code

    def test_locked_validation_raises_when_limit_already_reached(self, user, cart_items):
        coupon = CouponFactory(usage_limit_total=2, times_used=2)
        with pytest.raises(CouponLimitReachedError):
            with transaction.atomic():
                validate_and_lock_coupon(Decimal("100"), cart_items, coupon.code, user)

    def test_record_redemption_increments_times_used_and_creates_row(self, user, cart_items):
        from apps.coupons.models import CouponRedemption
        from apps.orders.tests.factories import OrderFactory

        coupon = CouponFactory(usage_limit_total=5, times_used=0)
        order = OrderFactory(user=user)

        with transaction.atomic():
            _, locked_coupon = validate_and_lock_coupon(
                Decimal("100"), cart_items, coupon.code, user
            )
            record_coupon_redemption(locked_coupon, user, order)

        coupon.refresh_from_db()
        assert coupon.times_used == 1
        assert CouponRedemption.objects.filter(coupon=coupon, user=user, order=order).exists()

    def test_sequential_redemptions_respect_total_usage_limit(self, cart_items):
        """Two 'checkouts' sharing a coupon with usage_limit_total=1: the
        second must be rejected by the locked validation, not allowed to
        also redeem and push times_used past the limit."""
        from apps.orders.tests.factories import OrderFactory

        coupon = CouponFactory(usage_limit_total=1, times_used=0)
        user1, user2 = UserFactory(), UserFactory()

        with transaction.atomic():
            _, locked = validate_and_lock_coupon(Decimal("100"), cart_items, coupon.code, user1)
            record_coupon_redemption(locked, user1, OrderFactory(user=user1))

        with pytest.raises(CouponLimitReachedError):
            with transaction.atomic():
                validate_and_lock_coupon(Decimal("100"), cart_items, coupon.code, user2)

        coupon.refresh_from_db()
        assert coupon.times_used == 1
