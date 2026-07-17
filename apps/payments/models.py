from __future__ import annotations
from django.db import models
from apps.common.models import TimeStampedModel
from apps.payments.constants import PaymentProvider, PaymentStatus


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
    currency = models.CharField(max_length=3, default="USD")
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
