from __future__ import annotations
from django.contrib import admin
from django.utils.html import format_html
from apps.inventory.models import StockItem, StockMovement, Warehouse


@admin.register(Warehouse)
class WarehouseAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "city", "country", "is_default"]
    search_fields = ["name", "code"]


class StockMovementInline(admin.TabularInline):
    model = StockMovement
    extra = 0
    readonly_fields = ["movement_type", "quantity_delta", "reference", "note", "created_at", "created_by"]
    can_delete = False

    def has_add_permission(self, request, obj=None) -> bool:
        return False


@admin.register(StockItem)
class StockItemAdmin(admin.ModelAdmin):
    list_display = [
        "variant_sku", "product_name", "warehouse", "quantity_on_hand",
        "quantity_reserved", "quantity_available_display", "low_stock_threshold", "stock_status",
    ]
    list_filter = ["warehouse"]
    search_fields = ["variant__sku", "variant__product__name"]
    readonly_fields = ["quantity_available_display", "updated_at"]
    inlines = [StockMovementInline]
    actions = ["bump_low_stock_threshold"]
    raw_id_fields = ["variant"]

    def variant_sku(self, obj) -> str:
        return obj.variant.sku

    def product_name(self, obj) -> str:
        return obj.variant.product.name

    def quantity_available_display(self, obj) -> int:
        return obj.quantity_available
    quantity_available_display.short_description = "Available"

    def stock_status(self, obj) -> str:
        if obj.quantity_available == 0:
            return format_html('<span style="color:red;font-weight:bold">OUT</span>')
        if obj.is_low_stock:
            return format_html('<span style="color:orange;font-weight:bold">LOW</span>')
        return format_html('<span style="color:green">OK</span>')
    stock_status.short_description = "Status"

    def bump_low_stock_threshold(self, request, queryset):
        queryset.update(low_stock_threshold=10)
        self.message_user(request, "Updated low-stock threshold to 10.")
    bump_low_stock_threshold.short_description = "Set low-stock threshold to 10"

    def has_delete_permission(self, request, obj=None) -> bool:
        return False


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ["stock_item", "movement_type", "quantity_delta", "reference", "created_at", "created_by"]
    list_filter = ["movement_type"]
    search_fields = ["reference", "stock_item__variant__sku"]
    readonly_fields = ["stock_item", "movement_type", "quantity_delta", "reference", "note", "created_at", "created_by"]

    def has_add_permission(self, request) -> bool:
        return False

    def has_delete_permission(self, request, obj=None) -> bool:
        return False

    def has_change_permission(self, request, obj=None) -> bool:
        return False
