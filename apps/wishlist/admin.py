from __future__ import annotations
from django.contrib import admin
from apps.wishlist.models import Wishlist, WishlistItem


class WishlistItemInline(admin.TabularInline):
    model = WishlistItem
    extra = 0
    raw_id_fields = ["product"]


@admin.register(Wishlist)
class WishlistAdmin(admin.ModelAdmin):
    list_display = ["user", "item_count"]
    search_fields = ["user__email"]
    inlines = [WishlistItemInline]

    def item_count(self, obj) -> int:
        return obj.items.count()
