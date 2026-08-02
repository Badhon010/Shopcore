from __future__ import annotations
from django.urls import path
from apps.cart.views import (
    CartItemDetailView,
    CartItemListView,
    CartView,
    ClearCartView,
    MergeGuestCartView,
)

app_name = "cart"

urlpatterns = [
    path("", CartView.as_view(), name="cart-detail"),
    path("items/", CartItemListView.as_view(), name="cart-item-list"),
    path("items/<int:item_id>/", CartItemDetailView.as_view(), name="cart-item-detail"),
    path("clear/", ClearCartView.as_view(), name="cart-clear"),
    path("merge-guest/", MergeGuestCartView.as_view(), name="cart-merge-guest"),
]
