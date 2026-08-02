"""Tests for dashboard and analytics views."""
from __future__ import annotations

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.tests.factories import StaffUserFactory, UserFactory
from apps.inventory.tests.factories import StockItemFactory


@pytest.fixture
def staff_client():
    staff = StaffUserFactory()
    client = APIClient()
    client.force_authenticate(user=staff)
    return client


@pytest.fixture
def plain_client():
    user = UserFactory()
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def anon_client():
    return APIClient()


# ── Dashboard stats ────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestDashboardStatsView:
    def test_staff_can_access_dashboard(self, staff_client):
        response = staff_client.get(reverse("dashboard:overview"))
        assert response.status_code == status.HTTP_200_OK

    def test_dashboard_returns_expected_top_level_keys(self, staff_client):
        response = staff_client.get(reverse("dashboard:overview"))
        data = response.data
        for key in (
            "period_days", "generated_at", "revenue", "orders",
            "customers", "products", "inventory", "subscribers",
            "reviews", "top_products", "top_categories",
            "recent_orders", "revenue_chart", "orders_chart",
            "low_stock_items",
        ):
            assert key in data, f"Missing key: {key}"

    def test_dashboard_accepts_days_param(self, staff_client):
        response = staff_client.get(reverse("dashboard:overview"), {"days": 7})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["period_days"] == 7

    def test_days_param_clamped_to_365(self, staff_client):
        response = staff_client.get(reverse("dashboard:overview"), {"days": 9999})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["period_days"] == 365

    def test_days_param_minimum_is_1(self, staff_client):
        response = staff_client.get(reverse("dashboard:overview"), {"days": 0})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["period_days"] == 1

    def test_non_staff_cannot_access_dashboard(self, plain_client):
        response = plain_client.get(reverse("dashboard:overview"))
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_anonymous_cannot_access_dashboard(self, anon_client):
        response = anon_client.get(reverse("dashboard:overview"))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_low_stock_count_uses_available_quantity(self, staff_client):
        # on_hand=60, reserved=50 → available=10 <= threshold=15 → low stock
        StockItemFactory(quantity_on_hand=60, quantity_reserved=50, low_stock_threshold=15)
        # on_hand=200, reserved=0 → available=200 > threshold=5 → not low stock
        StockItemFactory(quantity_on_hand=200, quantity_reserved=0, low_stock_threshold=5)
        # on_hand=0 → out of stock, counted separately
        StockItemFactory(quantity_on_hand=0, quantity_reserved=0, low_stock_threshold=5)
        response = staff_client.get(reverse("dashboard:overview"))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["low_stock_count"] == 1
        assert response.data["inventory"]["low_stock_count"] == 1
        assert response.data["inventory"]["out_of_stock_count"] == 1

    def test_low_stock_items_match_count(self, staff_client):
        low = StockItemFactory(quantity_on_hand=60, quantity_reserved=50, low_stock_threshold=15)
        StockItemFactory(quantity_on_hand=200, quantity_reserved=0, low_stock_threshold=5)
        response = staff_client.get(reverse("dashboard:overview"))
        assert response.data["low_stock_count"] == 1
        assert [item["id"] for item in response.data["low_stock_items"]] == [low.pk]


# ── Revenue analytics ──────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestAnalyticsRevenueView:
    def test_staff_can_access_revenue_analytics(self, staff_client):
        response = staff_client.get(reverse("dashboard:analytics-revenue"))
        assert response.status_code == status.HTTP_200_OK

    def test_revenue_response_has_expected_keys(self, staff_client):
        response = staff_client.get(reverse("dashboard:analytics-revenue"))
        data = response.data
        for key in (
            "period_days", "granularity", "all_time", "current_period",
            "previous_period", "revenue_growth_pct", "orders_growth_pct",
            "over_time", "payment_status_breakdown",
        ):
            assert key in data, f"Missing key: {key}"

    def test_granularity_param_accepted(self, staff_client):
        for granularity in ("day", "week", "month"):
            response = staff_client.get(
                reverse("dashboard:analytics-revenue"),
                {"granularity": granularity},
            )
            assert response.status_code == status.HTTP_200_OK
            assert response.data["granularity"] == granularity

    def test_non_staff_cannot_access_revenue_analytics(self, plain_client):
        response = plain_client.get(reverse("dashboard:analytics-revenue"))
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_anonymous_cannot_access_revenue_analytics(self, anon_client):
        response = anon_client.get(reverse("dashboard:analytics-revenue"))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ── Order analytics ────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestAnalyticsOrdersView:
    def test_staff_can_access_order_analytics(self, staff_client):
        response = staff_client.get(reverse("dashboard:analytics-orders"))
        assert response.status_code == status.HTTP_200_OK

    def test_order_analytics_has_expected_keys(self, staff_client):
        response = staff_client.get(reverse("dashboard:analytics-orders"))
        for key in ("period_days", "granularity", "over_time", "status_distribution", "cancellation_rate_pct"):
            assert key in response.data, f"Missing key: {key}"

    def test_non_staff_cannot_access_order_analytics(self, plain_client):
        response = plain_client.get(reverse("dashboard:analytics-orders"))
        assert response.status_code == status.HTTP_403_FORBIDDEN


