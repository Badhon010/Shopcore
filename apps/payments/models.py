from __future__ import annotations

import os

from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel
from apps.payments.constants import PaymentProvider, PaymentStatus


def _default_currency() -> str:
    """Default ISO 4217 currency — reads the store's configured default (BDT)."""
    return getattr(settings, "DEFAULT_CURRENCY", "BDT")


def payment_method_qr_upload_path(instance, filename: str) -> str:
    ext = os.path.splitext(filename)[1].lower()
    return f"payment_methods/{instance.provider}/qr{ext}"


def payment_receipt_upload_path(instance, filename: str) -> str:
    base, ext = os.path.splitext(filename)
    return f"payment_receipts/{instance.order_id}/{base or 'receipt'}{ext.lower()}"


class PaymentMethod(TimeStampedModel):
    """A payment method the store offers, configurable by an admin.

    One row per PaymentProvider. Enabling a method exposes it to the
    storefront; disabling hides it. Manual methods (MANUAL, BANK_TRANSFER,
    BKASH, NAGAD, ROCKET) carry the customer-facing details needed to pay
    offline: instructions, account number/name, QR image, and payment notes.
    Gateway-backed methods (SSLCOMMERZ, STRIPE, PAYPAL) may carry non-secret
    configuration in ``gateway_config`` (secrets stay in environment
    variables). ``is_sandbox`` marks test-mode configuration.
    """

    provider = models.CharField(
        max_length=20, choices=PaymentProvider.choices, unique=True
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    is_enabled = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)
    # Manual-method customer-facing details
    instructions = models.TextField(
        blank=True, help_text="Step-by-step instructions shown to the customer at checkout."
    )
    account_number = models.CharField(max_length=100, blank=True)
    account_name = models.CharField(max_length=150, blank=True)
    qr_image = models.ImageField(
        upload_to=payment_method_qr_upload_path, null=True, blank=True
    )
    payment_notes = models.TextField(blank=True, help_text="Extra notes shown with the method.")
    # Gateway configuration
    is_sandbox = models.BooleanField(default=True)
    gateway_config = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["sort_order", "provider"]
        verbose_name = "payment method"
        verbose_name_plural = "payment methods"

    def __str__(self) -> str:
        return f"{self.name} ({self.provider})"


class Refund(TimeStampedModel):
    """A refund record for a paid order (audit C-2).

    Created when staff process a refund. The associated order is transitioned
    to REFUNDED and its committed sale is restocked to inventory. The Payment
    row for the order is marked REFUNDED.
    """

    class Status(models.TextChoices):
        SUCCEEDED = "SUCCEEDED", "Succeeded"
        FAILED = "FAILED", "Failed"

    order = models.ForeignKey(
        "orders.Order", on_delete=models.PROTECT, related_name="refunds"
    )
    payment = models.ForeignKey(
        "payments.Payment", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="refunds",
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default=_default_currency)
    reason = models.TextField(blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.SUCCEEDED
    )
    created_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="issued_refunds",
    )
    refunded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-refunded_at"]
        verbose_name = "refund"
        verbose_name_plural = "refunds"

    def __str__(self) -> str:
        return f"Refund {self.pk} for {self.order.order_number} ({self.amount} {self.currency})"


class ManualPaymentSubmission(TimeStampedModel):
    """A customer's offline payment submission (audit H-2).

    Created when a customer pays via a manual method (bank transfer, bKash,
    Nagad, Rocket, …) and uploads a reference number / receipt. Staff review
    it: approving records a successful Payment and marks the order PAID;
    rejecting leaves the order unpaid so the customer can resubmit.
    """

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"

    order = models.ForeignKey(
        "orders.Order", on_delete=models.PROTECT, related_name="payment_submissions"
    )
    user = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="payment_submissions",
    )
    method = models.ForeignKey(
        PaymentMethod, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="submissions",
    )
    reference_number = models.CharField(max_length=255)
    receipt = models.FileField(
        upload_to=payment_receipt_upload_path, null=True, blank=True
    )
    notes = models.TextField(blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    admin_note = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="reviewed_payment_submissions",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    payment = models.ForeignKey(
        "payments.Payment", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="+",
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "manual payment submission"
        verbose_name_plural = "manual payment submissions"

    def __str__(self) -> str:
        return f"{self.reference_number} for {self.order.order_number} ({self.status})"


class Payment(TimeStampedModel):
    """A payment record tied to an order.

    Designed as a gateway-agnostic abstraction.  The ``raw_response`` JSONField
    stores the gateway's full payload for audit/debugging.  See
    ``payments/gateways/`` for the gateway interface.
    """
    order = models.ForeignKey(
        "orders.Order", on_delete=models.PROTECT, related_name="payments"
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default=_default_currency)
    provider = models.CharField(
        max_length=20, choices=PaymentProvider.choices, default=PaymentProvider.MANUAL
    )
    provider_transaction_id = models.CharField(
        max_length=255, blank=True, null=True, unique=True
    )
    status = models.CharField(
        max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.INITIATED
    )
    raw_response = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            # DB-level backstop against duplicate successful payments for the
            # same order (in addition to the application-layer guard in
            # payments/services.py::initiate_payment()). Two concurrent
            # initiate calls can both pass the app-layer check; only one of
            # them can win this constraint.
            models.UniqueConstraint(
                fields=["order"],
                condition=models.Q(status=PaymentStatus.SUCCEEDED),
                name="unique_succeeded_payment_per_order",
            ),
        ]

    def __str__(self) -> str:
        return f"Payment {self.pk} for {self.order.order_number} ({self.status})"


class PaymentEventLog(TimeStampedModel):
    """Idempotency + audit log for gateway webhook events (audit S-6, H-3).

    Every verified webhook event is recorded here keyed by (provider,
    event_id). If the same event arrives again (gateway retries, network
    redelivery), the unique constraint short-circuits it so a payment is
    never recorded twice. Also serves as the transaction log for the
    payments dashboard.
    """

    provider = models.CharField(max_length=20, choices=PaymentProvider.choices)
    event_id = models.CharField(max_length=255)
    event_type = models.CharField(max_length=100)
    payload_hash = models.CharField(max_length=64, blank=True)
    payment = models.ForeignKey(
        Payment, on_delete=models.SET_NULL, null=True, blank=True, related_name="event_logs"
    )
    status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.INITIATED,
    )
    raw_payload = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["provider", "event_id"],
                name="unique_gateway_event_per_provider",
            ),
        ]
        verbose_name = "payment event log"
        verbose_name_plural = "payment event logs"

    def __str__(self) -> str:
        return f"{self.provider}:{self.event_id} ({self.event_type} → {self.status})"
