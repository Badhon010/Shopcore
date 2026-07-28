from __future__ import annotations

from django.urls import path

from apps.inventory.views import (
    ManualStockAdjustmentView,
    RestockView,
    StockItemDetailView,
    StockItemListView,
    StockMovementHistoryView,
    StockThresholdUpdateView,
    WarehouseListView,
)

app_name = "inventory"

urlpatterns = [
    path("stock/", StockItemListView.as_view(), name="stock-list"),
    path("stock/<int:pk>/", StockItemDetailView.as_view(), name="stock-detail"),
    path("stock/<int:pk>/restock/", RestockView.as_view(), name="stock-restock"),
    path("stock/<int:pk>/threshold/", StockThresholdUpdateView.as_view(), name="stock-threshold"),
    path("stock/<int:pk>/adjust/", ManualStockAdjustmentView.as_view(), name="stock-adjust"),
    path("stock/<int:pk>/movements/", StockMovementHistoryView.as_view(), name="stock-movements"),
    path("warehouses/", WarehouseListView.as_view(), name="warehouse-list"),
]
