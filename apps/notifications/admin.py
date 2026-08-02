from __future__ import annotations

from django.contrib import admin

from apps.notifications.models import NotificationLog


@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    list_display = ["notification_type", "recipient", "status", "sent_at"]
    list_filter = ["notification_type", "status", "channel"]
    search_fields = ["recipient", "subject"]
    readonly_fields = [f.name for f in NotificationLog._meta.fields]

    def has_add_permission(self, request) -> bool:
        return False

    def has_delete_permission(self, request, obj=None) -> bool:
        return False

    def has_change_permission(self, request, obj=None) -> bool:
        return False
