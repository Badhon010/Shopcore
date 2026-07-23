"""Admin configuration for the newsletter app."""
from __future__ import annotations

from django.contrib import admin

from apps.newsletter.models import NewsletterSubscriber


@admin.register(NewsletterSubscriber)
class NewsletterSubscriberAdmin(admin.ModelAdmin):
    list_display = ["email", "active", "created_at", "updated_at"]
    list_filter = ["active"]
    search_fields = ["email"]
    readonly_fields = ["created_at", "updated_at"]
    ordering = ["-created_at"]

    actions = ["deactivate_subscribers", "reactivate_subscribers"]

    @admin.action(description="Deactivate selected subscribers")
    def deactivate_subscribers(self, request, queryset):
        updated = queryset.filter(active=True).update(active=False)
        self.message_user(request, f"{updated} subscriber(s) deactivated.")

    @admin.action(description="Reactivate selected subscribers")
    def reactivate_subscribers(self, request, queryset):
        updated = queryset.filter(active=False).update(active=True)
        self.message_user(request, f"{updated} subscriber(s) reactivated.")
