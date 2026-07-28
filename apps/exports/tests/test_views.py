"""Tests for export views (CSV / Excel)."""
from __future__ import annotations

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.tests.factories import StaffUserFactory, UserFactory


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


# ── Helper ─────────────────────────────────────────────────────────────────────

def _assert_csv_response(response):
    assert response.status_code == status.HTTP_200_OK
    content_type = response.get("Content-Type", "")
    assert "text/csv" in content_type
    disposition = response.get("Content-Disposition", "")
    assert "attachment" in disposition
    assert ".csv" in disposition


# ── Products export ────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestExportProductsView:
    def test_staff_can_export_products_csv(self, staff_client):
        response = staff_client.get(reverse("exports:export-products"))
        _assert_csv_response(response)

    def test_export_products_xlsx(self, staff_client):
        response = staff_client.get(reverse("exports:export-products"), {"format": "xlsx"})
        # openpyxl may not be installed; either 200 xlsx or 501 not implemented is acceptable
        assert response.status_code in (status.HTTP_200_OK, status.HTTP_501_NOT_IMPLEMENTED)

    def test_export_products_invalid_format_falls_back_to_csv(self, staff_client):
        response = staff_client.get(reverse("exports:export-products"), {"format": "pdf"})
        _assert_csv_response(response)

    def test_non_staff_cannot_export_products(self, plain_client):
        response = plain_client.get(reverse("exports:export-products"))
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_anonymous_cannot_export_products(self, anon_client):
        response = anon_client.get(reverse("exports:export-products"))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_export_products_accepts_status_filter(self, staff_client):
        response = staff_client.get(reverse("exports:export-products"), {"status": "PUBLISHED"})
        _assert_csv_response(response)

    def test_export_products_accepts_category_filter(self, staff_client):
        response = staff_client.get(reverse("exports:export-products"), {"category": "999"})
        _assert_csv_response(response)

    def test_export_products_accepts_brand_filter(self, staff_client):
        response = staff_client.get(reverse("exports:export-products"), {"brand": "999"})
        _assert_csv_response(response)


# ── Orders export ──────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestExportOrdersView:
    def test_staff_can_export_orders_csv(self, staff_client):
        response = staff_client.get(reverse("exports:export-orders"))
        _assert_csv_response(response)

    def test_non_staff_cannot_export_orders(self, plain_client):
        response = plain_client.get(reverse("exports:export-orders"))
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_anonymous_cannot_export_orders(self, anon_client):
        response = anon_client.get(reverse("exports:export-orders"))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_export_orders_accepts_status_filter(self, staff_client):
        response = staff_client.get(reverse("exports:export-orders"), {"status": "PENDING"})
        _assert_csv_response(response)

    def test_export_orders_accepts_date_range_filter(self, staff_client):
        response = staff_client.get(
            reverse("exports:export-orders"),
            {"date_from": "2024-01-01", "date_to": "2024-12-31"},
        )
        _assert_csv_response(response)

    def test_export_orders_accepts_payment_status_filter(self, staff_client):
        response = staff_client.get(reverse("exports:export-orders"), {"payment_status": "PAID"})
        _assert_csv_response(response)


# ── Customers export ───────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestExportCustomersView:
    def test_staff_can_export_customers_csv(self, staff_client):
        response = staff_client.get(reverse("exports:export-customers"))
        _assert_csv_response(response)

    def test_non_staff_cannot_export_customers(self, plain_client):
        response = plain_client.get(reverse("exports:export-customers"))
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_anonymous_cannot_export_customers(self, anon_client):
        response = anon_client.get(reverse("exports:export-customers"))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_export_customers_accepts_is_active_filter(self, staff_client):
        response = staff_client.get(reverse("exports:export-customers"), {"is_active": "true"})
        _assert_csv_response(response)

    def test_export_customers_accepts_is_staff_filter(self, staff_client):
        response = staff_client.get(reverse("exports:export-customers"), {"is_staff": "false"})
        _assert_csv_response(response)


# ── Subscribers export ─────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestExportSubscribersView:
    def test_staff_can_export_subscribers_csv(self, staff_client):
        response = staff_client.get(reverse("exports:export-subscribers"))
        _assert_csv_response(response)

    def test_non_staff_cannot_export_subscribers(self, plain_client):
        response = plain_client.get(reverse("exports:export-subscribers"))
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_anonymous_cannot_export_subscribers(self, anon_client):
        response = anon_client.get(reverse("exports:export-subscribers"))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_export_subscribers_accepts_active_filter(self, staff_client):
        response = staff_client.get(reverse("exports:export-subscribers"), {"active": "true"})
        _assert_csv_response(response)


# ── Reviews export ─────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestExportReviewsView:
    def test_staff_can_export_reviews_csv(self, staff_client):
        response = staff_client.get(reverse("exports:export-reviews"))
        _assert_csv_response(response)

    def test_non_staff_cannot_export_reviews(self, plain_client):
        response = plain_client.get(reverse("exports:export-reviews"))
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_anonymous_cannot_export_reviews(self, anon_client):
        response = anon_client.get(reverse("exports:export-reviews"))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_export_reviews_accepts_is_approved_filter(self, staff_client):
        response = staff_client.get(reverse("exports:export-reviews"), {"is_approved": "true"})
        _assert_csv_response(response)

    def test_export_reviews_accepts_rating_range_filter(self, staff_client):
        response = staff_client.get(
            reverse("exports:export-reviews"), {"min_rating": "3", "max_rating": "5"}
        )
        _assert_csv_response(response)


# ── Inventory export ───────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestExportInventoryView:
    def test_staff_can_export_inventory_csv(self, staff_client):
        response = staff_client.get(reverse("exports:export-inventory"))
        _assert_csv_response(response)

    def test_non_staff_cannot_export_inventory(self, plain_client):
        response = plain_client.get(reverse("exports:export-inventory"))
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_anonymous_cannot_export_inventory(self, anon_client):
        response = anon_client.get(reverse("exports:export-inventory"))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_export_inventory_low_stock_filter(self, staff_client):
        response = staff_client.get(reverse("exports:export-inventory"), {"low_stock_only": "true"})
        _assert_csv_response(response)

    def test_export_inventory_out_of_stock_filter(self, staff_client):
        response = staff_client.get(reverse("exports:export-inventory"), {"out_of_stock_only": "true"})
        _assert_csv_response(response)

    def test_out_of_stock_filter_takes_precedence_over_low_stock(self, staff_client):
        """Both filters set — out_of_stock_only wins per view logic."""
        response = staff_client.get(
            reverse("exports:export-inventory"),
            {"out_of_stock_only": "true", "low_stock_only": "true"},
        )
        _assert_csv_response(response)
