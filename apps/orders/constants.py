from __future__ import annotations

from django.db import models


class OrderStatus(models.TextChoices):
    PENDING_PAYMENT = "PENDING_PAYMENT", "Pending Payment"
    PAID = "PAID", "Paid"
    PROCESSING = "PROCESSING", "Processing"
    SHIPPED = "SHIPPED", "Shipped"
    DELIVERED = "DELIVERED", "Delivered"
    CANCELLED = "CANCELLED", "Cancelled"
    REFUNDED = "REFUNDED", "Refunded"


class PaymentStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    PAID = "PAID", "Paid"
    FAILED = "FAILED", "Failed"
    REFUNDED = "REFUNDED", "Refunded"


# Legal order status transitions.
#
# Policy (audit C-1 / B-4): a paid order (PAID, PROCESSING, SHIPPED,
# DELIVERED) can NEVER be cancelled — the only termination path for paid
# money is REFUNDED, which goes through the refund flow (C-2) and restocks
# inventory. CANCELLED is reserved for unpaid (PENDING_PAYMENT) orders, which
# release their stock reservations instead of restocking.
ALLOWED_TRANSITIONS: dict[str, list[str]] = {
    OrderStatus.PENDING_PAYMENT: [OrderStatus.PAID, OrderStatus.CANCELLED],
    OrderStatus.PAID: [OrderStatus.PROCESSING, OrderStatus.REFUNDED],
    OrderStatus.PROCESSING: [OrderStatus.SHIPPED, OrderStatus.REFUNDED],
    OrderStatus.SHIPPED: [OrderStatus.DELIVERED],
    OrderStatus.DELIVERED: [OrderStatus.REFUNDED],
    OrderStatus.CANCELLED: [],
    OrderStatus.REFUNDED: [],
}
