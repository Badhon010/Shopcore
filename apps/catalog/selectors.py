"""Read-only query functions for the catalog app.

These functions contain all read logic with select_related/prefetch_related
baked in. Views and serializers must use these rather than building ad-hoc
querysets inline (CQRS-lite separation).
"""
from __future__ import annotations

import logging
from typing import Any

from django.core.cache import cache
from django.db import connection
from django.db.models import Q, QuerySet

logger = logging.getLogger("shopcore.catalog.selectors")

CATEGORY_TREE_CACHE_KEY = "catalog:category-tree"
CATEGORY_TREE_CACHE_TTL = 300  # 5 minutes


def _is_postgres() -> bool:
    """Return True when the current database backend is PostgreSQL."""
    return connection.vendor == "postgresql"


def get_category_tree(request=None) -> list[dict]:
    """Return the full category tree with descendant product counts, cached 5 min.

    One extra query fetches direct product counts for every active category;
    the recursive serialize() then rolls them up so parent nodes show totals.

    Args:
        request: Optional DRF request — used to build absolute image URLs
            (consistent with banners/brands). When omitted, relative URLs are
            returned.
    """
    cached = cache.get(CATEGORY_TREE_CACHE_KEY)
    if cached is not None:
        return cached

    from apps.catalog.models import Category
    from django.db.models import Count, Q

    # Single bulk query — direct (non-recursive) product counts per category.
    counts: dict[int, int] = dict(
        Category.objects.filter(is_active=True)
        .annotate(cnt=Count("products", filter=Q(products__is_active=True)))
        .values_list("pk", "cnt")
    )

    root_categories = (
        Category.objects.filter(parent__isnull=True)
        .prefetch_related("children__children")
        .order_by("display_order", "name")
    )

    def serialize(cat) -> dict:
        # .all() uses the prefetch cache — no extra queries per node.
        children = [serialize(c) for c in cat.children.all()]
        direct = counts.get(cat.pk, 0)
        # Roll up descendant counts so a parent shows the sum of its subtree.
        total = direct + sum(c["product_count"] for c in children)
        image = None
        if cat.image:
            image = cat.image.url
            if request is not None:
                image = request.build_absolute_uri(image)
        return {
            "id": cat.pk,
            "name": cat.name,
            "slug": cat.slug,
            "description": cat.description,
            "image": image,
            "display_order": cat.display_order,
            "product_count": total,
            "children": children,
        }

    tree = [serialize(cat) for cat in root_categories]
    cache.set(CATEGORY_TREE_CACHE_KEY, tree, CATEGORY_TREE_CACHE_TTL)
    return tree


def get_product_list(filters: dict | None = None) -> QuerySet:
    """Return an optimized queryset for the product list endpoint.

    Args:
        filters: Optional filter dict (handled by django-filter in the view).

    Returns:
        QuerySet of published, active products with related objects pre-loaded.
    """
    from apps.catalog.models import Product

    return (
        Product.objects.published()
        .select_related("category", "brand")
        .prefetch_related(
            "images",
            "variants__attribute_values__attribute",
            "variants__stock_items",
        )
    )


def get_product_detail(slug: str) -> Any:
    """Return a single product with full relations pre-loaded.

    Price and stock are never served from cache (see architecture doc).
    Only catalog metadata (description, images, attributes) is cached.

    Args:
        slug: The product's URL slug.

    Returns:
        Product instance.

    Raises:
        Product.DoesNotExist: If no published product with this slug exists.
    """
    from apps.catalog.models import Product

    return (
        Product.objects.published()
        .select_related("category", "brand")
        .prefetch_related(
            "images",
            "variants__attribute_values__attribute",
            "variants__stock_items",
        )
        .get(slug=slug)
    )


def search_products(query: str) -> QuerySet:
    """Full-text product search.

    Uses PostgreSQL SearchVector when available; falls back to case-insensitive
    LIKE matching on SQLite / other backends so development works without Postgres.

    Args:
        query: The raw search string from the user.

    Returns:
        Queryset of matching products ordered by relevance (Postgres) or name (SQLite).
    """
    from apps.catalog.models import Product

    base_qs = (
        Product.objects.published()
        .select_related("category", "brand")
        .prefetch_related(
            "images",
            "variants",
            "variants__stock_items",
        )
    )

    if _is_postgres():
        from django.contrib.postgres.search import SearchQuery, SearchRank

        search_query = SearchQuery(query, search_type="websearch")
        return (
            base_qs
            .filter(search_vector=search_query)
            .annotate(rank=SearchRank("search_vector", search_query))
            .order_by("-rank")
        )

    # SQLite fallback — case-insensitive substring search
    return base_qs.filter(
        Q(name__icontains=query) | Q(description__icontains=query) | Q(sku__icontains=query)
    ).order_by("name")
