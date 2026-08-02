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
    is_guest = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id", "order_number", "status", "payment_status",
            "user_email", "user_full_name", "is_guest",
            "guest_name", "guest_email", "guest_phone",
            "shipping_address_snapshot", "billing_address_snapshot",
            "subtotal", "discount_total", "shipping_cost", "tax_total", "grand_total",
            "coupon_code_snapshot", "notes", "placed_at", "created_at",
            "items", "status_history", "can_cancel",
        ]
        # Orders are immutable via the API — every mutation goes through a
        # dedicated service endpoint (transition/cancel). The guest_lookup_token
        # hash is never exposed — only the plain token returned at checkout.
        read_only_fields = [f.name for f in Order._meta.fields]

    def get_user_full_name(self, obj) -> str:
        if not obj.user:
            return obj.guest_name or ""
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.email

    def get_is_guest(self, obj) -> bool:
        return obj.user_id is None

    def get_can_cancel(self, obj) -> bool:
        from apps.orders.constants import ALLOWED_TRANSITIONS, OrderStatus
        return OrderStatus.CANCELLED in ALLOWED_TRANSITIONS.get(obj.status, [])


class TrackOrderSerializer(serializers.Serializer):
    """Order lookup — order number + email (+ optional phone / lookup token).

    Registered orders: email (and phone when provided) must match the owner.
    Guest orders (audit H-4): lookup requires Order Number + Phone  OR  Order
    Number + Email + Lookup Token. The secret pair prevents a guessable order
    number alone from reading another customer's order (audit S-5).
    """

    order_number = serializers.CharField(max_length=50)
    email = serializers.EmailField(required=False, allow_blank=True, default="")
    phone_number = serializers.CharField(required=False, allow_blank=True, default="")
    lookup_token = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs: dict) -> dict:
        if not attrs.get("email") and not attrs.get("phone_number"):
            raise serializers.ValidationError(
                {"email": "An email address (or phone number) is required."}
            )
        return attrs


class GuestCancelSerializer(serializers.Serializer):
    """Guest cancellation secret — phone alone, or email + lookup token."""

    phone_number = serializers.CharField(required=False, allow_blank=True, default="")
    email = serializers.EmailField(required=False, allow_blank=True, default="")
    lookup_token = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs: dict) -> dict:
        phone = attrs.get("phone_number", "")
        email = attrs.get("email", "")
        token = attrs.get("lookup_token", "")
        if not phone and not (email and token):
            raise serializers.ValidationError(
                "Provide a phone number, or an email + lookup token."
            )
        return attrs


class PublicOrderSerializer(serializers.ModelSerializer):
    """Limited, owner-free representation of an order for guest tracking.

    Never exposes the user's email, phone, or any staff-only data.
    """

    items = OrderItemSerializer(many=True, read_only=True)
    status_history = OrderStatusHistorySerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id", "order_number", "status", "payment_status", "placed_at",
            "shipping_address_snapshot", "billing_address_snapshot",
            "subtotal", "discount_total", "shipping_cost", "tax_total", "grand_total",
            "coupon_code_snapshot", "items", "status_history",
        ]
        read_only_fields = fields


class GuestAddressSerializer(serializers.Serializer):
    """Inline address capture for guest checkout (audit H-4 — a guest has no
    Address row; the snapshot is stored directly on the order)."""

    full_name = serializers.CharField(max_length=255)
    phone_number = serializers.CharField(max_length=20)
    address_line_1 = serializers.CharField(max_length=255)
    address_line_2 = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")
    city = serializers.CharField(max_length=100)
    state_province = serializers.CharField(max_length=100)
    postal_code = serializers.CharField(max_length=20)
    country = serializers.CharField(max_length=2)

    def validate_phone_number(self, value: str) -> str:
        import re
        if not re.match(r"^\+?\d{9,15}$", value):
            raise serializers.ValidationError("Enter a valid phone number.")
        return value

    def validate_country(self, value: str) -> str:
        from apps.accounts.constants import COUNTRY_CHOICES
        codes = {code for code, _label in COUNTRY_CHOICES}
        if value.upper() not in codes:
            raise serializers.ValidationError("Enter a valid ISO country code.")
        return value.upper()


class GuestCheckoutSerializer(serializers.Serializer):
    """Guest checkout payload — replaces the Address FKs with inline data."""

    guest_name = serializers.CharField(max_length=255)
    guest_email = serializers.EmailField()
    guest_phone = serializers.CharField(max_length=20)
    shipping_address = GuestAddressSerializer()
    coupon_code = serializers.CharField(required=False, allow_blank=True, default="")
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    idempotency_key = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_guest_email(self, value: str) -> str:
        return value.strip().lower()

    def validate_guest_phone(self, value: str) -> str:
        import re
        if not re.match(r"^\+?\d{9,15}$", value):
            raise serializers.ValidationError("Enter a valid phone number.")
        return value


class CheckoutSerializer(serializers.Serializer):
    shipping_address_id = serializers.IntegerField(required=False)
    billing_address_id = serializers.IntegerField(required=False)
    coupon_code = serializers.CharField(required=False, allow_blank=True, default="")
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    idempotency_key = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs: dict) -> dict:
        request = self.context.get("request")
        is_authenticated = request and request.user.is_authenticated
        if is_authenticated and not attrs.get("shipping_address_id"):
            raise serializers.ValidationError(
                {"shipping_address_id": "Shipping address is required."}
            )
        return attrs

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
