"""Business logic for coupon validation and application.

validate_and_apply_coupon() is the single source of truth for coupon logic.
It is called both from the 'preview discount in cart' endpoint and from
place_order(), so the discount amount can never diverge between preview and checkout.
"""
from __future__ import annotations

import logging
from decimal import Decimal

from django.db.models import F
from django.utils import timezone

from apps.common.utils import round_money
from apps.coupons.constants import DiscountType
from apps.coupons.exceptions import (
    CouponExpiredError,
    CouponInvalidError,
    CouponLimitReachedError,
    CouponMinimumOrderError,
    CouponNotFoundError,
)

logger = logging.getLogger("shopcore.coupons.services")


def validate_and_apply_coupon(
    subtotal: Decimal,
    cart_items: list,
    code: str,
    user,
) -> tuple[Decimal, "Coupon"]:
    """Validate a coupon and compute the discount amount.

    This function is intentionally pure (no side effects) — it only reads
    and computes. The caller (place_order) increments times_used and creates
    the CouponRedemption record.

    Args:
        subtotal: The cart/order subtotal before discounts.
        cart_items: List of CartItem instances (for category applicability check).
        code: The coupon code string.
        user: The authenticated User applying the coupon.

    Returns:
        Tuple of (discount_amount, Coupon instance).

    Raises:
        CouponNotFoundError: If the code doesn't exist or is inactive.
        CouponExpiredError: If the coupon is outside its valid date range.
        CouponLimitReachedError: If usage limits are exceeded.
        CouponMinimumOrderError: If subtotal is below the minimum.
    """
    from apps.coupons.models import Coupon

    try:
        coupon = Coupon.objects.get(code=code.upper(), is_active=True)
    except Coupon.DoesNotExist:
        raise CouponNotFoundError(
            message=f"Coupon '{code}' not found or inactive.",
            details={"code": code},
        )

    return _check_constraints_and_compute_discount(coupon, subtotal, cart_items, code, user)


def validate_and_lock_coupon(
    subtotal: Decimal,
    cart_items: list,
    code: str,
    user,
) -> tuple[Decimal, "Coupon"]:
    """Validate a coupon for checkout, holding a row lock for the duration
    of the caller's transaction.

    MUST be called from inside an existing ``transaction.atomic()`` block
    (place_order() provides one). Locking the coupon row here — and keeping
    it locked until ``record_coupon_redemption()`` runs later in the same
    transaction — is what prevents concurrent checkouts from both reading a
    stale ``times_used``/redemption count and jointly exceeding the coupon's
    usage limits (total or per-user).

    Args:
        subtotal: The cart/order subtotal before discounts.
        cart_items: List of CartItem instances (for category applicability check).
        code: The coupon code string.
        user: The authenticated User applying the coupon.

    Returns:
        Tuple of (discount_amount, Coupon instance), with the Coupon row locked.

    Raises:
        CouponNotFoundError, CouponExpiredError, CouponLimitReachedError,
        CouponMinimumOrderError, CouponInvalidError: same as validate_and_apply_coupon().
    """
    from apps.coupons.models import Coupon

    try:
        coupon = Coupon.objects.select_for_update().get(code=code.upper(), is_active=True)
    except Coupon.DoesNotExist:
        raise CouponNotFoundError(
            message=f"Coupon '{code}' not found or inactive.",
            details={"code": code},
        )

    return _check_constraints_and_compute_discount(coupon, subtotal, cart_items, code, user)


def record_coupon_redemption(coupon: "Coupon", user, order) -> None:
    """Persist a coupon redemption and increment usage count atomically.

    MUST be called within the same transaction (and while holding the same
    row lock) established by ``validate_and_lock_coupon()`` — otherwise the
    ``F()`` increment below is safe on its own, but the limit checks earlier
    could still race against it.
    """
    from apps.coupons.models import Coupon, CouponRedemption

    Coupon.objects.filter(pk=coupon.pk).update(times_used=F("times_used") + 1)
    CouponRedemption.objects.create(coupon=coupon, user=user, order=order)


def _check_constraints_and_compute_discount(
    coupon: "Coupon",
    subtotal: Decimal,
    cart_items: list,
    code: str,
    user,
) -> tuple[Decimal, "Coupon"]:
    """Shared validation + discount computation used by both the read-only
    preview path and the locked checkout path."""
    from apps.coupons.models import CouponRedemption

    now = timezone.now()
    if not (coupon.valid_from <= now <= coupon.valid_until):
        raise CouponExpiredError(
            message=f"Coupon '{code}' is not valid at this time.",
            details={"valid_from": str(coupon.valid_from), "valid_until": str(coupon.valid_until)},
        )

    if coupon.usage_limit_total is not None and coupon.times_used >= coupon.usage_limit_total:
        raise CouponLimitReachedError(
            message=f"Coupon '{code}' has reached its total usage limit.",
            details={"usage_limit_total": coupon.usage_limit_total, "times_used": coupon.times_used},
        )

    if coupon.usage_limit_per_user is not None:
        user_uses = CouponRedemption.objects.filter(coupon=coupon, user=user).count()
        if user_uses >= coupon.usage_limit_per_user:
            raise CouponLimitReachedError(
                message=f"You have already used coupon '{code}' the maximum number of times.",
                details={"usage_limit_per_user": coupon.usage_limit_per_user, "your_uses": user_uses},
            )

    if coupon.minimum_order_amount is not None and subtotal < coupon.minimum_order_amount:
        raise CouponMinimumOrderError(
            message=(
                f"Coupon '{code}' requires a minimum order of {coupon.minimum_order_amount}. "
                f"Your subtotal is {subtotal}."
            ),
            details={
                "minimum_order_amount": str(coupon.minimum_order_amount),
                "subtotal": str(subtotal),
            },
        )

    # Check category applicability
    applicable_cats = coupon.applicable_categories.all()
    if applicable_cats.exists():
        cart_category_ids = set()
        for item in cart_items:
            cart_category_ids.add(item.variant.product.category_id)
        applicable_cat_ids = set(applicable_cats.values_list("id", flat=True))
        if not cart_category_ids.intersection(applicable_cat_ids):
            raise CouponInvalidError(
                message=f"Coupon '{code}' does not apply to any items in your cart.",
                details={"applicable_categories": list(applicable_cat_ids)},
            )

    # Compute discount
    if coupon.discount_type == DiscountType.PERCENTAGE:
        raw_discount = subtotal * (coupon.discount_value / Decimal("100"))
        if coupon.max_discount_amount is not None:
            raw_discount = min(raw_discount, coupon.max_discount_amount)
    else:  # FIXED_AMOUNT
        raw_discount = coupon.discount_value

    discount_amount = round_money(min(raw_discount, subtotal))
    logger.info("Coupon '%s' applied: discount=%s for user %s", code, discount_amount, user.email)
    return discount_amount, coupon
