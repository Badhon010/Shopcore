from __future__ import annotations
from django.urls import path
from apps.inventory.views import RestockView, StockItemDetailView, StockItemListView

app_name = "inventory"

urlpatterns = [
    path("stock/", StockItemListView.as_view(), name="stock-list"),
    path("stock/<int:pk>/", StockItemDetailView.as_view(), name="stock-detail"),
    path("stock/<int:pk>/restock/", RestockView.as_view(), name="stock-restock"),
]
