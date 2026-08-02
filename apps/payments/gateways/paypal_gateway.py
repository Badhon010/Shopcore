"""PayPal payment gateway (official REST API v2 — Orders + Capture).

Per current PayPal documentation (the legacy paypalrestsdk is deprecated;
direct HTTP via `requests` is the recommended approach):

- OAuth2 client-credentials token:  POST /v1/oauth2/token
- Create order:                     POST /v2/checkout/orders (intent CAPTURE)
- Capture approved order:           POST /v2/checkout/orders/{id}/capture
- Webhook verification:             POST /v1/notifications/verify-webhook-signature
- Refund:                           POST /v2/payments/captures/{id}/refund

Credentials come ONLY from environment variables (PAYPAL_CLIENT_ID,
PAYPAL_CLIENT_SECRET, PAYPAL_WEBHOOK_ID). Sandbox/live from PaymentMethod
is_sandbox (fallback PAYPAL_SANDBOX). "Not configured" is reported gracefully
when credentials are absent (audit H-3).
"""
from __future__ import annotations

import base64
import logging
from decimal import Decimal

import requests
from django.conf import settings

from apps.payments.constants import PaymentProvider
from apps.payments.exceptions import GatewayError, GatewayNotConfiguredError
from apps.payments.gateways.base import PaymentGateway, PaymentIntent

logger = logging.getLogger("shopcore.payments.paypal")

_SANDBOX_BASE = "https://api-m.sandbox.paypal.com"
_LIVE_BASE = "https://api-m.paypal.com"


