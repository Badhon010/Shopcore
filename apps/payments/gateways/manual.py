"""Manual payment gateway — marks payment as succeeded immediately.

Use for cash-on-delivery, bank transfers, or any flow where an admin
manually confirms payment. This is the only fully-implemented gateway in v1.
"""
from __future__ import annotations

import logging
from decimal import Decimal

from apps.payments.constants import PaymentProvider
from apps.payments.gateways.base import PaymentGateway, PaymentIntent

logger = logging.getLogger("shopcore.payments.manual")


class ManualGateway(PaymentGateway):
    """Marks payment as succeeded immediately without any external call.

    Suitable for:
    - Cash on delivery (COD) flows
    - Admin-confirmed bank transfers
    - Development/testing without a real gateway
    """

    provider = PaymentProvider.MANUAL

    def initiate(self, order, amount: Decimal, currency: str) -> PaymentIntent:
        """Create a Payment record and immediately mark it succeeded.

        Delegates to payments.services.record_successful_payment(), the single
        source of truth for confirming a payment: Payment creation and the
        order-status transition (with its inventory side effects) happen
        inside ONE transaction.atomic() block, so a failed transition rolls
        the payment row back too — a payment can never be left SUCCEEDED
        while the order stays unpaid.
        """
        from apps.payments.constants import PaymentProvider
        from apps.payments.services import record_successful_payment

        payment = record_successful_payment(
            order,
            provider=PaymentProvider.MANUAL,
            amount=amount,
            currency=currency,
            raw_response={"note": "Manual payment — marked succeeded immediately."},
        )

        return PaymentIntent(
            payment_id=payment.pk,
            provider=PaymentProvider.MANUAL,
        )

    def handle_webhook(self, payload: dict, raw_body: bytes, headers: dict) -> None:
        """Manual gateway has no webhooks."""
        pass
