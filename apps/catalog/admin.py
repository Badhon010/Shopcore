"""Admin configuration for the catalog app."""
from __future__ import annotations

from django.contrib import admin
from django.utils.html import format_html

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


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 0
    fields = ["image", "thumbnail_preview", "alt_text", "display_order", "is_primary"]
    readonly_fields = ["thumbnail_preview"]

    def thumbnail_preview(self, obj) -> str:
        if obj.image:
            return format_html('<img src="{}" height="60" />', obj.image.url)
        return "—"
    thumbnail_preview.short_description = "Preview"


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 0
    fields = ["sku", "price_override", "is_active"]
    autocomplete_fields = []


@admin.register(Banner)
class BannerAdmin(admin.ModelAdmin):
    list_display = ["title", "eyebrow", "display_order", "is_active", "preview"]
    list_filter = ["is_active"]
    list_editable = ["display_order", "is_active"]
    search_fields = ["title", "subtitle"]

    def preview(self, obj) -> str:
        if obj.image:
            return format_html('<img src="{}" height="40" />', obj.image.url)
        return "—"
    preview.short_description = "Preview"


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ["name", "sku", "category", "base_price", "status", "is_active", "is_featured", "review_count"]
    list_filter = ["category", "brand", "is_active", "status", "is_featured"]
    search_fields = ["name", "sku", "description"]
    autocomplete_fields = ["category", "brand"]
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = ["average_rating", "review_count", "created_at", "updated_at"]
    inlines = [ProductImageInline, ProductVariantInline]
    actions = ["mark_as_featured", "mark_as_archived", "mark_as_published"]

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related("category", "brand")
            .prefetch_related("images", "variants")
        )

    def mark_as_featured(self, request, queryset):
        queryset.update(is_featured=True)
        self.message_user(request, f"{queryset.count()} products marked as featured.")
    mark_as_featured.short_description = "Mark selected as featured"

    def mark_as_archived(self, request, queryset):
        from apps.catalog.constants import ProductStatus
        queryset.update(status=ProductStatus.ARCHIVED)
        self.message_user(request, f"{queryset.count()} products archived.")
    mark_as_archived.short_description = "Archive selected products"

    def mark_as_published(self, request, queryset):
        from apps.catalog.constants import ProductStatus
        queryset.update(status=ProductStatus.PUBLISHED)
        self.message_user(request, f"{queryset.count()} products published.")
    mark_as_published.short_description = "Publish selected products"


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "parent", "is_active", "display_order"]
    list_filter = ["is_active", "parent"]
    search_fields = ["name", "slug"]
    prepopulated_fields = {"slug": ("name",)}
    autocomplete_fields = ["parent"]


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "is_active"]
    search_fields = ["name"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Attribute)
class AttributeAdmin(admin.ModelAdmin):
    list_display = ["name", "slug"]
    search_fields = ["name"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(AttributeValue)
class AttributeValueAdmin(admin.ModelAdmin):
    list_display = ["attribute", "value", "display_order"]
    list_filter = ["attribute"]
    autocomplete_fields = ["attribute"]
