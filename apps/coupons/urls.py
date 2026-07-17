from __future__ import annotations
from django.urls import path
from apps.coupons.views import ApplyCouponView

app_name = "coupons"

urlpatterns = [
    path("apply/", ApplyCouponView.as_view(), name="coupon-apply"),
]
