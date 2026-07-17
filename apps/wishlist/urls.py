from __future__ import annotations
from django.urls import path
from apps.wishlist.views import WishlistAddView, WishlistMoveToCartView, WishlistRemoveView, WishlistView

app_name = "wishlist"

urlpatterns = [
    path("", WishlistView.as_view(), name="wishlist-list"),
    path("add/", WishlistAddView.as_view(), name="wishlist-add"),
    path("remove/<int:product_id>/", WishlistRemoveView.as_view(), name="wishlist-remove"),
    path("move-to-cart/", WishlistMoveToCartView.as_view(), name="wishlist-move-to-cart"),
]
