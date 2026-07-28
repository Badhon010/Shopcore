"""URL configuration for the dashboard app."""
from __future__ import annotations

from django.urls import path

from apps.dashboard.views import (
    AnalyticsBestSellersView,
    AnalyticsCouponUsageView,
    AnalyticsCustomerGrowthView,
    AnalyticsInventoryView,
    AnalyticsNewsletterView,
    AnalyticsOrdersView,
    AnalyticsRevenueView,
    DashboardStatsView,
)

app_name = "dashboard"

urlpatterns = [
    # Dashboard overview
    path("", DashboardStatsView.as_view(), name="overview"),
    # Analytics sub-routes (exposed as /api/v1/dashboard/analytics/*)
    path("analytics/revenue/", AnalyticsRevenueView.as_view(), name="analytics-revenue"),
    path("analytics/orders/", AnalyticsOrdersView.as_view(), name="analytics-orders"),
    path("analytics/best-sellers/", AnalyticsBestSellersView.as_view(), name="analytics-best-sellers"),
    path("analytics/customers/", AnalyticsCustomerGrowthView.as_view(), name="analytics-customers"),
    path("analytics/inventory/", AnalyticsInventoryView.as_view(), name="analytics-inventory"),
    path("analytics/coupons/", AnalyticsCouponUsageView.as_view(), name="analytics-coupons"),
    path("analytics/newsletter/", AnalyticsNewsletterView.as_view(), name="analytics-newsletter"),
]
