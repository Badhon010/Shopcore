"""URL configuration for the exports app."""
from __future__ import annotations

from django.urls import path

from apps.exports.views import (
    ExportCustomersView,
    ExportInventoryView,
    ExportOrdersView,
    ExportProductsView,
    ExportReviewsView,
    ExportSubscribersView,
)

app_name = "exports"

urlpatterns = [
    path("products/", ExportProductsView.as_view(), name="export-products"),
    path("orders/", ExportOrdersView.as_view(), name="export-orders"),
    path("customers/", ExportCustomersView.as_view(), name="export-customers"),
    path("subscribers/", ExportSubscribersView.as_view(), name="export-subscribers"),
    path("reviews/", ExportReviewsView.as_view(), name="export-reviews"),
    path("inventory/", ExportInventoryView.as_view(), name="export-inventory"),
]
