from __future__ import annotations
from django.db import models
from apps.common.models import TimeStampedModel
from apps.orders.constants import OrderStatus, PaymentStatus


class Order(TimeStampedModel):
    """An immutable order created from a Cart at checkout.

    Financial snapshot fields (subtotal, grand_total, etc.) are computed
    once at order creation and NEVER recomputed from live prices afterward.
    The shipping_address_snapshot and billing_address_snapshot JSON fields
    are the source of truth for display — the FK is kept for navigation only.
    """
    order_number = models.CharField(max_length=50, unique=True)
    user = models.ForeignKey(
        "accounts.User", on_delete=models.PROTECT, related_name="orders"
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

    # Idempotency key to prevent double-orders from frontend retries.
    # Scoped to (user, idempotency_key) — NOT globally unique — so a key can
    # never be used to look up or return another user's order.
    idempotency_key = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        ordering = ["-placed_at"]
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["order_number"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "idempotency_key"],
                condition=models.Q(idempotency_key__isnull=False),
                name="unique_user_idempotency_key",
            ),
        ]

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
