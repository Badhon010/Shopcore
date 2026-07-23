"""Admin configuration for the contact app."""
from __future__ import annotations

from django.contrib import admin

from apps.contact.models import ContactMessage


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ["name", "email", "subject", "status", "created_at"]
    list_filter = ["status"]
    search_fields = ["name", "email", "subject", "message"]
    readonly_fields = ["name", "email", "subject", "message", "created_at", "updated_at"]
    ordering = ["-created_at"]
    list_editable = ["status"]

    def has_add_permission(self, request) -> bool:
        return False
