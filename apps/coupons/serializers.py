from __future__ import annotations
from rest_framework import serializers
from apps.coupons.models import Coupon


class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = [
            "id", "code", "discount_type", "discount_value", "minimum_order_amount",
            "max_discount_amount", "valid_from", "valid_until", "usage_limit_total",
            "usage_limit_per_user", "times_used", "is_active",
        ]
        read_only_fields = ["id", "times_used"]


class ApplyCouponSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=50)

    def validate_code(self, value: str) -> str:
        return value.upper().strip()


class CouponPreviewSerializer(serializers.Serializer):
    """Preview what discount a coupon would apply to the current cart."""
    code = serializers.CharField(max_length=50)
