from __future__ import annotations
from django.contrib import admin
from apps.coupons.models import Coupon, CouponRedemption


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = [
        "code", "discount_type", "discount_value", "is_active",
        "valid_from", "valid_until", "usage_summary",
    ]
    list_filter = ["is_active", "discount_type"]
    search_fields = ["code"]
    filter_horizontal = ["applicable_categories"]

    def usage_summary(self, obj) -> str:
        if obj.usage_limit_total:
            return f"{obj.times_used} / {obj.usage_limit_total}"
        return f"{obj.times_used} / ∞"
    usage_summary.short_description = "Used / Limit"


@admin.register(CouponRedemption)
class CouponRedemptionAdmin(admin.ModelAdmin):
    list_display = ["coupon", "user", "order", "created_at"]
    list_filter = ["coupon"]
    search_fields = ["coupon__code", "user__email"]
    readonly_fields = ["coupon", "user", "order", "created_at"]

    def has_delete_permission(self, request, obj=None) -> bool:
        return False
