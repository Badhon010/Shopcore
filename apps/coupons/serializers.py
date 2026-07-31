from __future__ import annotations

from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from apps.coupons.models import Coupon


class FlexibleDateTimeField(serializers.DateTimeField):
    """DateTimeField that also accepts date-only input (YYYY-MM-DD).

    The admin form uses <input type="date"> which submits a date without a
    time component; DRF's default DateTimeField rejects that. This field
    normalises bare dates to midnight UTC before parsing.
    """

    def to_internal_value(self, value):
        # Treat empty strings as null so the serializer can fall back to its
        # defaults / existing instance values (allow_blank is CharField-only).
        if isinstance(value, str) and value.strip() == "":
            return None
        # Date-only input is normalised to UTC midnight. Users picking a local
        # calendar date get a validity window offset by their timezone — an
        # accepted trade-off for the admin date picker (documented, not a bug).
        if isinstance(value, str) and len(value) == 10 and value.count("-") == 2:
            value = f"{value}T00:00:00Z"
        return super().to_internal_value(value)


class CouponSerializer(serializers.ModelSerializer):
    """Serializer for coupons. valid_from/valid_until default to now→+30 days."""

    valid_from = FlexibleDateTimeField(required=False, allow_null=True)
    valid_until = FlexibleDateTimeField(required=False, allow_null=True)

    class Meta:
        model = Coupon
        fields = [
            "id", "code", "discount_type", "discount_value", "minimum_order_amount",
            "max_discount_amount", "valid_from", "valid_until", "usage_limit_total",
            "usage_limit_per_user", "times_used", "is_active",
        ]
        read_only_fields = ["id", "times_used"]

    def validate(self, attrs: dict) -> dict:
        now = timezone.now()
        # On partial updates preserve the existing validity window instead of
        # silently resetting it to now → now+30d.
        valid_from = attrs.get("valid_from") or getattr(self.instance, "valid_from", None) or now
        valid_until = attrs.get("valid_until") or getattr(self.instance, "valid_until", None) or (
            now + timedelta(days=30)
        )
        if valid_from >= valid_until:
            raise serializers.ValidationError(
                {"valid_until": "Valid-until must be after valid-from."}
            )
        attrs["valid_from"] = valid_from
        attrs["valid_until"] = valid_until
        return attrs


class ApplyCouponSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=50)

    def validate_code(self, value: str) -> str:
        return value.upper().strip()


class CouponPreviewSerializer(serializers.Serializer):
    """Preview what discount a coupon would apply to the current cart."""
    code = serializers.CharField(max_length=50)
