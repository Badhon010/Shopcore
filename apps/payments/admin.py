from __future__ import annotations

from django.contrib import admin

from apps.payments.models import (
    ManualPaymentSubmission,
    Payment,
    PaymentEventLog,
    PaymentMethod,
    Refund,
)


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


@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = ["provider", "name", "is_enabled", "sort_order", "is_sandbox"]
    list_filter = ["is_enabled", "is_sandbox", "provider"]
    search_fields = ["provider", "name", "account_number", "account_name"]

    fieldsets = (
        (None, {"fields": ("provider", "name", "description", "is_enabled", "sort_order")}),
        (
            "Manual payment details",
            {
                "fields": (
                    "instructions",
                    "account_number",
                    "account_name",
                    "qr_image",
                    "payment_notes",
                )
            },
        ),
        ("Gateway configuration", {"fields": ("is_sandbox", "gateway_config")}),
    )


@admin.register(Refund)
class RefundAdmin(admin.ModelAdmin):
    list_display = ["id", "order", "amount", "currency", "status", "created_by", "refunded_at"]
    list_filter = ["status", "currency"]
    search_fields = ["order__order_number", "reason"]
    readonly_fields = [
        "order", "payment", "amount", "currency", "reason", "status", "created_by",
        "refunded_at", "created_at", "updated_at",
    ]

    def has_delete_permission(self, request, obj=None) -> bool:
        return False

    def has_add_permission(self, request) -> bool:
        return False


@admin.register(PaymentEventLog)
class PaymentEventLogAdmin(admin.ModelAdmin):
    list_display = ["id", "provider", "event_id", "event_type", "payment", "status", "created_at"]
    list_filter = ["provider", "status", "event_type"]
    search_fields = ["event_id", "event_type", "payment__order__order_number"]
    readonly_fields = [
        "provider", "event_id", "event_type", "payload_hash", "payment",
        "status", "raw_payload", "created_at", "updated_at",
    ]

    def has_delete_permission(self, request, obj=None) -> bool:
        return False

    def has_add_permission(self, request) -> bool:
        return False


@admin.register(ManualPaymentSubmission)
class ManualPaymentSubmissionAdmin(admin.ModelAdmin):
    list_display = ["id", "order", "user", "reference_number", "method", "status", "created_at"]
    list_filter = ["status", "method"]
    search_fields = ["order__order_number", "reference_number", "user__email"]
    readonly_fields = [
        "order", "user", "method", "reference_number", "receipt", "notes", "status",
        "admin_note", "reviewed_by", "reviewed_at", "payment", "created_at", "updated_at",
    ]
