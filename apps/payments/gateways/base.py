"""Abstract gateway interface for payment providers.

To add a real gateway (Stripe, SSLCommerz, bKash, etc.):
1. Subclass ``PaymentGateway`` in a new file under ``payments/gateways/``.
2. Implement ``initiate()`` and ``handle_webhook()``.
3. Add the provider to ``PaymentProvider`` choices.
4. Set the required env vars (see .env.example for documented placeholders).
5. Wire the gateway class in ``payments/services.py::get_gateway()``.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal


@dataclass
class PaymentIntent:
    """Returned by gateway.initiate() — contains data the frontend needs."""
    payment_id: int
    provider: str
    client_secret: str | None = None  # Stripe
    redirect_url: str | None = None   # SSLCommerz, bKash


class PaymentGateway(ABC):
    """Abstract base class all payment gateways must implement."""

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

    @abstractmethod
    def handle_webhook(self, payload: dict, raw_body: bytes, headers: dict) -> None:
        """Process an incoming webhook from the payment gateway.

        Args:
            payload: Parsed JSON payload.
            raw_body: Raw request body bytes (needed for signature verification).
            headers: HTTP headers from the webhook request.
        """
