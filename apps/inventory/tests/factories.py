"""Test factories for the inventory app."""
from __future__ import annotations

import factory
from factory.django import DjangoModelFactory

from apps.catalog.tests.factories import ProductVariantFactory
from apps.inventory.models import StockItem, Warehouse


class WarehouseFactory(DjangoModelFactory):
    name = factory.Sequence(lambda n: f"Warehouse {n}")
    code = factory.Sequence(lambda n: f"WH-{n:03d}")
    is_default = True

    class Meta:
        model = Warehouse


class StockItemFactory(DjangoModelFactory):
    variant = factory.SubFactory(ProductVariantFactory)
    warehouse = factory.SubFactory(WarehouseFactory)
    quantity_on_hand = 100
    quantity_reserved = 0
    low_stock_threshold = 5

    class Meta:
        model = StockItem
