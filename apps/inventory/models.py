from __future__ import annotations

from django.db import models

from apps.common.models import TimeStampedModel
from apps.inventory.constants import MovementType


class Warehouse(models.Model):
    """Physical warehouse location.

    V1 typically has exactly one row; the model exists so multi-warehouse
    is a config change (adding rows), not a schema migration.
    """
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=50, unique=True)
    address_line_1 = models.CharField(max_length=255, blank=True)
    address_line_2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state_province = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=2, blank=True)
    is_default = models.BooleanField(default=False)

    class Meta:
        verbose_name = "warehouse"
        verbose_name_plural = "warehouses"

    def __str__(self) -> str:
        return self.name


class StockItem(TimeStampedModel):
    """Stock level for a specific (variant, warehouse) pair.

    Using FK + unique_together instead of OneToOne so multi-warehouse is
    truly just adding rows without a schema change.
    """
    variant = models.ForeignKey(
        "catalog.ProductVariant",
        on_delete=models.CASCADE,
        related_name="stock_items",
    )
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name="stock_items")
    quantity_on_hand = models.PositiveIntegerField(default=0)
    quantity_reserved = models.PositiveIntegerField(default=0)
    low_stock_threshold = models.PositiveIntegerField(default=5)

    class Meta:
        unique_together = [("variant", "warehouse")]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(quantity_on_hand__gte=0),
                name="stock_item_qty_on_hand_gte_0",
            ),
            models.CheckConstraint(
                condition=models.Q(quantity_reserved__gte=0),
                name="stock_item_qty_reserved_gte_0",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.variant.sku} @ {self.warehouse.code}: {self.quantity_available} available"

    @property
    def quantity_available(self) -> int:
        return max(0, self.quantity_on_hand - self.quantity_reserved)

    @property
    def is_low_stock(self) -> bool:
        return self.quantity_available <= self.low_stock_threshold

    @property
    def is_out_of_stock(self) -> bool:
        return self.quantity_on_hand == 0


class StockMovement(models.Model):
    """Append-only audit log for all stock changes.

    Rows are NEVER updated or deleted — only inserted.
    """
    stock_item = models.ForeignKey(StockItem, on_delete=models.CASCADE, related_name="movements")
    movement_type = models.CharField(max_length=30, choices=MovementType.choices)
    quantity_delta = models.IntegerField()
    reference = models.CharField(max_length=100, blank=True)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "stock movement"
        verbose_name_plural = "stock movements"

    def __str__(self) -> str:
        return f"{self.movement_type} {self.quantity_delta:+d} on {self.stock_item}"
