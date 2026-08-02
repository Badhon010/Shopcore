"""Stripe payment gateway (official stripe Python SDK).

Integration pattern per Stripe docs: PaymentIntent with automatic payment
methods; the frontend confirms using the returned client_secret (3DS/SCA
handled by Stripe's hosted elements). Webhooks are signature-verified with
the endpoint secret; `payment_intent.succeeded` records the payment,
`payment_intent.payment_failed` marks it failed. Refunds via stripe.Refund.

Credentials come ONLY from environment variables (STRIPE_SECRET_KEY,
STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET). If absent the gateway
reports "not configured" (audit H-3).
"""
from __future__ import annotations

import logging
from decimal import Decimal

from django.conf import settings

from apps.payments.constants import PaymentProvider
from apps.payments.exceptions import GatewayError, GatewayNotConfiguredError
from apps.payments.gateways.base import PaymentGateway, PaymentIntent

logger = logging.getLogger("shopcore.payments.stripe")


class StripeGateway(PaymentGateway):
    provider = PaymentProvider.STRIPE

    @property
    def _stripe(self):
        try:
            import stripe
        except ImportError as exc:  # pragma: no cover — deps pinned in requirements
            raise GatewayError(
                message="The Stripe SDK is not installed.",
                details={"provider": self.provider},
            ) from exc
        stripe.api_key = settings.STRIPE_SECRET_KEY
        return stripe

    # ------------------------------------------------------------------
    # Configuration
    # ------------------------------------------------------------------
    def is_configured(self) -> bool:
        return bool(settings.STRIPE_SECRET_KEY and settings.STRIPE_PUBLISHABLE_KEY)

    # ------------------------------------------------------------------
    # Initiate
    # ------------------------------------------------------------------
    def initiate(self, order, amount: Decimal, currency: str) -> PaymentIntent:
        if not self.is_configured():
            raise GatewayNotConfiguredError(
                message=(
                    "Stripe is not configured. Set STRIPE_SECRET_KEY and "
                    "STRIPE_PUBLISHABLE_KEY to enable this payment method."
                ),
                details={"provider": self.provider},
            )

        stripe = self._stripe
        # Stripe amounts are in the currency's smallest unit (cents for BDT/USD).
        minor_units = int((amount * 100).to_integral_value())
        try:
            intent = stripe.PaymentIntent.create(
                amount=minor_units,
                currency=currency.lower(),
                automatic_payment_methods={"enabled": True},
                metadata={
                    "order_number": order.order_number,
                    "shopcore_order": str(order.pk),
                },
                description=f"ShopCore order {order.order_number}",
            )
        except stripe.error.StripeError as exc:  # type: ignore[attr-defined]
            logger.error("Stripe PaymentIntent creation failed: %s", exc)
            raise GatewayError(
                message="Stripe could not create the payment.",
                details={"provider": self.provider},
            ) from exc

        return PaymentIntent(
            provider=self.provider,
            client_secret=intent.client_secret,
            provider_transaction_id=intent.id,
            extra={"id": intent.id, "amount": intent.amount, "currency": intent.currency},
        )

    # ------------------------------------------------------------------
    # Webhooks
    # ------------------------------------------------------------------
    def verify_signature(self, raw_body: bytes, headers: dict) -> None:
        stripe = self._stripe
        sig_header = headers.get("stripe-signature", "")
        try:
            stripe.Webhook.construct_event(
                payload=raw_body,
                sig_header=sig_header,
                secret=settings.STRIPE_WEBHOOK_SECRET,
            )
        except (ValueError, stripe.error.SignatureVerificationError) as exc:  # type: ignore[attr-defined]
            raise ValueError("Invalid Stripe webhook signature.") from exc

    def handle_webhook(self, payload: dict, raw_body: bytes, headers: dict) -> None:
        from apps.payments.services import (
            record_failed_payment,
            record_successful_payment,
        )

        event_type = payload.get("type", "")
        event_id = payload.get("id", "")
        data = (payload.get("data") or {}).get("object") or {}
        order_number = (data.get("metadata") or {}).get("order_number", "")

        from apps.orders.models import Order
        try:
            order = Order.objects.get(order_number=order_number)
        except Order.DoesNotExist:
            logger.error("Stripe webhook for unknown order %s", order_number)
            return

        if event_type == "payment_intent.succeeded":
            record_successful_payment(
                order,
                provider=self.provider,
                amount=order.grand_total,
                currency=getattr(settings, "DEFAULT_CURRENCY", "BDT"),
                raw_response={"event_id": event_id, "payment_intent": data.get("id")},
            )
        elif event_type == "payment_intent.payment_failed":
            record_failed_payment(
                order,
                provider=self.provider,
                raw_response={"event_id": event_id, "payment_intent": data.get("id")},
            )
        else:
            logger.info("Stripe webhook event %s ignored", event_type)

    # ------------------------------------------------------------------
    # Refund
    # ------------------------------------------------------------------
    def refund(self, payment, amount: Decimal, currency: str, reason: str = "") -> dict:
        if not self.is_configured():
            raise GatewayNotConfiguredError(
                message="Stripe is not configured; cannot process a gateway refund.",
                details={"provider": self.provider},
            )
        stripe = self._stripe
        intent_id = payment.provider_transaction_id or (
            payment.raw_response or {}
        ).get("payment_intent") or (payment.raw_response or {}).get("id")
        if not intent_id:
            raise GatewayError(
                message="No Stripe PaymentIntent reference on this payment.",
                details={"payment_id": payment.pk},
            )
        try:
            refund = stripe.Refund.create(
                payment_intent=intent_id,
                amount=int((amount * 100).to_integral_value()),
                reason="requested_by_customer" if reason else None,
                metadata={"shopcore_refund": reason or "customer"},
            )
        except stripe.error.StripeError as exc:  # type: ignore[attr-defined]
            logger.error("Stripe refund failed: %s", exc)
            raise GatewayError(
                message="Stripe refund could not be processed.",
                details={"provider": self.provider},
            ) from exc
        return {"id": refund.id, "status": refund.status, "amount": refund.amount}
