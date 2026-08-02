from __future__ import annotations

import logging

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
    merge_guest_cart_into_user_cart,
    remove_cart_item,
    update_cart_item,
)
from apps.catalog.models import ProductVariant

logger = logging.getLogger("shopcore.cart.views")

# The X-Cart-Token header carries a client-generated token identifying a guest
# cart (audit H-4). It is stored server-side as Cart.session_key and merged
# into the authenticated user's cart on login (accounts login serializer calls
# merge_guest_cart_into_user_cart). An authenticated request always wins over
# the header; the header is only honored for anonymous requests.
CART_TOKEN_HEADER = "HTTP_X_CART_TOKEN"


def _resolve_cart_identity(request) -> tuple:
    """Return (user, session_key) — authenticated users always win.

    Args:
        request: The DRF request.

    Returns:
        Tuple of (user_or_None, session_key_or_None).
    """
    if request.user.is_authenticated:
        return request.user, None
    session_key = request.META.get(CART_TOKEN_HEADER, "") or None
    if session_key:
        # Normalize: tokens come from clients and may be arbitrary length;
        # cap to the session_key field width.
        session_key = session_key[:40]
    return None, session_key


class GuestCartPermission(permissions.BasePermission):
    """Allow anonymous requests only when a valid X-Cart-Token is supplied."""

    message = "A cart token (X-Cart-Token header) is required for guest carts."

    def has_permission(self, request, view) -> bool:
        if request.user.is_authenticated:
            return True
        return bool(request.META.get(CART_TOKEN_HEADER, ""))


class CartView(APIView):
    """Retrieve the current user's cart (or guest cart by token)."""

    permission_classes = [GuestCartPermission]

    def get(self, request, *args, **kwargs):
        user, session_key = _resolve_cart_identity(request)
        cart = get_or_create_cart(user=user, session_key=session_key)
        cart = get_cart_with_items(cart.pk)
        serializer = CartSerializer(cart)
        return Response(serializer.data)


class CartItemListView(APIView):
    """Add an item to the cart."""

    permission_classes = [GuestCartPermission]

    def post(self, request, *args, **kwargs):
        serializer = AddToCartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user, session_key = _resolve_cart_identity(request)
        cart = get_or_create_cart(user=user, session_key=session_key)
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

    permission_classes = [GuestCartPermission]

    def patch(self, request, item_id, *args, **kwargs):
        user, session_key = _resolve_cart_identity(request)
        cart = get_or_create_cart(user=user, session_key=session_key)
        serializer = UpdateCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            update_cart_item(cart, item_id, serializer.validated_data["quantity"])
        except ValueError as exc:
            raise VariantUnavailableError(message=str(exc))
        cart = get_cart_with_items(cart.pk)
        return Response(CartSerializer(cart).data)

    def delete(self, request, item_id, *args, **kwargs):
        user, session_key = _resolve_cart_identity(request)
        cart = get_or_create_cart(user=user, session_key=session_key)
        remove_cart_item(cart, item_id)
        cart = get_cart_with_items(cart.pk)
        return Response(CartSerializer(cart).data)


class ClearCartView(APIView):
    """Remove all items from the cart."""

    permission_classes = [GuestCartPermission]

    def post(self, request, *args, **kwargs):
        user, session_key = _resolve_cart_identity(request)
        cart = get_or_create_cart(user=user, session_key=session_key)
        clear_cart(cart)
        return Response({"message": "Cart cleared."})


class MergeGuestCartView(APIView):
    """Merge the guest cart (X-Cart-Token) into the authenticated user's cart.

    Called by the storefront after login when a guest cart token exists.
    Idempotent: a missing/expired guest cart is a no-op.
    """

    def post(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return Response(
                {"error": {"code": "AUTH_REQUIRED", "message": "Login required.", "details": {}}},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        session_key = request.META.get(CART_TOKEN_HEADER, "")
        if not session_key:
            return Response({"merged": False, "message": "No guest cart token provided."})

        cart = merge_guest_cart_into_user_cart(request.user, session_key[:40])
        cart = get_cart_with_items(cart.pk)
        return Response({"merged": True, "cart": CartSerializer(cart).data})
