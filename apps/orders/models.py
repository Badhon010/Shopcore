from __future__ import annotations

import secrets

from django.db import models

from apps.common.models import TimeStampedModel
from apps.orders.constants import OrderStatus, PaymentStatus


def generate_guest_lookup_token() -> str:
    """Generate a cryptographically-secure guest lookup token.

    Shown once to the guest after checkout; it is the bearer secret (together
    with the order number) for guest tracking/cancellation. Stored only as a
    hash so a DB leak does not expose working lookup tokens (audit S-5 / H-4).
    """
    return secrets.token_urlsafe(32)


class Order(TimeStampedModel):
    """An immutable order created from a Cart at checkout.

    Financial snapshot fields (subtotal, grand_total, etc.) are computed
    once at order creation and NEVER recomputed from live prices afterward.
    The shipping_address_snapshot and billing_address_snapshot JSON fields
    are the source of truth for display — the FK is kept for navigation only.
    """
    order_number = models.CharField(max_length=50, unique=True)
    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
        help_text="Owner of the order. NULL for guest (anonymous) orders — guest "
        "identity is stored in the guest_* fields instead (audit H-4).",
    )
    status = models.CharField(
        max_length=20, choices=OrderStatus.choices, default=OrderStatus.PENDING_PAYMENT
    )
    payment_status = models.CharField(
        max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.PENDING
    )

    # Address snapshots (source of truth even if address is later edited/deleted)
    shipping_address = models.ForeignKey(
        "accounts.Address", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="shipping_orders",
    )
    shipping_address_snapshot = models.JSONField(default=dict)
    billing_address_snapshot = models.JSONField(default=dict)

    # Financial totals — frozen at order creation
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    discount_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    shipping_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    grand_total = models.DecimalField(max_digits=10, decimal_places=2)

    # Coupon
    coupon = models.ForeignKey(
        "coupons.Coupon", on_delete=models.SET_NULL, null=True, blank=True
    )
    coupon_code_snapshot = models.CharField(max_length=50, blank=True)

    notes = models.TextField(blank=True)
    placed_at = models.DateTimeField(auto_now_add=True)

    # Guest identity — populated ONLY for guest (user=None) orders (audit H-4).
    # guest_email/guest_phone act as part of the lookup secret; guest_lookup_token
    # is stored as a hash. Guests look up their order with:
    #   Order Number + Phone  OR  Order Number + Email + Lookup Token
    guest_name = models.CharField(max_length=255, blank=True)
    guest_email = models.EmailField(blank=True)
    guest_phone = models.CharField(max_length=20, blank=True)
    guest_session_id = models.CharField(max_length=40, blank=True, db_index=True)
    guest_lookup_token = models.CharField(max_length=128, blank=True, db_index=True)

    # Idempotency key to prevent double-orders from frontend retries.
    # Scoped to (user, idempotency_key) for registered orders — NOT globally
    # unique — so a key can never be used to look up or return another user's
    # order. Guest orders are scoped to (guest_session_id, idempotency_key).
    idempotency_key = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        ordering = ["-placed_at"]
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["order_number"]),
            models.Index(fields=["guest_session_id", "status"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "idempotency_key"],
                condition=models.Q(idempotency_key__isnull=False, user__isnull=False),
                name="unique_user_idempotency_key",
            ),
            models.UniqueConstraint(
                fields=["guest_session_id", "idempotency_key"],
                # guest_session_id is a CharField defaulting to "" — exclude
                # empty values so the constraint only applies to real guest
                # orders (registered orders always have guest_session_id="").
                condition=models.Q(
                    idempotency_key__isnull=False,
                ) & ~models.Q(guest_session_id=""),
                name="unique_guest_session_idempotency_key",
            ),
        ]

    @property
    def customer_display_name(self) -> str:
        """Human-readable customer identity for admin/UI display."""
        if self.user is not None:
            return self.user.full_name or self.user.email
        return self.guest_name or self.guest_email or f"Guest #{self.order_number}"

    @property
    def customer_email(self) -> str:
        if self.user is not None:
            return self.user.email
        return self.guest_email

    @property
    def is_guest_order(self) -> bool:
        return self.user_id is None

    def __str__(self) -> str:
        return self.order_number


class OrderItem(models.Model):
    """An immutable line item within an order.

    All snapshot fields preserve the state at order creation time.
    """
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    variant = models.ForeignKey(
        "catalog.ProductVariant", on_delete=models.PROTECT, related_name="order_items"
    )
    product_name_snapshot = models.CharField(max_length=500)
    variant_attributes_snapshot = models.JSONField(default=dict)
    unit_price_snapshot = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField()
    line_total = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        constraints = [
            models.CheckConstraint(condition=models.Q(quantity__gte=1), name="order_item_qty_gte_1"),
        ]

    def __str__(self) -> str:
        return f"{self.quantity}x {self.product_name_snapshot} in {self.order.order_number}"


class OrderStatusHistory(models.Model):
    """Append-only audit trail of order status changes."""
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="status_history")
    from_status = models.CharField(max_length=20, blank=True)
    to_status = models.CharField(max_length=20)
    changed_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True
    )
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"{self.order.order_number}: {self.from_status} → {self.to_status}"
