"""Models for the catalog app."""
from __future__ import annotations

import os

from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVector, SearchVectorField
from django.core.exceptions import ValidationError
from django.db import models

from apps.catalog.constants import ProductStatus
from apps.common.models import SoftDeleteModel, TimeStampedModel


def product_image_upload_path(instance, filename: str) -> str:
    ext = os.path.splitext(filename)[1].lower()
    return f"products/{instance.product.slug}/images/{instance.pk or 'new'}{ext}"


def category_image_upload_path(instance, filename: str) -> str:
    ext = os.path.splitext(filename)[1].lower()
    return f"categories/{instance.slug}{ext}"


def brand_logo_upload_path(instance, filename: str) -> str:
    ext = os.path.splitext(filename)[1].lower()
    return f"brands/{instance.slug}{ext}"


def banner_image_upload_path(instance, filename: str) -> str:
    ext = os.path.splitext(filename)[1].lower()
    return f"banners/{instance.pk or 'new'}{ext}"


class Category(SoftDeleteModel):
    """Self-referential category supporting up to 3 levels of nesting."""

    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=255, unique=True)
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="children",
    )
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to=category_image_upload_path, null=True, blank=True)
    display_order = models.PositiveIntegerField(default=0)
    meta_title = models.CharField(max_length=255, blank=True)
    meta_description = models.TextField(blank=True)

    class Meta:
        verbose_name = "category"
        verbose_name_plural = "categories"
        indexes = [
            models.Index(fields=["parent", "is_active", "display_order"]),
        ]
        ordering = ["display_order", "name"]

    def __str__(self) -> str:
        return self.name

    def get_descendants(self) -> list[int]:
        """Return all descendant category IDs (for filtering by category tree).

        Uses .all() so Django can serve results from the prefetch cache
        (set up in filter_category / get_category_tree) instead of issuing
        a new query per node.  The default manager already filters is_active.
        """
        ids = [self.pk]
        for child in self.children.all():
            ids.extend(child.get_descendants())
        return ids


class Brand(SoftDeleteModel):
    """Product brand."""

    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=255, unique=True)
    logo = models.ImageField(upload_to=brand_logo_upload_path, null=True, blank=True)
    description = models.TextField(blank=True)

    class Meta:
        verbose_name = "brand"
        verbose_name_plural = "brands"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Attribute(models.Model):
    """A product attribute, e.g. 'Color', 'Size'."""

    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=120, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class AttributeValue(models.Model):
    """A value for an attribute, e.g. 'Red', 'XL'."""

    attribute = models.ForeignKey(Attribute, on_delete=models.CASCADE, related_name="values")
    value = models.CharField(max_length=200)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = [("attribute", "value")]
        ordering = ["display_order", "value"]

    def __str__(self) -> str:
        return f"{self.attribute.name}: {self.value}"


class Product(SoftDeleteModel):
    """A product in the catalog.

    The product itself is never directly purchasable if it has variants —
    customers always add a ProductVariant to their cart. If no variants are
    created, a default variant is auto-created via a post_save signal so that
    cart/order code always operates on ProductVariant uniformly.

    ``search_vector`` is a PostgreSQL-only SearchVectorField.  On SQLite it is
    stored as a nullable text column.  The ``update_search_vector`` signal and
    ``search_products`` selector both guard against non-Postgres backends so
    that development works without a Postgres install.
    """

    name = models.CharField(max_length=500)
    slug = models.SlugField(max_length=520, unique=True)
    category = models.ForeignKey(
        Category, on_delete=models.PROTECT, related_name="products"
    )
    brand = models.ForeignKey(
        Brand, on_delete=models.SET_NULL, null=True, blank=True, related_name="products"
    )
    description = models.TextField(blank=True)
    short_description = models.CharField(max_length=500, blank=True)
    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    compare_at_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    sku = models.CharField(max_length=100, unique=True)
    status = models.CharField(
        max_length=20, choices=ProductStatus.choices, default=ProductStatus.DRAFT
    )
    is_featured = models.BooleanField(default=False)
    weight_kg = models.DecimalField(max_digits=8, decimal_places=3, null=True, blank=True)
    meta_title = models.CharField(max_length=255, blank=True)
    meta_description = models.TextField(blank=True)
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    review_count = models.PositiveIntegerField(default=0)
    # PostgreSQL full-text search vector (kept in sync via post_save signal on PG only).
    # On SQLite this is stored as a plain nullable text column and is never written.
    search_vector = SearchVectorField(null=True, blank=True)

    objects = None  # replaced by ProductManager below
    all_objects = None  # replaced below

    class Meta:
        verbose_name = "product"
        verbose_name_plural = "products"
        indexes = [
            models.Index(fields=["category", "is_active", "status"]),
            models.Index(fields=["is_featured", "is_active"]),
            models.Index(fields=["slug"]),
            models.Index(fields=["sku"]),
            GinIndex(fields=["search_vector"], name="catalog_product_search_gin"),
        ]
        constraints = [
            models.CheckConstraint(condition=models.Q(base_price__gte=0), name="product_base_price_gte_0"),
        ]

    def __str__(self) -> str:
        return self.name

    def clean(self) -> None:
        if self.compare_at_price is not None and self.compare_at_price <= self.base_price:
            raise ValidationError(
                {"compare_at_price": "Compare-at price must be greater than base price."}
            )


