from __future__ import annotations
from rest_framework import serializers
from apps.orders.models import Order, OrderItem, OrderStatusHistory


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = [
            "id", "product_name_snapshot", "variant_attributes_snapshot",
            "unit_price_snapshot", "quantity", "line_total",
        ]


class OrderStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_email = serializers.SerializerMethodField()

    class Meta:
        model = OrderStatusHistory
        fields = ["id", "from_status", "to_status", "changed_by_email", "note", "created_at"]

    def get_changed_by_email(self, obj) -> str | None:
        return obj.changed_by.email if obj.changed_by else None


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    status_history = OrderStatusHistorySerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id", "order_number", "status", "payment_status",
            "shipping_address_snapshot", "billing_address_snapshot",
            "subtotal", "discount_total", "shipping_cost", "tax_total", "grand_total",
            "coupon_code_snapshot", "notes", "placed_at",
            "items", "status_history",
        ]
        read_only_fields = [f.name for f in Order._meta.fields]


class CheckoutSerializer(serializers.Serializer):
    shipping_address_id = serializers.IntegerField()
    billing_address_id = serializers.IntegerField(required=False)
    coupon_code = serializers.CharField(required=False, allow_blank=True, default="")
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    idempotency_key = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_shipping_address_id(self, value: int) -> int:
        from apps.accounts.models import Address
        request = self.context.get("request")
        if not Address.objects.filter(pk=value, user=request.user).exists():
            raise serializers.ValidationError("Shipping address not found.")
        return value

    def validate_billing_address_id(self, value: int) -> int:
        from apps.accounts.models import Address
        request = self.context.get("request")
        if not Address.objects.filter(pk=value, user=request.user).exists():
            raise serializers.ValidationError("Billing address not found.")
        return value
