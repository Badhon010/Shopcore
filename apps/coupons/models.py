from __future__ import annotations
from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db import models
from apps.common.models import TimeStampedModel
from apps.coupons.constants import DiscountType


class Coupon(models.Model):
    """A discount coupon with flexible constraints."""

    code = models.CharField(max_length=50, unique=True)
    discount_type = models.CharField(max_length=20, choices=DiscountType.choices)
    discount_value = models.DecimalField(max_digits=10, decimal_places=2)
    minimum_order_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    max_discount_amount = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Caps the discount for percentage coupons."
    )
    valid_from = models.DateTimeField()
    valid_until = models.DateTimeField()
    usage_limit_total = models.PositiveIntegerField(null=True, blank=True)
    usage_limit_per_user = models.PositiveIntegerField(null=True, blank=True)
    times_used = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    applicable_categories = models.ManyToManyField(
        "catalog.Category",
        blank=True,
        help_text="Leave blank to apply to all categories.",
    )

    class Meta:
        ordering = ["-valid_from"]

    def __str__(self) -> str:
        return f"{self.code} ({self.discount_type}: {self.discount_value})"

    def save(self, *args, **kwargs) -> None:
        self.code = self.code.upper()
        super().save(*args, **kwargs)

    def clean(self) -> None:
        if self.discount_type == DiscountType.PERCENTAGE:
            if not (0 < self.discount_value <= 100):
                raise ValidationError({"discount_value": "Percentage must be between 0 and 100."})
        elif self.discount_type == DiscountType.FIXED_AMOUNT:
            if self.discount_value <= 0:
                raise ValidationError({"discount_value": "Fixed amount must be greater than 0."})


class CouponRedemption(TimeStampedModel):
    """Tracks individual coupon redemptions for per-user limit enforcement."""

    coupon = models.ForeignKey(Coupon, on_delete=models.CASCADE, related_name="redemptions")
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE)
    order = models.ForeignKey(
        "orders.Order", on_delete=models.SET_NULL, null=True, blank=True
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.coupon.code} redeemed by {self.user.email}"
