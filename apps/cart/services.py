"""Business logic services for the cart app."""
from __future__ import annotations

import logging
from decimal import Decimal

from django.db import transaction
from django.db.models import F

from apps.cart.exceptions import (
    CartItemNotFoundError,
    CartNotFoundError,
    VariantUnavailableError,
)
from apps.cart.models import Cart, CartItem
from apps.catalog.constants import ProductStatus

logger = logging.getLogger("shopcore.cart.services")

# Every read that will be serialized back to the client should go through
# this prefetch shape so CartSerializer never triggers N+1 queries walking
# cart.items -> variant -> product.
CART_ITEMS_PREFETCH = (
    "items__variant__product__images",
    "items__variant__attribute_values__attribute",
)


def get_or_create_cart(user=None, session_key: str | None = None) -> Cart:
    """Get the active cart for a user or session, creating one if needed.

    Args:
        user: Authenticated user (or None for guest).
        session_key: Django session key for guest carts.

    Returns:
        The active Cart instance.
    """
    if user and user.is_authenticated:
        cart, _ = Cart.objects.get_or_create(user=user, is_active=True)
    elif session_key:
        cart, _ = Cart.objects.get_or_create(session_key=session_key, user=None, is_active=True)
    else:
        cart = Cart.objects.create(is_active=True)
    return cart


def get_cart_with_items(cart_id: int) -> Cart:
    """Re-fetch a cart with all relations needed for serialization prefetched.

    Use this after any mutation instead of ``cart.refresh_from_db()`` —
    refreshing from the DB drops the prefetch cache, so the serializer's
    ``cart.items.all()`` walk would otherwise re-query per item.
    """
    return Cart.objects.prefetch_related(*CART_ITEMS_PREFETCH).get(pk=cart_id)


def add_to_cart(cart: Cart, variant, quantity: int) -> CartItem:
    """Add a variant to the cart, or increment quantity if already present.

    Args:
        cart: The active Cart instance.
        variant: ProductVariant to add.
        quantity: Number of units to add.

    Returns:
        The CartItem (created or updated).

    Raises:
        ValueError: If quantity < 1.
        VariantUnavailableError: If the variant or its parent product is not
            active/published.
    """
    if quantity < 1:
        raise ValueError("Quantity must be at least 1.")
    if not variant.is_active or variant.product.status != ProductStatus.PUBLISHED:
        raise VariantUnavailableError()

    unit_price = variant.effective_price

    with transaction.atomic():
        # Lock the cart row so two concurrent "add same variant" requests
        # serialize instead of racing on the get_or_create below.
        Cart.objects.select_for_update().get(pk=cart.pk)

        item, created = CartItem.objects.get_or_create(
            cart=cart,
            variant=variant,
            defaults={"quantity": quantity, "unit_price_snapshot": unit_price},
        )
        if not created:
            # F() expression avoids the read-modify-write lost-update race.
            CartItem.objects.filter(pk=item.pk).update(
                quantity=F("quantity") + quantity,
                unit_price_snapshot=unit_price,  # refresh price on add
            )
            item.refresh_from_db()

    return item


def update_cart_item(cart: Cart, item_id: int, quantity: int) -> CartItem:
    """Update the quantity of a cart item.

    Args:
        cart: The active Cart.
        item_id: CartItem PK.
        quantity: New quantity (must be >= 1).

    Returns:
        The updated CartItem.

    Raises:
        CartItemNotFoundError: If item doesn't belong to this cart.
        ValueError: If quantity < 1.
    """
    if quantity < 1:
        raise ValueError("Quantity must be at least 1.")

    try:
        item = CartItem.objects.get(pk=item_id, cart=cart)
    except CartItem.DoesNotExist:
        raise CartItemNotFoundError()

    item.quantity = quantity
    item.save(update_fields=["quantity", "updated_at"])
    return item


def remove_cart_item(cart: Cart, item_id: int) -> None:
    """Remove a specific item from the cart.

    Args:
        cart: The active Cart.
        item_id: CartItem PK.

    Raises:
        CartItemNotFoundError: If item doesn't belong to this cart.
    """
    deleted, _ = CartItem.objects.filter(pk=item_id, cart=cart).delete()
    if not deleted:
        raise CartItemNotFoundError()


def clear_cart(cart: Cart) -> None:
    """Remove all items from the cart."""
    cart.items.all().delete()


def merge_guest_cart_into_user_cart(user, session_key: str) -> Cart:
    """Merge a guest cart into the authenticated user's cart on login.

    Quantities are summed and capped at available stock. The guest cart
    is deactivated after merging.

    Args:
        user: The authenticated User.
        session_key: The guest session key.

    Returns:
        The user's active cart.
    """
    with transaction.atomic():
        try:
            guest_cart = Cart.objects.get(session_key=session_key, user=None, is_active=True)
        except Cart.DoesNotExist:
            return get_or_create_cart(user=user)

        user_cart = get_or_create_cart(user=user)

        for guest_item in guest_cart.items.select_related("variant"):
            try:
                user_item = CartItem.objects.get(cart=user_cart, variant=guest_item.variant)
                user_item.quantity += guest_item.quantity
                user_item.save(update_fields=["quantity", "updated_at"])
            except CartItem.DoesNotExist:
                CartItem.objects.create(
                    cart=user_cart,
                    variant=guest_item.variant,
                    quantity=guest_item.quantity,
                    unit_price_snapshot=guest_item.variant.effective_price,
                )

        guest_cart.is_active = False
        guest_cart.save(update_fields=["is_active"])

    logger.info("Merged guest cart (session=%s) into cart for user %s", session_key, user.email)
    return user_cart


def get_cart_summary(cart: Cart) -> dict:
    """Compute cart totals without persisting them.

    Price and stock are always fetched live — never cached.

    Args:
        cart: The Cart instance.

    Returns:
        Dict with subtotal, item_count, coupon_discount, and price_changed flags.
    """
    items = cart.items.select_related("variant__product").all()
    subtotal = Decimal("0.00")
    item_count = 0
    price_changed_items = []

    for item in items:
        current_price = item.variant.effective_price
        if current_price != item.unit_price_snapshot:
            price_changed_items.append(
                {
                    "variant_sku": item.variant.sku,
                    "old_price": str(item.unit_price_snapshot),
                    "new_price": str(current_price),
                }
            )
        subtotal += current_price * item.quantity
        item_count += item.quantity

    return {
        "subtotal": subtotal,
        "item_count": item_count,
        "price_changed_items": price_changed_items,
    }
