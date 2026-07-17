from __future__ import annotations
from django.contrib import admin
from apps.cart.models import Cart, CartItem


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0
    fields = ["variant", "quantity", "unit_price_snapshot"]
    raw_id_fields = ["variant"]


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "session_key", "is_active", "created_at"]
    list_filter = ["is_active"]
    search_fields = ["user__email", "session_key"]
    inlines = [CartItemInline]
    raw_id_fields = ["user"]
