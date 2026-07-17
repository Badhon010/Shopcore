"""Custom managers and querysets for the catalog app."""
from __future__ import annotations

from django.db import models

from apps.common.models import SoftDeleteManager, SoftDeleteQuerySet


class ProductQuerySet(SoftDeleteQuerySet):
    """Custom QuerySet for Product with chainable business-logic methods."""

    def active(self) -> ProductQuerySet:
        return self.filter(is_active=True)

    def published(self) -> ProductQuerySet:
        from apps.catalog.constants import ProductStatus
        return self.filter(is_active=True, status=ProductStatus.PUBLISHED)

    def featured(self) -> ProductQuerySet:
        return self.filter(is_featured=True, is_active=True)

    def in_stock(self) -> ProductQuerySet:
        """Filter products that have at least one in-stock variant."""
        return self.filter(
            variants__is_active=True,
            variants__stock_items__quantity_on_hand__gt=models.F(
                "variants__stock_items__quantity_reserved"
            ),
        ).distinct()

    def with_related(self) -> ProductQuerySet:
        """Bundle standard select_related/prefetch_related for list views."""
        return self.select_related("category", "brand").prefetch_related(
            "images", "variants__attribute_values__attribute"
        )


class ProductManager(SoftDeleteManager):
    """Default manager — returns only active products."""

    def get_queryset(self) -> ProductQuerySet:
        return ProductQuerySet(self.model, using=self._db).filter(is_active=True)

    def published(self) -> ProductQuerySet:
        return self.get_queryset().published()

    def featured(self) -> ProductQuerySet:
        return self.get_queryset().featured()

    def in_stock(self) -> ProductQuerySet:
        return self.get_queryset().in_stock()

    def with_related(self) -> ProductQuerySet:
        return self.get_queryset().with_related()


class AllProductsManager(models.Manager):
    """Manager that returns all products, including soft-deleted ones."""

    def get_queryset(self) -> ProductQuerySet:
        return ProductQuerySet(self.model, using=self._db)
