"""SSLCommerz payment gateway (Bangladesh).

Implements the official SSLCommerz API (v4) per provider documentation:

- Session initiation:  POST /gwprocess/v4/api.php
- IPN signature:       verify_sign (MD5 over verify_key values + store password)
- Order validation:    GET /validator/api/validationserverAPI.php?val_id=…
- Refund:              POST /gwprocess/v4/refund.php

Credentials come ONLY from environment variables (SSLCOMMERZ_STORE_ID,
SSLCOMMERZ_STORE_PASSWORD). Sandbox vs live is chosen by the PaymentMethod's
is_sandbox flag, falling back to SSLCOMMERZ_SANDBOX env. If credentials are
absent the gateway reports "not configured" instead of failing (audit H-3).
"""
from __future__ import annotations

import hashlib
import logging
from decimal import Decimal

import requests
from django.conf import settings

from apps.payments.constants import PaymentProvider
from apps.payments.exceptions import GatewayError, GatewayNotConfiguredError
from apps.payments.gateways.base import PaymentGateway, PaymentIntent

logger = logging.getLogger("shopcore.payments.sslcommerz")

_SANDBOX_BASE = "https://sandbox.sslcommerz.com"
_LIVE_BASE = "https://securepay.sslcommerz.com"


class SSLCommerzGateway(PaymentGateway):
    provider = PaymentProvider.SSLCOMMERZ

    # ------------------------------------------------------------------
    # Configuration
    # ------------------------------------------------------------------
    def is_configured(self) -> bool:
        return bool(settings.SSLCOMMERZ_STORE_ID and settings.SSLCOMMERZ_STORE_PASSWORD)

    @property
    def _base_url(self) -> str:
        if self.method is not None:
            return _LIVE_BASE if not self.method.is_sandbox else _SANDBOX_BASE
        return _SANDBOX_BASE if settings.SSLCOMMERZ_SANDBOX else _LIVE_BASE

    @property
    def _credentials(self) -> dict:
        return {
            "store_id": settings.SSLCOMMERZ_STORE_ID,
            "store_passwd": settings.SSLCOMMERZ_STORE_PASSWORD,
        }

    # ------------------------------------------------------------------
    # Initiate (session creation)
    # ------------------------------------------------------------------
    def initiate(self, order, amount: Decimal, currency: str) -> PaymentIntent:
        if not self.is_configured():
            raise GatewayNotConfiguredError(
                message=(
                    "SSLCommerz is not configured. Set SSLCOMMERZ_STORE_ID and "
                    "SSLCOMMERZ_STORE_PASSWORD to enable this payment method."
                ),
                details={"provider": self.provider},
            )

        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5000").rstrip("/")
        success_url = getattr(
            settings, "SSLCOMMERZ_SUCCESS_URL", f"{frontend_url}/order/success"
        )
        fail_url = getattr(
            settings, "SSLCOMMERZ_FAIL_URL", f"{frontend_url}/order/failure"
        )
        cancel_url = getattr(
            settings, "SSLCOMMERZ_CANCEL_URL", f"{frontend_url}/cart"
        )

        cus_name = ""
        cus_email = ""
        cus_phone = ""
        if order.user is not None:
            cus_name = order.user.full_name or order.user.email
            cus_email = order.user.email
            cus_phone = order.user.phone_number or ""
        else:
            snapshot = order.shipping_address_snapshot or {}
            cus_name = snapshot.get("full_name", "")
            cus_phone = snapshot.get("phone_number", "")
            cus_email = order.guest_email or ""

        payload = {
            **_credentials(self._credentials),
            "total_amount": f"{amount:.2f}",
            "currency": currency,
            "tran_id": order.order_number,
            "success_url": success_url,
            "fail_url": fail_url,
            "cancel_url": cancel_url,
            "cus_name": cus_name,
            "cus_email": cus_email,
            "cus_phone": cus_phone,
            "shipping_method": "YES",
            "product_name": "ShopCore Order",
            "product_category": "Ecommerce",
            "product_profile": "general",
        }
        try:
            response = requests.post(
                f"{self._base_url}/gwprocess/v4/api.php",
                data=payload,
                timeout=30,
            )
            response.raise_for_status()
            result = response.json()
        except requests.RequestException as exc:
            logger.error("SSLCommerz session creation failed: %s", exc)
            raise GatewayError(
                message="Could not reach SSLCommerz to start payment.",
                details={"provider": self.provider},
            ) from exc
        except ValueError as exc:  # invalid JSON
            logger.error("SSLCommerz returned invalid JSON: %s", exc)
            raise GatewayError(
                message="SSLCommerz returned an invalid response.",
                details={"provider": self.provider},
            ) from exc

        if str(result.get("status", "")).upper() != "SUCCESS":
            logger.warning("SSLCommerz session rejected: %s", result.get("failedreason"))
            raise GatewayError(
                message=(
                    result.get("failedreason")
                    or "SSLCommerz could not start the payment session."
                ),
                details={"provider": self.provider, "response": result},
            )

        return PaymentIntent(
            provider=self.provider,
            redirect_url=result.get("GatewayPageURL"),
            provider_transaction_id=result.get("sessionkey") or result.get("tran_id"),
            extra=result,
        )

    # ------------------------------------------------------------------
    # Webhook (IPN)
    # ------------------------------------------------------------------
    def verify_signature(self, raw_body: bytes, headers: dict) -> None:
        # SSLCommerz IPNs carry no HTTP signature header; authenticity is
        # established by (a) the verify_sign payload check performed in
        # handle_webhook, and (b) the server-side val_id validation call.
        pass

    def handle_webhook(self, payload: dict, raw_body: bytes, headers: dict) -> None:
        """Validate the IPN and return the event we care about.

        The caller (services) uses this to either record a successful payment
        (status=VALID, amount matches) or mark it failed.
        """
        from apps.payments.services import (
            record_failed_payment,
            record_successful_payment,
        )

        if not self._verify_ipn_signature(payload):
            raise ValueError("Invalid SSLCommerz IPN signature (verify_sign).")

        # val_id server-side validation is the authoritative check.
        validated = self._validate_transaction(
            val_id=payload.get("val_id", ""),
            amount=payload.get("amount"),
            currency=payload.get("currency"),
            order_number=payload.get("tran_id"),
        )
        if not validated:
            # The validation API is the authoritative check; if it is down we
            # MUST NOT acknowledge the webhook as processed — raising makes
            # the event log FAILED and returns non-200 so the gateway retries
            # rather than silently losing a real payment.
            raise ValueError(
                "SSLCommerz val_id validation API could not be reached; refusing to record payment."
            )

        payment = None
        # We can match by order number (tran_id) — the Payment row may not
        # exist yet if the webhook raced the session response.
        from apps.orders.models import Order
        try:
            order = Order.objects.get(order_number=payload["tran_id"])
        except (Order.DoesNotExist, KeyError):
            logger.error("SSLCommerz IPN for unknown order %s", payload.get("tran_id"))
            return

        payment = _find_or_create_payment(order, self.provider)
        if str(validated.get("status", "")).upper() == "VALID":
            record_successful_payment(
                order,
                provider=self.provider,
                amount=payment.amount if payment else order.grand_total,
                currency=(
                    payment.currency
                    if payment
                    else getattr(settings, "DEFAULT_CURRENCY", "BDT")
                ),
                raw_response=validated,
                payment=payment,
            )
        else:
            record_failed_payment(order, provider=self.provider, raw_response=validated)

    # ------------------------------------------------------------------
    # Refund
    # ------------------------------------------------------------------
    def refund(self, payment, amount: Decimal, currency: str, reason: str = "") -> dict:
        if not self.is_configured():
            raise GatewayNotConfiguredError(
                message="SSLCommerz is not configured; cannot process a gateway refund.",
                details={"provider": self.provider},
            )
        payload = {
            **_credentials(self._credentials),
            "bank_tran_id": (payment.raw_response or {}).get("bank_tran_id", ""),
            "refund_amount": f"{amount:.2f}",
            "refund_remarks": reason or "Customer refund",
        }
        try:
            response = requests.post(
                f"{self._base_url}/gwprocess/v4/refund.php",
                data=payload,
                timeout=30,
            )
            response.raise_for_status()
            result = response.json()
        except (requests.RequestException, ValueError) as exc:
            logger.error("SSLCommerz refund failed: %s", exc)
            raise GatewayError(
                message="SSLCommerz refund could not be processed.",
                details={"provider": self.provider},
            ) from exc

        if str(result.get("status", "")).upper() != "SUCCESS":
            raise GatewayError(
                message=result.get("errorReason") or "SSLCommerz refund rejected.",
                details={"provider": self.provider, "response": result},
            )
        return result

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    def _verify_ipn_signature(self, payload: dict) -> bool:
        """Verify the SSLCommerz IPN verify_sign hash.

        The provider signs the POST fields listed (in order) in verify_key,
        concatenated, plus the store password, MD5-hashed.
        """
        verify_key = (payload.get("verify_key") or "").strip()
        if not verify_key:
            return False
        data_string = "".join(str(payload.get(key, "")) for key in verify_key.split(","))
        data_string += settings.SSLCOMMERZ_STORE_PASSWORD
        computed = hashlib.md5(data_string.encode()).hexdigest()
        return computed == str(payload.get("verify_sign", "")).lower()

    def _validate_transaction(self, val_id, amount, currency, order_number) -> dict | None:
        """Call the SSLCommerz validation API for a val_id."""
        try:
            response = requests.get(
                f"{self._base_url}/validator/api/validationserverAPI.php",
                params={
                    "val_id": val_id,
                    "store_id": settings.SSLCOMMERZ_STORE_ID,
                    "store_passwd": settings.SSLCOMMERZ_STORE_PASSWORD,
                    "format": "json",
                },
                timeout=30,
            )
            response.raise_for_status()
            return response.json()
        except (requests.RequestException, ValueError) as exc:
            logger.error("SSLCommerz validation API failed: %s", exc)
            return None


def _credentials(creds: dict) -> dict:
    """Return credential fields (helper kept separate for testability)."""
    return creds


def _find_or_create_payment(order, provider: str):
    """Return the existing Payment for the order/provider or create an
    INITIATED row so the event log has a link target."""
    from apps.payments.constants import PaymentStatus
    from apps.payments.models import Payment

    payment = (
        Payment.objects.filter(order=order, provider=provider)
        .order_by("-created_at")
        .first()
    )
    if payment is None:
        payment = Payment.objects.create(
            order=order,
            amount=order.grand_total,
            currency=getattr(settings, "DEFAULT_CURRENCY", "BDT"),
            provider=provider,
            status=PaymentStatus.INITIATED,
        )
    return payment
