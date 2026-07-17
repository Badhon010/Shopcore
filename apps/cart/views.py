from __future__ import annotations
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.cart.exceptions import VariantNotFoundError, VariantUnavailableError
from apps.cart.serializers import AddToCartSerializer, CartSerializer, UpdateCartItemSerializer
from apps.cart.services import (
    add_to_cart,
    clear_cart,
    get_cart_with_items,
    get_or_create_cart,
    remove_cart_item,
    update_cart_item,
)
from apps.catalog.models import ProductVariant

# Cart policy: carts are always tied to an authenticated user (see
# docs/PRODUCTION_READINESS_AUDIT.md #12 — the previous session-key guest
# path was unreachable behind the project-wide IsAuthenticated default and
# could create stray anonymous carts on top of that). Declared explicitly
# here rather than relying on the global DRF default (see audit L-8).
_CART_PERMISSIONS = [permissions.IsAuthenticated]


class CartView(APIView):
    """Retrieve the current user's cart."""
    permission_classes = _CART_PERMISSIONS

    def get(self, request, *args, **kwargs):
        cart = get_or_create_cart(user=request.user)
        cart = get_cart_with_items(cart.pk)
        serializer = CartSerializer(cart)
        return Response(serializer.data)


class CartItemListView(APIView):
    """Add an item to the cart."""
    permission_classes = _CART_PERMISSIONS

    def post(self, request, *args, **kwargs):
        serializer = AddToCartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        cart = get_or_create_cart(user=request.user)
        try:
            variant = ProductVariant.objects.select_related("product").get(
                pk=serializer.validated_data["variant_id"]
            )
        except ProductVariant.DoesNotExist:
            raise VariantNotFoundError()

        try:
            add_to_cart(cart, variant, serializer.validated_data["quantity"])
        except ValueError as exc:
            raise VariantUnavailableError(message=str(exc))

        cart = get_cart_with_items(cart.pk)
        return Response(CartSerializer(cart).data, status=status.HTTP_201_CREATED)


class CartItemDetailView(APIView):
    """Update or remove a specific cart item."""
    permission_classes = _CART_PERMISSIONS

    def patch(self, request, item_id, *args, **kwargs):
        cart = get_or_create_cart(user=request.user)
        serializer = UpdateCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            update_cart_item(cart, item_id, serializer.validated_data["quantity"])
        except ValueError as exc:
            raise VariantUnavailableError(message=str(exc))
        cart = get_cart_with_items(cart.pk)
        return Response(CartSerializer(cart).data)

    def delete(self, request, item_id, *args, **kwargs):
        cart = get_or_create_cart(user=request.user)
        remove_cart_item(cart, item_id)
        cart = get_cart_with_items(cart.pk)
        return Response(CartSerializer(cart).data)


class ClearCartView(APIView):
    """Remove all items from the cart."""
    permission_classes = _CART_PERMISSIONS

    def post(self, request, *args, **kwargs):
        cart = get_or_create_cart(user=request.user)
        clear_cart(cart)
        return Response({"message": "Cart cleared."})
