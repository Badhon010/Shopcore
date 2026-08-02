"""Tests for inventory management endpoints."""
from __future__ import annotations

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.tests.factories import StaffUserFactory, UserFactory
from apps.inventory.models import StockMovement
from apps.inventory.tests.factories import StockItemFactory, WarehouseFactory


@pytest.fixture
def staff_client():
    staff = StaffUserFactory()
    client = APIClient()
    client.force_authenticate(user=staff)
    return client, staff


@pytest.fixture
def plain_client():
    user = UserFactory()
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
class TestStockThresholdUpdateView:
    def test_update_threshold(self, staff_client):
        client, _ = staff_client
        stock = StockItemFactory(low_stock_threshold=5)
        url = reverse("inventory:stock-threshold", kwargs={"pk": stock.pk})
        response = client.patch(url, {"low_stock_threshold": 20}, format="json")
        assert response.status_code == status.HTTP_200_OK
        stock.refresh_from_db()
        assert stock.low_stock_threshold == 20

    def test_update_threshold_zero(self, staff_client):
        client, _ = staff_client
        stock = StockItemFactory(low_stock_threshold=5)
        url = reverse("inventory:stock-threshold", kwargs={"pk": stock.pk})
        response = client.patch(url, {"low_stock_threshold": 0}, format="json")
        assert response.status_code == status.HTTP_200_OK
        stock.refresh_from_db()
        assert stock.low_stock_threshold == 0

    def test_update_threshold_negative_rejected(self, staff_client):
        client, _ = staff_client
        stock = StockItemFactory()
        url = reverse("inventory:stock-threshold", kwargs={"pk": stock.pk})
        response = client.patch(url, {"low_stock_threshold": -1}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_update_threshold_nonexistent(self, staff_client):
        client, _ = staff_client
        url = reverse("inventory:stock-threshold", kwargs={"pk": 999999})
        response = client.patch(url, {"low_stock_threshold": 10}, format="json")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_threshold_requires_staff(self, plain_client):
        stock = StockItemFactory()
        url = reverse("inventory:stock-threshold", kwargs={"pk": stock.pk})
        response = plain_client.patch(url, {"low_stock_threshold": 10}, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestManualStockAdjustmentView:
    def test_positive_adjustment(self, staff_client):
        client, _ = staff_client
        stock = StockItemFactory(quantity_on_hand=50, quantity_reserved=0)
        url = reverse("inventory:stock-adjust", kwargs={"pk": stock.pk})
        response = client.post(
            url,
            {"quantity_delta": 10, "reason": "Physical count correction"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        stock.refresh_from_db()
        assert stock.quantity_on_hand == 60

    def test_negative_adjustment(self, staff_client):
        client, _ = staff_client
        stock = StockItemFactory(quantity_on_hand=50, quantity_reserved=0)
        url = reverse("inventory:stock-adjust", kwargs={"pk": stock.pk})
        response = client.post(
            url,
            {"quantity_delta": -10, "reason": "Shrinkage"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        stock.refresh_from_db()
        assert stock.quantity_on_hand == 40

    def test_adjustment_creates_movement(self, staff_client):
        client, staff = staff_client
        stock = StockItemFactory(quantity_on_hand=50, quantity_reserved=0)
        url = reverse("inventory:stock-adjust", kwargs={"pk": stock.pk})
        client.post(
            url,
            {"quantity_delta": 5, "reason": "Recount", "note": "Annual audit"},
            format="json",
        )
        movement = StockMovement.objects.filter(stock_item=stock, movement_type="ADJUSTMENT").first()
        assert movement is not None
        assert movement.quantity_delta == 5
        assert movement.created_by == staff

    def test_zero_delta_rejected(self, staff_client):
        client, _ = staff_client
        stock = StockItemFactory(quantity_on_hand=50)
        url = reverse("inventory:stock-adjust", kwargs={"pk": stock.pk})
        response = client.post(
            url,
            {"quantity_delta": 0, "reason": "Test"},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_negative_stock_prevented(self, staff_client):
        client, _ = staff_client
        stock = StockItemFactory(quantity_on_hand=5, quantity_reserved=0)
        url = reverse("inventory:stock-adjust", kwargs={"pk": stock.pk})
        response = client.post(
            url,
            {"quantity_delta": -10, "reason": "Error"},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["error"]["code"] == "NEGATIVE_STOCK"
        stock.refresh_from_db()
        assert stock.quantity_on_hand == 5  # unchanged

    def test_adjustment_below_reserved_prevented(self, staff_client):
        client, _ = staff_client
        # on_hand=20, reserved=15, available=5
        # Delta of -10 → on_hand=10, available=10-15=-5 → blocked
        stock = StockItemFactory(quantity_on_hand=20, quantity_reserved=15)
        url = reverse("inventory:stock-adjust", kwargs={"pk": stock.pk})
        response = client.post(
            url,
            {"quantity_delta": -10, "reason": "Test"},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["error"]["code"] == "INSUFFICIENT_AVAILABLE"

    def test_adjust_nonexistent_stock(self, staff_client):
        client, _ = staff_client
        url = reverse("inventory:stock-adjust", kwargs={"pk": 999999})
        response = client.post(
            url,
            {"quantity_delta": 5, "reason": "Test"},
            format="json",
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_adjust_requires_staff(self, plain_client):
        stock = StockItemFactory(quantity_on_hand=50)
        url = reverse("inventory:stock-adjust", kwargs={"pk": stock.pk})
        response = plain_client.post(
            url,
            {"quantity_delta": 5, "reason": "Test"},
            format="json",
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestStockMovementHistoryView:
    def test_movement_history_empty(self, staff_client):
        client, _ = staff_client
        stock = StockItemFactory()
        url = reverse("inventory:stock-movements", kwargs={"pk": stock.pk})
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["results"] == []

    def test_movement_history_returns_movements(self, staff_client):
        client, staff = staff_client
        stock = StockItemFactory(quantity_on_hand=100)
        # Create some movements via adjustment endpoint
        adjust_url = reverse("inventory:stock-adjust", kwargs={"pk": stock.pk})
        client.post(adjust_url, {"quantity_delta": 10, "reason": "Audit"}, format="json")
        client.post(adjust_url, {"quantity_delta": -5, "reason": "Shrink"}, format="json")

        url = reverse("inventory:stock-movements", kwargs={"pk": stock.pk})
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 2

    def test_movement_history_ordered_by_newest_first(self, staff_client):
        client, _ = staff_client
        stock = StockItemFactory(quantity_on_hand=100)
        adjust_url = reverse("inventory:stock-adjust", kwargs={"pk": stock.pk})
        client.post(adjust_url, {"quantity_delta": 10, "reason": "First"}, format="json")
        client.post(adjust_url, {"quantity_delta": 5, "reason": "Second"}, format="json")

        url = reverse("inventory:stock-movements", kwargs={"pk": stock.pk})
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        results = response.data["results"]
        assert len(results) == 2
        # Newest should come first — delta=5 was created last
        assert results[0]["quantity_delta"] == 5
        assert results[1]["quantity_delta"] == 10

    def test_movement_history_requires_staff(self, plain_client):
        stock = StockItemFactory()
        url = reverse("inventory:stock-movements", kwargs={"pk": stock.pk})
        response = plain_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_movement_history_is_paginated(self, staff_client):
        client, _ = staff_client
        stock = StockItemFactory(quantity_on_hand=1000)
        adjust_url = reverse("inventory:stock-adjust", kwargs={"pk": stock.pk})
        for i in range(5):
            client.post(adjust_url, {"quantity_delta": 1, "reason": f"Audit {i}"}, format="json")

        url = reverse("inventory:stock-movements", kwargs={"pk": stock.pk})
        response = client.get(url, {"page_size": 2})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 5
        assert len(response.data["results"]) == 2


@pytest.mark.django_db
class TestStockItemListView:
    """GET /inventory/stock/ — list with search / low-stock / warehouse filters."""

    def test_lists_all_stock_items(self, staff_client):
        client, _ = staff_client
        StockItemFactory()
        StockItemFactory()
        url = reverse("inventory:stock-list")
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 2

    def test_search_by_sku(self, staff_client):
        client, _ = staff_client
        target = StockItemFactory(variant__sku="GRN-TEE-L")
        StockItemFactory(variant__sku="BLU-HOOD-M")
        url = reverse("inventory:stock-list")
        response = client.get(url, {"search": "GRN-TEE"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["id"] == target.pk

    def test_search_by_product_name(self, staff_client):
        client, _ = staff_client
        target = StockItemFactory(variant__product__name="Organic Green Tee")
        StockItemFactory(variant__product__name="Denim Jacket")
        url = reverse("inventory:stock-list")
        response = client.get(url, {"search": "green tee"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["id"] == target.pk

    def test_low_stock_only_filter(self, staff_client):
        client, _ = staff_client
        # available=2 <= threshold=5 → low stock
        low = StockItemFactory(quantity_on_hand=2, quantity_reserved=0, low_stock_threshold=5)
        StockItemFactory(quantity_on_hand=100, quantity_reserved=0, low_stock_threshold=5)
        url = reverse("inventory:stock-list")
        response = client.get(url, {"low_stock_only": "true"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["id"] == low.pk

    def test_low_stock_counts_reserved(self, staff_client):
        client, _ = staff_client
        # on_hand=10, reserved=6 → available=4 <= 5 → low stock
        low = StockItemFactory(quantity_on_hand=10, quantity_reserved=6, low_stock_threshold=5)
        # on_hand=10, reserved=0 → available=10 > 5 → not low stock
        StockItemFactory(quantity_on_hand=10, quantity_reserved=0, low_stock_threshold=5)
        url = reverse("inventory:stock-list")
        response = client.get(url, {"low_stock_only": "true"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["id"] == low.pk

    def test_out_of_stock_only_filter(self, staff_client):
        client, _ = staff_client
        oos = StockItemFactory(quantity_on_hand=0)
        StockItemFactory(quantity_on_hand=50)
        url = reverse("inventory:stock-list")
        response = client.get(url, {"out_of_stock_only": "true"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["id"] == oos.pk

    def test_warehouse_filter(self, staff_client):
        client, _ = staff_client
        wh1 = WarehouseFactory(code="WH-MAIN")
        wh2 = WarehouseFactory(code="WH-SEC")
        in_wh1 = StockItemFactory(warehouse=wh1)
        StockItemFactory(warehouse=wh2)
        url = reverse("inventory:stock-list")
        response = client.get(url, {"warehouse": str(wh1.pk)})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["id"] == in_wh1.pk

    def test_combined_filters(self, staff_client):
        client, _ = staff_client
        wh = WarehouseFactory(code="WH-ONE")
        target = StockItemFactory(
            warehouse=wh,
            variant__product__name="Cherry Soda",
            quantity_on_hand=2,
            low_stock_threshold=5,
        )
        StockItemFactory(
            warehouse=wh,
            variant__product__name="Lemon Soda",
            quantity_on_hand=100,
        )
        StockItemFactory(
            variant__product__name="Cherry Soda",
            quantity_on_hand=2,
            low_stock_threshold=5,
        )
        url = reverse("inventory:stock-list")
        response = client.get(
            url,
            {"search": "cherry", "low_stock_only": "true", "warehouse": str(wh.pk)},
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["id"] == target.pk

    def test_response_includes_stock_status_fields(self, staff_client):
        client, _ = staff_client
        StockItemFactory(quantity_on_hand=0, quantity_reserved=0, low_stock_threshold=5)
        StockItemFactory(quantity_on_hand=100, quantity_reserved=0, low_stock_threshold=5)
        url = reverse("inventory:stock-list")
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        results = {r["id"]: r for r in response.data["results"]}
        assert all("is_low_stock" in r and "is_out_of_stock" in r for r in results.values())

    def test_stock_list_requires_staff(self, plain_client):
        url = reverse("inventory:stock-list")
        response = plain_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_stock_list_requires_auth(self):
        client = APIClient()
        url = reverse("inventory:stock-list")
        response = client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestWarehouseListView:
    def test_list_warehouses(self, staff_client):
        client, _ = staff_client
        WarehouseFactory(name="Main WH", code="MAIN-001")
        WarehouseFactory(name="Secondary WH", code="SEC-001")
        url = reverse("inventory:warehouse-list")
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        # At least the warehouses we created (paginated response)
        names = [w["name"] for w in response.data["results"]]
        assert "Main WH" in names
        assert "Secondary WH" in names

    def test_warehouse_list_requires_staff(self, plain_client):
        url = reverse("inventory:warehouse-list")
        response = plain_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_warehouse_list_requires_auth(self):
        client = APIClient()
        url = reverse("inventory:warehouse-list")
        response = client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