# ── Best-sellers analytics ─────────────────────────────────────────────────────


@pytest.mark.django_db
class TestAnalyticsBestSellersView:
    def test_staff_can_access_best_sellers(self, staff_client):
        response = staff_client.get(reverse("dashboard:analytics-best-sellers"))
        assert response.status_code == status.HTTP_200_OK

    def test_best_sellers_has_expected_keys(self, staff_client):
        response = staff_client.get(reverse("dashboard:analytics-best-sellers"))
        assert "period_days" in response.data
        assert "results" in response.data

    def test_limit_param_is_respected(self, staff_client):
        response = staff_client.get(reverse("dashboard:analytics-best-sellers"), {"limit": 5})
        assert response.status_code == status.HTTP_200_OK

    def test_non_staff_cannot_access_best_sellers(self, plain_client):
        response = plain_client.get(reverse("dashboard:analytics-best-sellers"))
        assert response.status_code == status.HTTP_403_FORBIDDEN


# ── Customer analytics ─────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestAnalyticsCustomerGrowthView:
    def test_staff_can_access_customer_analytics(self, staff_client):
        response = staff_client.get(reverse("dashboard:analytics-customers"))
        assert response.status_code == status.HTTP_200_OK

    def test_customer_analytics_has_expected_keys(self, staff_client):
        response = staff_client.get(reverse("dashboard:analytics-customers"))
        for key in ("period_days", "granularity", "total_customers", "active_customers", "over_time"):
            assert key in response.data, f"Missing key: {key}"

    def test_non_staff_cannot_access_customer_analytics(self, plain_client):
        response = plain_client.get(reverse("dashboard:analytics-customers"))
        assert response.status_code == status.HTTP_403_FORBIDDEN


# ── Inventory analytics ────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestAnalyticsInventoryView:
    def test_staff_can_access_inventory_analytics(self, staff_client):
        response = staff_client.get(reverse("dashboard:analytics-inventory"))
        assert response.status_code == status.HTTP_200_OK

    def test_inventory_analytics_has_summary_and_by_warehouse(self, staff_client):
        response = staff_client.get(reverse("dashboard:analytics-inventory"))
        assert "summary" in response.data
        assert "by_warehouse" in response.data
        summary = response.data["summary"]
        for key in ("total_sku_count", "in_stock_count", "low_stock_count", "out_of_stock_count", "total_inventory_value"):
            assert key in summary, f"Missing summary key: {key}"

    def test_non_staff_cannot_access_inventory_analytics(self, plain_client):
        response = plain_client.get(reverse("dashboard:analytics-inventory"))
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_low_stock_count_uses_available_quantity(self, staff_client):
        # on_hand=60, reserved=50 → available=10 <= threshold=15 → low stock
        StockItemFactory(quantity_on_hand=60, quantity_reserved=50, low_stock_threshold=15)
        # on_hand=200, reserved=0 → available=200 > threshold=5 → not low stock
        StockItemFactory(quantity_on_hand=200, quantity_reserved=0, low_stock_threshold=5)
        response = staff_client.get(reverse("dashboard:analytics-inventory"))
        summary = response.data["summary"]
        assert summary["total_sku_count"] == 2
        assert summary["low_stock_count"] == 1
        assert summary["out_of_stock_count"] == 0
        assert summary["in_stock_count"] == 1


# ── Coupon analytics ───────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestAnalyticsCouponUsageView:
    def test_staff_can_access_coupon_analytics(self, staff_client):
        response = staff_client.get(reverse("dashboard:analytics-coupons"))
        assert response.status_code == status.HTTP_200_OK

    def test_coupon_analytics_has_expected_keys(self, staff_client):
        response = staff_client.get(reverse("dashboard:analytics-coupons"))
        for key in ("period_days", "period_coupon_orders", "period_total_discount", "top_coupons_this_period", "all_coupons"):
            assert key in response.data, f"Missing key: {key}"

    def test_non_staff_cannot_access_coupon_analytics(self, plain_client):
        response = plain_client.get(reverse("dashboard:analytics-coupons"))
        assert response.status_code == status.HTTP_403_FORBIDDEN


# ── Newsletter analytics ───────────────────────────────────────────────────────


@pytest.mark.django_db
class TestAnalyticsNewsletterView:
    def test_staff_can_access_newsletter_analytics(self, staff_client):
        response = staff_client.get(reverse("dashboard:analytics-newsletter"))
        assert response.status_code == status.HTTP_200_OK

    def test_newsletter_analytics_has_expected_keys(self, staff_client):
        response = staff_client.get(reverse("dashboard:analytics-newsletter"))
        for key in ("period_days", "granularity", "total_subscribers", "active_subscribers", "growth_over_time", "recent_campaign_stats"):
            assert key in response.data, f"Missing key: {key}"

    def test_non_staff_cannot_access_newsletter_analytics(self, plain_client):
        response = plain_client.get(reverse("dashboard:analytics-newsletter"))
        assert response.status_code == status.HTTP_403_FORBIDDEN
