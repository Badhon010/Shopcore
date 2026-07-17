from __future__ import annotations
from django.contrib import admin
from apps.payments.models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["id", "order", "amount", "currency", "provider", "status", "created_at"]
    list_filter = ["provider", "status", "currency"]
    search_fields = ["order__order_number", "provider_transaction_id"]
    readonly_fields = ["order", "amount", "currency", "provider", "provider_transaction_id", "status", "raw_response", "created_at", "updated_at"]
    raw_id_fields = []

    def has_delete_permission(self, request, obj=None) -> bool:
        return False

    def has_add_permission(self, request) -> bool:
        return False
