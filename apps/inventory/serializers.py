from __future__ import annotations
from rest_framework import serializers
from apps.inventory.models import StockItem, StockMovement, Warehouse


class WarehouseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Warehouse
        fields = ["id", "name", "code", "city", "country", "is_default"]


class StockItemSerializer(serializers.ModelSerializer):
    variant_sku = serializers.CharField(source="variant.sku", read_only=True)
    product_name = serializers.CharField(source="variant.product.name", read_only=True)
    warehouse_name = serializers.CharField(source="warehouse.name", read_only=True)
    quantity_available = serializers.IntegerField(read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = StockItem
        fields = [
            "id", "variant_sku", "product_name", "warehouse_name",
            "quantity_on_hand", "quantity_reserved", "quantity_available",
            "low_stock_threshold", "is_low_stock", "updated_at",
        ]
        read_only_fields = ["id", "quantity_reserved", "updated_at"]


class RestockSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1)
    reference = serializers.CharField(max_length=100, required=False, default="")
    note = serializers.CharField(max_length=500, required=False, default="")


class StockMovementSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockMovement
        fields = [
            "id", "movement_type", "quantity_delta", "reference", "note",
            "created_at", "created_by",
        ]


class StockThresholdSerializer(serializers.Serializer):
    """Update only the low_stock_threshold of a StockItem."""

    low_stock_threshold = serializers.IntegerField(min_value=0)


class ManualAdjustmentSerializer(serializers.Serializer):
    """Validate a manual stock adjustment request."""

    quantity_delta = serializers.IntegerField()
    reason = serializers.CharField(max_length=200)
    note = serializers.CharField(max_length=500, required=False, default="")

    def validate_quantity_delta(self, value: int) -> int:
        if value == 0:
            raise serializers.ValidationError("quantity_delta must not be zero.")
        return value