class ProductImage(TimeStampedModel):
    """An image associated with a product."""

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to=product_image_upload_path, blank=True)
    thumbnail = models.ImageField(upload_to="products/thumbnails/", null=True, blank=True)
    # Optional external URL — used for seed/demo data when no file is uploaded.
    # The serializer returns this instead of the ImageField URL when set.
    external_url = models.URLField(blank=True)
    alt_text = models.CharField(max_length=255, blank=True)
    display_order = models.PositiveIntegerField(default=0)
    is_primary = models.BooleanField(default=False)

    class Meta:
        ordering = ["display_order"]
        constraints = [
            models.UniqueConstraint(
                fields=["product"],
                condition=models.Q(is_primary=True),
                name="unique_primary_image_per_product",
            )
        ]

    def __str__(self) -> str:
        return f"Image {self.pk} for {self.product.name}"


class ProductVariant(models.Model):
    """A purchasable variant of a product.

    Stock for this variant lives in apps.inventory.StockItem, not here.
    If a product has no explicit variants, a default variant is auto-created
    via signal so that cart/order code always operates on ProductVariant.
    """

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="variants")
    sku = models.CharField(max_length=100, unique=True)
    attribute_values = models.ManyToManyField(
        AttributeValue, blank=True, related_name="variants"
    )
    price_override = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="If set, overrides the product's base price for this variant.",
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        indexes = [
            models.Index(fields=["product", "is_active"]),
            models.Index(fields=["sku"]),
        ]

    def __str__(self) -> str:
        attrs = ", ".join(str(av) for av in self.attribute_values.all())
        return f"{self.product.name} ({attrs})" if attrs else f"{self.product.name} (default)"

    @property
    def effective_price(self):
        """Return this variant's effective price (override or product base price)."""
        return self.price_override if self.price_override is not None else self.product.base_price


class Banner(TimeStampedModel):
    """A homepage hero slider slide, managed from the admin."""

    title = models.CharField(max_length=200)
    subtitle = models.CharField(max_length=300, blank=True)
    eyebrow = models.CharField(
        max_length=100, blank=True, help_text="Small label shown above the title, e.g. 'Exclusive Collection'."
    )
    image = models.ImageField(upload_to=banner_image_upload_path)
    cta_text = models.CharField(max_length=50, blank=True, default="Shop now")
    cta_link = models.CharField(max_length=255, blank=True, default="/products")
    secondary_cta_text = models.CharField(max_length=50, blank=True, default="Explore categories")
    secondary_cta_link = models.CharField(max_length=255, blank=True, default="#categories")
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["display_order", "-created_at"]
        indexes = [
            models.Index(fields=["is_active", "display_order"]),
        ]

    def __str__(self) -> str:
        return self.title


# Attach custom managers after all model definitions
from apps.catalog.managers import AllProductsManager, ProductManager  # noqa: E402

Product.add_to_class("objects", ProductManager())
Product.add_to_class("all_objects", AllProductsManager())
