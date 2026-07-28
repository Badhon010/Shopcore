"""Serializers for the catalog app."""
from __future__ import annotations

from rest_framework import serializers

from apps.catalog.models import (
    Attribute,
    AttributeValue,
    Banner,
    Brand,
    Category,
    Product,
    ProductImage,
    ProductVariant,
)


class CategoryListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug", "description", "display_order", "image"]


class CategoryDetailSerializer(serializers.ModelSerializer):
    children = CategoryListSerializer(many=True, read_only=True)
    parent = CategoryListSerializer(read_only=True)

    class Meta:
        model = Category
        fields = [
            "id", "name", "slug", "parent", "children", "description", "image",
            "display_order", "meta_title", "meta_description",
        ]


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ["id", "name", "slug", "logo", "description"]


class BannerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Banner
        fields = [
            "id", "title", "subtitle", "eyebrow", "image",
            "cta_text", "cta_link", "secondary_cta_text", "secondary_cta_link",
            "display_order",
        ]


class AttributeValueSerializer(serializers.ModelSerializer):
    attribute_name = serializers.CharField(source="attribute.name", read_only=True)
    attribute_slug = serializers.CharField(source="attribute.slug", read_only=True)

    class Meta:
        model = AttributeValue
        fields = ["id", "attribute_name", "attribute_slug", "value", "display_order"]


class AttributeSerializer(serializers.ModelSerializer):
    values = AttributeValueSerializer(many=True, read_only=True)

    class Meta:
        model = Attribute
        fields = ["id", "name", "slug", "values"]


class ProductImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    def get_url(self, obj) -> str:
        if obj.external_url:
            return obj.external_url
        request = self.context.get("request")
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        if obj.image:
            return obj.image.url
        return ""

    class Meta:
        model = ProductImage
        fields = ["id", "url", "image", "thumbnail", "alt_text", "display_order", "is_primary"]


class ProductVariantSerializer(serializers.ModelSerializer):
    attribute_values = AttributeValueSerializer(many=True, read_only=True)
    effective_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    # Stock quantity is fetched from inventory — not denormalized on variant
    stock_quantity = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = [
            "id", "sku", "attribute_values", "price_override", "effective_price",
            "is_active", "stock_quantity",
        ]

    def get_stock_quantity(self, obj) -> int:
        """Return available stock quantity from inventory.

        Relies on stock_items being prefetched by the selector (a single
        prefetch for all variants on the page).  Calling .exists() then
        .first() would issue two queries per variant — instead we call
        .first() once and check for None.
        """
        stock = obj.stock_items.first()
        if stock is None:
            return 0
        return stock.quantity_available


class ProductListSerializer(serializers.ModelSerializer):
    category = CategoryListSerializer(read_only=True)
    brand = BrandSerializer(read_only=True)
    primary_image = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()
    min_price = serializers.SerializerMethodField()
    # The list view is also used for "quick add to cart" on product cards, so
    # it needs enough variant data (id + stock) to add an item without a
    # second round-trip to the detail endpoint. Relies on the selector's
    # `variants__attribute_values__attribute` / `variants__stock_items`
    # prefetch — do not add per-row queries here.
    variants = ProductVariantSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            "id", "name", "slug", "category", "brand", "short_description",
            "base_price", "compare_at_price", "sku", "status", "is_featured",
            "average_rating", "review_count", "primary_image", "images",
            "min_price", "variants",
        ]

    def get_primary_image(self, obj) -> dict | None:
        # Use the prefetch cache — .filter() would bypass it and issue a new query.
        images = obj.images.all()
        img = next((i for i in images if i.is_primary), None) or next(iter(images), None)
        if img:
            return ProductImageSerializer(img, context=self.context).data
        return None

    def get_images(self, obj) -> list[dict]:
        # Pass context so ProductImageSerializer can build absolute URLs via request.
        return ProductImageSerializer(obj.images.all(), many=True, context=self.context).data

    def get_min_price(self, obj):
        # Filter active variants in Python to stay within the prefetch cache.
        active_variants = [v for v in obj.variants.all() if v.is_active]
        prices = [v.effective_price for v in active_variants if v.effective_price is not None]
        return min(prices) if prices else obj.base_price


class ProductDetailSerializer(serializers.ModelSerializer):
    category = CategoryDetailSerializer(read_only=True)
    brand = BrandSerializer(read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            "id", "name", "slug", "category", "brand", "description", "short_description",
            "base_price", "compare_at_price", "sku", "status", "is_featured", "weight_kg",
            "meta_title", "meta_description", "average_rating", "review_count",
            "images", "variants", "created_at", "updated_at",
        ]


class ProductCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for staff to create/update products."""

    class Meta:
        model = Product
        fields = [
            "name", "slug", "category", "brand", "description", "short_description",
            "base_price", "compare_at_price", "sku", "status", "is_featured",
            "weight_kg", "meta_title", "meta_description",
        ]

    def validate(self, attrs: dict) -> dict:
        compare_at = attrs.get("compare_at_price")
        base = attrs.get("base_price", getattr(self.instance, "base_price", None))
        if compare_at is not None and base is not None and compare_at <= base:
            raise serializers.ValidationError(
                {"compare_at_price": "Compare-at price must be greater than base price."}
            )
        return attrs

    def validate_base_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Base price cannot be negative.")
        return value


class AdminProductListSerializer(serializers.ModelSerializer):
    """Admin product list — category/brand as FK IDs + denormalised display names.

    Returns ``category`` and ``brand`` as integer PKs (matching the frontend
    ``Product`` type) rather than nested objects, so the edit form can
    pre-populate dropdowns directly.
    """

    category_name = serializers.CharField(source="category.name", read_only=True, default=None)
    brand_name = serializers.CharField(source="brand.name", read_only=True, default=None)
    primary_image = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id", "name", "slug", "category", "category_name",
            "brand", "brand_name", "short_description", "base_price",
            "compare_at_price", "sku", "status", "is_featured",
            "average_rating", "review_count", "primary_image",
            "created_at", "updated_at",
        ]

    def get_primary_image(self, obj) -> dict | None:
        images = obj.images.all()
        img = next((i for i in images if i.is_primary), None) or next(iter(images), None)
        if img:
            return ProductImageSerializer(img, context=self.context).data
        return None


class CategoryWriteSerializer(serializers.ModelSerializer):
    """Writable serializer for Category — staff admin use only."""

    class Meta:
        model = Category
        fields = [
            "name", "slug", "parent", "description", "image",
            "display_order", "meta_title", "meta_description",
        ]


class BrandWriteSerializer(serializers.ModelSerializer):
    """Writable serializer for Brand — staff admin use only."""

    class Meta:
        model = Brand
        fields = ["name", "slug", "logo", "description"]


# ── Admin write serializers ────────────────────────────────────────────────────

_ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
_MAX_IMAGE_SIZE = 5 * 1024 * 1024   # 5 MB
_MAX_BANNER_SIZE = 10 * 1024 * 1024  # 10 MB


class ProductVariantWriteSerializer(serializers.ModelSerializer):
    """Writable serializer for ProductVariant — staff admin use only."""

    attribute_values = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=AttributeValue.objects.all(),
        required=False,
    )

    class Meta:
        model = ProductVariant
        fields = ["sku", "price_override", "is_active", "attribute_values"]

    def validate_sku(self, value: str) -> str:
        qs = ProductVariant.objects.filter(sku__iexact=value)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A variant with this SKU already exists (case-insensitive).")
        return value

    def validate_price_override(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Price override must be >= 0.")
        return value


class ProductImageUploadSerializer(serializers.ModelSerializer):
    """Serializer for creating a ProductImage via upload or external URL."""

    image = serializers.ImageField(required=False, allow_null=True)
    external_url = serializers.URLField(required=False, allow_blank=True)

    class Meta:
        model = ProductImage
        fields = ["image", "external_url", "alt_text", "display_order", "is_primary"]

    def validate_image(self, value):
        if value is None:
            return value
        content_type = getattr(value, "content_type", None)
        if content_type and content_type not in _ALLOWED_IMAGE_TYPES:
            raise serializers.ValidationError(
                "Unsupported image type. Only JPEG, PNG, and WebP are allowed."
            )
        if value.size > _MAX_IMAGE_SIZE:
            raise serializers.ValidationError("Image file size must not exceed 5 MB.")
        return value

    def validate(self, attrs: dict) -> dict:
        image = attrs.get("image")
        external_url = attrs.get("external_url", "")
        if not image and not external_url:
            raise serializers.ValidationError(
                "At least one of 'image' or 'external_url' must be provided."
            )
        return attrs


class ProductImageUpdateSerializer(serializers.ModelSerializer):
    """Serializer for partial updates on ProductImage (PATCH)."""

    class Meta:
        model = ProductImage
        fields = ["alt_text", "display_order", "is_primary"]
        extra_kwargs = {
            "alt_text": {"required": False},
            "display_order": {"required": False},
            "is_primary": {"required": False},
        }


class BannerWriteSerializer(serializers.ModelSerializer):
    """Writable serializer for Banner — staff admin use only."""

    class Meta:
        model = Banner
        fields = [
            "title", "subtitle", "eyebrow", "image", "cta_text", "cta_link",
            "secondary_cta_text", "secondary_cta_link", "display_order", "is_active",
        ]

    def validate_image(self, value):
        if value is None:
            return value
        content_type = getattr(value, "content_type", None)
        if content_type and content_type not in _ALLOWED_IMAGE_TYPES:
            raise serializers.ValidationError(
                "Unsupported image type. Only JPEG, PNG, and WebP are allowed."
            )
        if value.size > _MAX_BANNER_SIZE:
            raise serializers.ValidationError("Banner image file size must not exceed 10 MB.")
        return value
