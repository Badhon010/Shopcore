from __future__ import annotations
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.catalog.constants import ProductStatus
from apps.catalog.models import Product
from apps.common.exceptions import AppBaseException
from apps.wishlist.serializers import MoveToCartSerializer, WishlistItemSerializer
from apps.wishlist.services import add_to_wishlist, get_or_create_wishlist, move_to_cart, remove_from_wishlist
from apps.wishlist.models import WishlistItem

# Wishlist is always scoped to an authenticated user's own list — declared
# explicitly rather than relying on the global DRF default (audit L-8).
_WISHLIST_PERMISSIONS = [permissions.IsAuthenticated]


class ProductNotFoundError(AppBaseException):
    code = "NOT_FOUND"
    default_message = "Product not found."
    status_code = 404


class WishlistView(generics.ListAPIView):
    permission_classes = _WISHLIST_PERMISSIONS
    serializer_class = WishlistItemSerializer

    def get_queryset(self):
        wishlist = get_or_create_wishlist(self.request.user)
        return wishlist.items.select_related("product__category", "product__brand").prefetch_related(
            "product__images", "product__variants"
        )


class WishlistAddView(APIView):
    permission_classes = _WISHLIST_PERMISSIONS

    def post(self, request, *args, **kwargs):
        product_id = request.data.get("product_id")
        try:
            # Only published, non-deleted products can be wishlisted — draft
            # or archived products must not reach customers this way
            # (docs/PRODUCTION_READINESS_AUDIT.md #10 / H5).
            product = Product.objects.get(pk=product_id, status=ProductStatus.PUBLISHED)
        except Product.DoesNotExist:
            raise ProductNotFoundError()
        item = add_to_wishlist(request.user, product)
        return Response(WishlistItemSerializer(item).data, status=status.HTTP_201_CREATED)


class WishlistRemoveView(APIView):
    permission_classes = _WISHLIST_PERMISSIONS

    def delete(self, request, product_id, *args, **kwargs):
        # Removal doesn't need a publish-status filter: a user must always be
        # able to remove whatever is on their own wishlist, published or not.
        try:
            product = Product.objects.get(pk=product_id)
        except Product.DoesNotExist:
            raise ProductNotFoundError()
        remove_from_wishlist(request.user, product)
        return Response(status=status.HTTP_204_NO_CONTENT)


class WishlistMoveToCartView(APIView):
    permission_classes = _WISHLIST_PERMISSIONS

    def post(self, request, *args, **kwargs):
        serializer = MoveToCartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            product = Product.objects.get(
                pk=serializer.validated_data["product_id"], status=ProductStatus.PUBLISHED
            )
        except Product.DoesNotExist:
            raise ProductNotFoundError()
        # move_to_cart raises typed AppBaseException/ValueError subclasses;
        # let those propagate to the standard error envelope instead of
        # catching bare Exception and leaking str(exc) (audit M5/#25).
        move_to_cart(request.user, product, variant_id=serializer.validated_data.get("variant_id"))
        return Response({"message": "Item moved to cart."})
