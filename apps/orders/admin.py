from __future__ import annotations
from django.contrib import admin
from apps.orders.constants import OrderStatus
from apps.orders.exceptions import InvalidOrderTransitionError
from apps.orders.models import Order, OrderItem, OrderStatusHistory
from apps.orders.services import transition_order_status


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ["product_name_snapshot", "variant_attributes_snapshot", "unit_price_snapshot", "quantity", "line_total"]
    can_delete = False

    def has_add_permission(self, request, obj=None) -> bool:
        return False


class OrderStatusHistoryInline(admin.TabularInline):
    model = OrderStatusHistory
    extra = 0
    readonly_fields = ["from_status", "to_status", "changed_by", "note", "created_at"]
    can_delete = False
    ordering = ["created_at"]

    def has_add_permission(self, request, obj=None) -> bool:
        return False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ["order_number", "user", "status", "payment_status", "grand_total", "placed_at"]
    list_filter = ["status", "payment_status"]
    search_fields = ["order_number", "user__email"]
    readonly_fields = [
        "order_number", "user", "status", "payment_status", "subtotal",
        "discount_total", "shipping_cost", "tax_total", "grand_total",
        "coupon_code_snapshot", "shipping_address_snapshot", "billing_address_snapshot",
        "placed_at", "created_at", "updated_at",
    ]
    inlines = [OrderItemInline, OrderStatusHistoryInline]
    actions = ["mark_as_shipped", "mark_as_delivered"]
    raw_id_fields = ["user", "coupon"]

    def has_delete_permission(self, request, obj=None) -> bool:
        return False

    def mark_as_shipped(self, request, queryset):
        for order in queryset:
            try:
                transition_order_status(order, OrderStatus.SHIPPED, actor=request.user, note="Marked as shipped via admin.")
            except InvalidOrderTransitionError as exc:
                self.message_user(request, f"Order {order.order_number}: {exc.message}", level="error")
        self.message_user(request, "Orders marked as shipped.")
    mark_as_shipped.short_description = "Mark selected orders as shipped"

    def mark_as_delivered(self, request, queryset):
        for order in queryset:
            try:
                transition_order_status(order, OrderStatus.DELIVERED, actor=request.user, note="Marked as delivered via admin.")
            except InvalidOrderTransitionError as exc:
                self.message_user(request, f"Order {order.order_number}: {exc.message}", level="error")
        self.message_user(request, "Orders marked as delivered.")
    mark_as_delivered.short_description = "Mark selected orders as delivered"
