"""Abstract gateway interface for payment providers.

Every gateway (Manual, SSLCommerz, Stripe, PayPal, …) implements the same
interface:

- ``configure(method)`` — called with the PaymentMethod row (or None) so the
  gateway can pick up non-secret config (sandbox/live, gateway_config JSON).
  Secrets are ALWAYS read from environment variables inside the gateway.
- ``is_configured()`` — True when the env credentials required to operate are
  present. Gateways must fail gracefully with a clear "not configured" error
  when credentials are absent (audit H-3 decision).
- ``initiate()`` — create the payment session on the provider and return a
  PaymentIntent (client_secret for Stripe, redirect_url for SSLCommerz/PayPal).
- ``verify_signature()`` — verify an incoming webhook (raise ValueError).
- ``handle_webhook()`` — process an incoming webhook (must be idempotent; the
  registry dedupes via PaymentEventLog).
- ``refund()`` — push a refund to the provider (gateway-backed refunds).

See ``payments/services.py::get_gateway()`` for the registry.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from decimal import Decimal


@dataclass
class PaymentIntent:
    """Returned by gateway.initiate() — contains data the frontend needs."""

    payment_id: int | None = None
    provider: str = ""
    client_secret: str | None = None  # Stripe
    redirect_url: str | None = None   # SSLCommerz, PayPal, bKash
    # Provider's own transaction/session id (e.g. Stripe pi_…, SSLCommerz
    # sessionkey / tran_id, PayPal order id). Stored on Payment.provider_transaction_id.
    provider_transaction_id: str | None = None
    extra: dict = field(default_factory=dict)


class PaymentGateway(ABC):
    """Abstract base class all payment gateways must implement."""

    provider: str = ""

    def __init__(self) -> None:
        self.method = None  # PaymentMethod row (non-secret config)

    def configure(self, method) -> None:
        """Store the PaymentMethod row for non-secret config.

        Gateways read sandbox/live mode and any per-method gateway_config
        JSON from here. Secrets come from environment variables only.
        """
        self.method = method

    def is_configured(self) -> bool:
        """Return True when the env credentials required to operate exist.

        Default: True (gateways without required credentials — e.g. Manual —
        override to False, or rely on the default).\n
        """
        return True

    def refund(self, payment, amount: Decimal, currency: str, reason: str = "") -> dict:
        """Push a refund to the provider (gateway-backed refunds).

        Args:
            payment: The Payment instance being refunded.
            amount: The refund amount.
            currency: ISO 4217 currency code.
            reason: Optional refund reason shown to the provider.

        Returns:
            Provider refund payload (raw response).

        Raises:
            GatewayError: If the provider rejects the refund.
        """
        raise NotImplementedError(f"{type(self).__name__} does not support gateway refunds")

    @abstractmethod
    def initiate(self, order, amount: Decimal, currency: str) -> PaymentIntent:
        """Initiate a payment and return the data the frontend needs to proceed.

        Args:
            order: The Order instance.
            amount: The amount to charge.
            currency: ISO 4217 currency code.

        Returns:
            PaymentIntent with provider-specific data.
        """

    def verify_signature(self, raw_body: bytes, headers: dict) -> None:
        """Verify the webhook signature/HMAC.

        Raise ``ValueError`` if the signature is invalid.
        The default implementation is a no-op (no signature required).
        Override in gateways that enforce HMAC verification.
        """
        return None

    @abstractmethod
    def handle_webhook(self, payload: dict, raw_body: bytes, headers: dict) -> None:
        """Process an incoming webhook from the payment gateway.

        Args:
            payload: Parsed JSON payload.
            raw_body: Raw request body bytes (needed for signature verification).
            headers: HTTP headers from the webhook request.
        """
