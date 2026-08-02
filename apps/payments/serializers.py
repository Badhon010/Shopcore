from __future__ import annotations

from decimal import Decimal

from rest_framework import serializers

from apps.payments.models import (
    ManualPaymentSubmission,
    Payment,
    PaymentMethod,
    Refund,
)


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            "id", "order", "amount", "currency", "provider",
            "provider_transaction_id", "status", "created_at",
        ]
        read_only_fields = ["id", "provider_transaction_id", "created_at"]


class PaymentMethodSerializer(serializers.ModelSerializer):
    """Full payment-method representation for staff management."""

    is_configured = serializers.SerializerMethodField()

    class Meta:
        model = PaymentMethod
        fields = [
            "id", "provider", "name", "description", "is_enabled", "sort_order",
            "instructions", "account_number", "account_name", "qr_image",
            "payment_notes", "is_sandbox", "gateway_config", "is_configured",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "is_configured"]

    def get_is_configured(self, obj) -> bool:
        """Whether the gateway's env credentials are present (H-3). Manual
        methods are always 'configured' — they need no external credentials."""
        from apps.payments.constants import PaymentProvider
        if obj.provider in (PaymentProvider.MANUAL, PaymentProvider.BANK_TRANSFER,
                            PaymentProvider.BKASH, PaymentProvider.NAGAD,
                            PaymentProvider.ROCKET):
            return True
        try:
            from apps.payments.services import get_gateway
            return get_gateway(obj.provider, method=obj).is_configured()
        except Exception:
            return False


class PaymentMethodPublicSerializer(serializers.ModelSerializer):
    """Enabled payment methods exposed to the storefront checkout."""

    qr_image_url = serializers.SerializerMethodField()

    class Meta:
        model = PaymentMethod
        fields = [
            "id", "provider", "name", "description", "instructions",
            "account_number", "account_name", "qr_image_url", "payment_notes",
        ]
        read_only_fields = fields

    def get_qr_image_url(self, obj) -> str | None:
        if not obj.qr_image:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.qr_image.url) if request else obj.qr_image.url


class RefundSerializer(serializers.ModelSerializer):
    """Read-only refund representation."""

    order_number = serializers.CharField(source="order.order_number", read_only=True)
    created_by_email = serializers.SerializerMethodField()

    class Meta:
        model = Refund
        fields = [
            "id", "order", "order_number", "payment", "amount", "currency",
            "reason", "status", "created_by_email", "refunded_at", "created_at",
        ]
        read_only_fields = fields

    def get_created_by_email(self, obj) -> str | None:
        return obj.created_by.email if obj.created_by else None


class RefundRequestSerializer(serializers.Serializer):
    """Staff refund request payload."""

    amount = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, min_value=Decimal("0.01")
    )
    reason = serializers.CharField(required=False, allow_blank=True, default="")


class ManualPaymentSubmissionSerializer(serializers.ModelSerializer):
    """Staff view of a manual payment submission."""

    order_number = serializers.CharField(source="order.order_number", read_only=True)
    customer_email = serializers.SerializerMethodField()
    method_provider = serializers.SerializerMethodField()
    method_name = serializers.SerializerMethodField()
    receipt_url = serializers.SerializerMethodField()

    class Meta:
        model = ManualPaymentSubmission
        fields = [
            "id", "order", "order_number", "user", "customer_email",
            "method", "method_provider", "method_name", "reference_number",
            "receipt", "receipt_url", "notes", "status", "admin_note",
            "reviewed_by", "reviewed_at", "payment", "created_at", "updated_at",
        ]
        read_only_fields = fields

    def get_customer_email(self, obj) -> str | None:
        return obj.user.email if obj.user else None

    def get_method_provider(self, obj) -> str | None:
        return obj.method.provider if obj.method else None

    def get_method_name(self, obj) -> str | None:
        return obj.method.name if obj.method else None

    def get_receipt_url(self, obj) -> str | None:
        if not obj.receipt:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.receipt.url) if request else obj.receipt.url


class PaymentSubmissionCreateSerializer(serializers.Serializer):
    """Customer payload for submitting a manual payment.

    Guest orders (audit H-4) must additionally supply the lookup secret
    (phone_number, or email + lookup_token) to prove ownership.
    """

    order_number = serializers.CharField(max_length=50)
    method_id = serializers.IntegerField(required=False, allow_null=True)
    reference_number = serializers.CharField(max_length=255)
    receipt = serializers.FileField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    # Guest identity (only for guest orders)
    phone_number = serializers.CharField(required=False, allow_blank=True, default="")
    email = serializers.EmailField(required=False, allow_blank=True, default="")
    lookup_token = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs: dict) -> dict:
        phone = attrs.get("phone_number", "")
        email = attrs.get("email", "")
        token = attrs.get("lookup_token", "")
        # Guest identity is optional here — the view only requires it when the
        # order belongs to a guest. If provided at all, it must be complete.
        if phone or email or token:
            if not phone and not (email and token):
                raise serializers.ValidationError(
                    "Provide a phone number, or an email + lookup token, for guest orders."
                )
        return attrs


class PaymentSubmissionReviewSerializer(serializers.Serializer):
    """Staff payload for reviewing a manual payment submission."""

    approve = serializers.BooleanField()
    admin_note = serializers.CharField(required=False, allow_blank=True, default="")


class InitiatePaymentSerializer(serializers.Serializer):
    from apps.payments.constants import PaymentProvider as _PaymentProvider

    order_number = serializers.CharField()
    provider = serializers.ChoiceField(
        choices=_PaymentProvider.choices,
        default=_PaymentProvider.MANUAL,
    )