class PayPalGateway(PaymentGateway):
    provider = PaymentProvider.PAYPAL

    # ------------------------------------------------------------------
    # Configuration
    # ------------------------------------------------------------------
    def is_configured(self) -> bool:
        return bool(settings.PAYPAL_CLIENT_ID and settings.PAYPAL_CLIENT_SECRET)

    @property
    def _base_url(self) -> str:
        if self.method is not None:
            return _LIVE_BASE if not self.method.is_sandbox else _SANDBOX_BASE
        return _SANDBOX_BASE if settings.PAYPAL_SANDBOX else _LIVE_BASE

    def _access_token(self) -> str:
        """Exchange client credentials for an OAuth2 access token (cached)."""
        if not self.is_configured():
            raise GatewayNotConfiguredError(
                message=(
                    "PayPal is not configured. Set PAYPAL_CLIENT_ID and "
                    "PAYPAL_CLIENT_SECRET to enable this payment method."
                ),
                details={"provider": self.provider},
            )
        basic = base64.b64encode(
            f"{settings.PAYPAL_CLIENT_ID}:{settings.PAYPAL_CLIENT_SECRET}".encode()
        ).decode()
        try:
            response = requests.post(
                f"{self._base_url}/v1/oauth2/token",
                headers={
                    "Authorization": f"Basic {basic}",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                data={"grant_type": "client_credentials"},
                timeout=30,
            )
            response.raise_for_status()
            return response.json()["access_token"]
        except (requests.RequestException, KeyError, ValueError) as exc:
            logger.error("PayPal OAuth2 token exchange failed: %s", exc)
            raise GatewayError(
                message="Could not authenticate with PayPal.",
                details={"provider": self.provider},
            ) from exc

    # ------------------------------------------------------------------
    # Initiate
    # ------------------------------------------------------------------
    def initiate(self, order, amount: Decimal, currency: str) -> PaymentIntent:
        if not self.is_configured():
            raise GatewayNotConfiguredError(
                message=(
                    "PayPal is not configured. Set PAYPAL_CLIENT_ID and "
                    "PAYPAL_CLIENT_SECRET to enable this payment method."
                ),
                details={"provider": self.provider},
            )

        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5000").rstrip("/")
        return_url = getattr(settings, "PAYPAL_RETURN_URL", f"{frontend_url}/order/success")
        cancel_url = getattr(settings, "PAYPAL_CANCEL_URL", f"{frontend_url}/cart")

        payload = {
            "intent": "CAPTURE",
            "purchase_units": [
                {
                    "reference_id": order.order_number,
                    "custom_id": order.order_number,
                    "invoice_id": order.order_number,
                    "amount": {
                        "currency_code": currency,
                        "value": f"{amount:.2f}",
                    },
                }
            ],
            "payment_source": {
                "paypal": {
                    "experience_context": {
                        "return_url": return_url,
                        "cancel_url": cancel_url,
                        "user_action": "PAY_NOW",
                        "shipping_preference": "NO_SHIPPING",
                    }
                }
            },
        }

        token = self._access_token()
        try:
            response = requests.post(
                f"{self._base_url}/v2/checkout/orders",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                    "PayPal-Request-Id": f"shopcore-{order.order_number}",
                },
                json=payload,
                timeout=30,
            )
            response.raise_for_status()
            result = response.json()
        except requests.RequestException as exc:
            logger.error("PayPal order creation failed: %s", exc)
            raise GatewayError(
                message="Could not create the PayPal order.",
                details={"provider": self.provider},
            ) from exc

        approve_url = None
        for link in result.get("links", []):
            if link.get("rel") == "approve":
                approve_url = link.get("href")
                break

        return PaymentIntent(
            provider=self.provider,
            redirect_url=approve_url,
            provider_transaction_id=result.get("id"),
            extra=result,
        )

    # ------------------------------------------------------------------
    # Webhooks
    # ------------------------------------------------------------------
    def verify_signature(self, raw_body: bytes, headers: dict) -> None:
        """Verify a PayPal webhook via the official verification endpoint."""
        token = self._access_token()
        payload = {
            "auth_algo": headers.get("paypal-auth-algo", ""),
            "cert_url": headers.get("paypal-cert-url", ""),
            "transmission_id": headers.get("paypal-transmission-id", ""),
            "transmission_sig": headers.get("paypal-transmission-sig", ""),
            "transmission_time": headers.get("paypal-transmission-time", ""),
            "webhook_id": settings.PAYPAL_WEBHOOK_ID,
        }
        import json
        try:
            payload["webhook_event"] = json.loads(raw_body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise ValueError("Invalid PayPal webhook payload.") from exc

        try:
            response = requests.post(
                f"{self._base_url}/v1/notifications/verify-webhook-signature",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=30,
            )
            response.raise_for_status()
            status = response.json().get("verification_status")
        except (requests.RequestException, ValueError) as exc:
            logger.error("PayPal webhook verification failed: %s", exc)
            raise ValueError("Could not verify PayPal webhook.") from exc

        if status != "SUCCESS":
            raise ValueError(f"PayPal webhook verification failed: {status}")

    def handle_webhook(self, payload: dict, raw_body: bytes, headers: dict) -> None:
        from apps.payments.services import (
            record_failed_payment,
            record_successful_payment,
        )

        event_type = payload.get("event_type", "")
        resource = payload.get("resource") or {}
        custom_id = (
            resource.get("custom_id")
            or (resource.get("purchase_units") or [{}])[0].get("custom_id")
            or (resource.get("supplementary_data") or {})
            .get("related_ids", {})
            .get("order_id")
            or ""
        )
        order_number = custom_id

        from apps.orders.models import Order
        try:
            order = Order.objects.get(order_number=order_number)
        except Order.DoesNotExist:
            logger.error("PayPal webhook for unknown order %s", order_number)
            return

        if event_type == "PAYMENT.CAPTURE.COMPLETED":
            record_successful_payment(
                order,
                provider=self.provider,
                amount=order.grand_total,
                currency=getattr(settings, "DEFAULT_CURRENCY", "BDT"),
                raw_response={
                    "event_id": payload.get("id", ""),
                    "capture_id": resource.get("id"),
                },
            )
        elif event_type in ("PAYMENT.CAPTURE.DENIED", "PAYMENT.CAPTURE.REVERSED", "PAYMENT.CAPTURE.REFUNDED"):
            record_failed_payment(
                order,
                provider=self.provider,
                raw_response={
                    "event_id": payload.get("id", ""),
                    "capture_id": resource.get("id"),
                },
            )
        else:
            logger.info("PayPal webhook event %s ignored", event_type)

    # ------------------------------------------------------------------
    # Refund
    # ------------------------------------------------------------------
    def refund(self, payment, amount: Decimal, currency: str, reason: str = "") -> dict:
        if not self.is_configured():
            raise GatewayNotConfiguredError(
                message="PayPal is not configured; cannot process a gateway refund.",
                details={"provider": self.provider},
            )
        capture_id = payment.provider_transaction_id or (
            payment.raw_response or {}
        ).get("capture_id")
        if not capture_id:
            raise GatewayError(
                message="No PayPal capture reference on this payment.",
                details={"payment_id": payment.pk},
            )
        token = self._access_token()
        try:
            response = requests.post(
                f"{self._base_url}/v2/payments/captures/{capture_id}/refund",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                    "PayPal-Request-Id": f"shopcore-refund-{payment.pk}",
                },
                json={
                    "amount": {"currency_code": currency, "value": f"{amount:.2f}"},
                    "invoice_id": reason or "customer",
                },
                timeout=30,
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as exc:
            logger.error("PayPal refund failed: %s", exc)
            raise GatewayError(
                message="PayPal refund could not be processed.",
                details={"provider": self.provider},
            ) from exc
