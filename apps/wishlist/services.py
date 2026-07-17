from __future__ import annotations
import logging

from django.db import transaction

from apps.wishlist.exceptions import VariantNotFoundError
from apps.wishlist.models import Wishlist, WishlistItem

logger = logging.getLogger("shopcore.wishlist.services")


def get_or_create_wishlist(user) -> Wishlist:
    wishlist, _ = Wishlist.objects.get_or_create(user=user)
    return wishlist


def add_to_wishlist(user, product) -> WishlistItem:
    wishlist = get_or_create_wishlist(user)
    item, created = WishlistItem.objects.get_or_create(wishlist=wishlist, product=product)
    return item


def remove_from_wishlist(user, product) -> None:
    wishlist = get_or_create_wishlist(user)
    WishlistItem.objects.filter(wishlist=wishlist, product=product).delete()


def move_to_cart(user, product, variant_id: int | None = None) -> None:
    """Move a wishlist item to the user's cart.

    Runs as a single transaction so a failure partway through never leaves
    the item in both the cart and the wishlist (docs/PRODUCTION_READINESS_AUDIT.md #24).
    """
    from apps.cart.services import add_to_cart, get_or_create_cart
    from apps.catalog.constants import ProductStatus
    from apps.catalog.models import ProductVariant

    with transaction.atomic():
        cart = get_or_create_cart(user=user)

        variant_qs = ProductVariant.objects.filter(
            product=product, is_active=True, product__status=ProductStatus.PUBLISHED
        )
        if variant_id:
            try:
                variant = variant_qs.get(pk=variant_id)
            except ProductVariant.DoesNotExist:
                raise VariantNotFoundError()
        else:
            variant = variant_qs.order_by("price_override").first()
            if variant is None:
                raise VariantNotFoundError("No active variant found for this product.")

        add_to_cart(cart, variant, quantity=1)
        remove_from_wishlist(user, product)

    logger.info("Moved product %s from wishlist to cart for user %s", product.slug, user.email)
