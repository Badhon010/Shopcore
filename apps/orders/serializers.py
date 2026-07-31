from __future__ import annotations
from rest_framework import serializers
from apps.orders.models import Order, OrderItem, OrderStatusHistory


class OrderItemSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            "id", "product_name_snapshot", "variant_attributes_snapshot",
            "unit_price_snapshot", "quantity", "line_total", "image_url",
        ]

    def get_image_url(self, obj) -> str | None:
        img = (
            obj.variant.product.images.filter(is_primary=True).first()
            or obj.variant.product.images.first()
        )
        if img and img.image:
            request = self.context.get('request')
            return request.build_absolute_uri(img.image.url) if request else img.image.url
        return None


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
    can_cancel = serializers.SerializerMethodField()
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_full_name = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id", "order_number", "status", "payment_status",
            "user_email", "user_full_name",
            "shipping_address_snapshot", "billing_address_snapshot",
            "subtotal", "discount_total", "shipping_cost", "tax_total", "grand_total",
            "coupon_code_snapshot", "notes", "placed_at", "created_at",
            "items", "status_history", "can_cancel",
        ]
        # Orders are immutable via the API — every mutation goes through a
        # dedicated service endpoint (transition/cancel).
        read_only_fields = [f.name for f in Order._meta.fields]

    def get_user_full_name(self, obj) -> str:
        if not obj.user:
            return ""
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.email

    def get_can_cancel(self, obj) -> bool:
        from apps.orders.constants import ALLOWED_TRANSITIONS, OrderStatus
        return OrderStatus.CANCELLED in ALLOWED_TRANSITIONS.get(obj.status, [])


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
