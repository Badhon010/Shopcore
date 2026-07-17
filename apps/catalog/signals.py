"""Signals for the catalog app.

Three signals are registered here (per the architecture rule of using signals
only for cross-cutting concerns that must fire regardless of code path):

1. Auto-create a default ProductVariant when a Product is created with no variants.
2. Keep Product.search_vector in sync on post_save (PostgreSQL only).
3. Invalidate cache keys on Product/Category save/delete.
"""
from __future__ import annotations

import logging

from django.db import connection
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

logger = logging.getLogger("shopcore.catalog.signals")


def _is_postgres() -> bool:
    """Return True when the current database backend is PostgreSQL."""
    return connection.vendor == "postgresql"


@receiver(post_save, sender="catalog.Product")
def auto_create_default_variant(sender, instance, created: bool, **kwargs) -> None:
    """Auto-create a default ProductVariant for newly created products.

    This ensures that cart/order code always operates on ProductVariant
    uniformly, without conditional logic for 'does this product have variants?'.
    """
    if not created:
        return
    from apps.catalog.models import ProductVariant

    if not instance.variants.exists():
        ProductVariant.objects.create(
            product=instance,
            sku=f"{instance.sku}-DEFAULT",
            is_active=True,
        )
        logger.debug("Created default variant for product %s (pk=%s)", instance.slug, instance.pk)


@receiver(post_save, sender="catalog.Product")
def update_search_vector(sender, instance, created: bool, **kwargs) -> None:
    """Keep the full-text search vector in sync after saving a Product.

    PostgreSQL only — silently skipped on SQLite / other backends.

    Uses queryset.update() (an SQL UPDATE statement) so that SearchVector
    column-reference expressions are resolved by the database — they cannot
    be used on INSERT.  Disconnect the signal temporarily to avoid recursion.
    """
    if not _is_postgres():
        return

    from django.contrib.postgres.search import SearchVector

    post_save.disconnect(update_search_vector, sender=sender)
    try:
        sender.objects.filter(pk=instance.pk).update(
            search_vector=(
                SearchVector("name", weight="A") + SearchVector("description", weight="B")
            )
        )
    finally:
        post_save.connect(update_search_vector, sender=sender)


@receiver(post_save, sender="catalog.Product")
@receiver(post_delete, sender="catalog.Product")
def invalidate_product_cache(sender, instance, **kwargs) -> None:
    """Invalidate the product detail cache key on save/delete."""
    from django.core.cache import cache

    cache_key = f"catalog:product:{instance.slug}"
    cache.delete(cache_key)
    logger.debug("Invalidated cache key: %s", cache_key)


@receiver(post_save, sender="catalog.Category")
@receiver(post_delete, sender="catalog.Category")
def invalidate_category_cache(sender, instance, **kwargs) -> None:
    """Invalidate the category tree cache on any category change."""
    from django.core.cache import cache

    cache.delete("catalog:category-tree")
    logger.debug("Invalidated cache key: catalog:category-tree")
