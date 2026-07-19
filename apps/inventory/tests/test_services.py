"""Tests for the inventory services — critical concurrency and stock logic."""
from __future__ import annotations

import pytest

from apps.inventory.exceptions import InsufficientStockError
from apps.inventory.models import StockItem, StockMovement
from apps.inventory.services import commit_sale, release_reservation, reserve_stock, restock
from apps.inventory.tests.factories import StockItemFactory, WarehouseFactory


@pytest.mark.django_db
class TestReserveStock:
    def test_reserve_stock_success(self):
        stock = StockItemFactory(quantity_on_hand=10, quantity_reserved=0)
        reserve_stock(stock.variant, 3, warehouse=stock.warehouse)
        stock.refresh_from_db()
        assert stock.quantity_reserved == 3
        assert stock.quantity_available == 7

    def test_reserve_stock_rejects_zero_quantity(self):
        stock = StockItemFactory(quantity_on_hand=10, quantity_reserved=0)
        with pytest.raises(ValueError, match="Quantity must be greater than zero."):
            reserve_stock(stock.variant, 0, warehouse=stock.warehouse)

    def test_reserve_stock_rejects_negative_quantity(self):
        stock = StockItemFactory(quantity_on_hand=10, quantity_reserved=0)
        with pytest.raises(ValueError, match="Quantity must be greater than zero."):
            reserve_stock(stock.variant, -1, warehouse=stock.warehouse)

    def test_reserve_stock_insufficient(self):
        stock = StockItemFactory(quantity_on_hand=2, quantity_reserved=0)
        with pytest.raises(InsufficientStockError) as exc_info:
            reserve_stock(stock.variant, 5, warehouse=stock.warehouse)
        assert exc_info.value.details["requested"] == 5
        assert exc_info.value.details["available"] == 2
        # Verify nothing was changed
        stock.refresh_from_db()
        assert stock.quantity_reserved == 0

    def test_reserve_creates_movement_log(self):
        stock = StockItemFactory(quantity_on_hand=10, quantity_reserved=0)
        reserve_stock(stock.variant, 2, reference="ORD-123", warehouse=stock.warehouse)
        from apps.inventory.constants import MovementType
        assert StockMovement.objects.filter(
            stock_item=stock, movement_type=MovementType.RESERVATION
        ).exists()


@pytest.mark.django_db
class TestReleaseReservation:
    def test_release_reservation(self):
        stock = StockItemFactory(quantity_on_hand=10, quantity_reserved=5)
        release_reservation(stock.variant, 3, warehouse=stock.warehouse)
        stock.refresh_from_db()
        assert stock.quantity_reserved == 2

    def test_release_reservation_is_idempotent_per_reference(self):
        """Calling release_reservation() twice with the same reference (e.g.
        a retried cancellation) must not double-release the quantity."""
        stock = StockItemFactory(quantity_on_hand=10, quantity_reserved=5)
        release_reservation(stock.variant, 3, reference="ORD-DUP-1", warehouse=stock.warehouse)
        release_reservation(stock.variant, 3, reference="ORD-DUP-1", warehouse=stock.warehouse)
        stock.refresh_from_db()
        assert stock.quantity_reserved == 2
        assert StockMovement.objects.filter(
            stock_item=stock, reference="ORD-DUP-1"
        ).count() == 1


@pytest.mark.django_db
class TestCommitSale:
    def test_commit_sale(self):
        stock = StockItemFactory(quantity_on_hand=10, quantity_reserved=3)
        commit_sale(stock.variant, 3, warehouse=stock.warehouse)
        stock.refresh_from_db()
        assert stock.quantity_on_hand == 7
        assert stock.quantity_reserved == 0

    def test_commit_sale_is_idempotent_per_reference(self):
        """Calling commit_sale() twice with the same reference (e.g. a
        retried payment-confirmation webhook) must not double-decrement
        stock."""
        stock = StockItemFactory(quantity_on_hand=10, quantity_reserved=3)
        commit_sale(stock.variant, 3, reference="ORD-DUP-2", warehouse=stock.warehouse)
        commit_sale(stock.variant, 3, reference="ORD-DUP-2", warehouse=stock.warehouse)
        stock.refresh_from_db()
        assert stock.quantity_on_hand == 7
        assert stock.quantity_reserved == 0
        assert StockMovement.objects.filter(
            stock_item=stock, reference="ORD-DUP-2"
        ).count() == 1


@pytest.mark.django_db
class TestRestock:
    def test_restock_creates_stock(self):
        stock = StockItemFactory(quantity_on_hand=0)
        restock(stock.variant, 50, warehouse=stock.warehouse)
        stock.refresh_from_db()
        assert stock.quantity_on_hand == 50
