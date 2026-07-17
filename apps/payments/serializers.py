from __future__ import annotations
from rest_framework import serializers
from apps.payments.models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            "id", "order", "amount", "currency", "provider",
            "provider_transaction_id", "status", "created_at",
        ]
        read_only_fields = ["id", "provider_transaction_id", "created_at"]


class InitiatePaymentSerializer(serializers.Serializer):
    from apps.payments.constants import PaymentProvider as _PaymentProvider

    order_number = serializers.CharField()
    provider = serializers.ChoiceField(
        choices=_PaymentProvider.choices,
        default=_PaymentProvider.MANUAL,
    )
