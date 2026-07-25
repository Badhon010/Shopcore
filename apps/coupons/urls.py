from __future__ import annotations

from django.urls import path

from apps.coupons.views import (
    AdminCouponDetailView,
    AdminCouponListCreateView,
    ApplyCouponView,
)

app_name = "coupons"

urlpatterns = [
    path("apply/", ApplyCouponView.as_view(), name="coupon-apply"),
    path("", AdminCouponListCreateView.as_view(), name="coupon-list-create"),
    path("<int:pk>/", AdminCouponDetailView.as_view(), name="coupon-detail"),
]
