from __future__ import annotations
from django.contrib import admin
from apps.reviews.models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ["product", "user", "rating", "is_verified_purchase", "is_approved", "created_at"]
    list_filter = ["rating", "is_approved", "is_verified_purchase"]
    search_fields = ["product__name", "user__email", "title"]
    readonly_fields = ["product", "user", "is_verified_purchase", "created_at"]
    actions = ["approve_reviews", "hide_reviews"]
    raw_id_fields = ["product", "user"]

    def approve_reviews(self, request, queryset):
        queryset.update(is_approved=True)
    approve_reviews.short_description = "Approve selected reviews"

    def hide_reviews(self, request, queryset):
        queryset.update(is_approved=False)
    hide_reviews.short_description = "Hide selected reviews"
