"""Stripe payment gateway stub — documented interface for v2.

This file shows exactly where the Stripe integration would go.
It is NOT wired to a real account in v1.

To activate Stripe:
1. Add ``stripe`` to requirements.txt.
2. Set STRIPE_PUBLISHABLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET in .env.
3. Implement the two methods below following the Stripe Python SDK docs.
4. Register StripeGateway in services.py::get_gateway('STRIPE').
"""
from __future__ import annotations

import logging
from decimal import Decimal

from apps.payments.gateways.base import PaymentGateway, PaymentIntent

logger = logging.getLogger("shopcore.payments.stripe")


class StripeGateway(PaymentGateway):
    """Stripe payment gateway — stub interface for v1.

    See Stripe docs: https://stripe.com/docs/api/payment_intents
    """

    def initiate(self, order, amount: Decimal, currency: str) -> PaymentIntent:
        """Create a Stripe PaymentIntent and return the client_secret.

        TODO (v2): Implement using the stripe Python SDK.
        1. import stripe; stripe.api_key = settings.STRIPE_SECRET_KEY
        2. intent = stripe.PaymentIntent.create(amount=int(amount*100), currency=currency, ...)
        3. Create a Payment record with status=INITIATED and raw_response=intent
        4. Return PaymentIntent(payment_id=payment.pk, client_secret=intent.client_secret)
        """
        raise NotImplementedError(
            "Stripe gateway is not implemented in v1. "
            "Implement initiate() following the Stripe SDK docs."
        )

    def handle_webhook(self, payload: dict, raw_body: bytes, headers: dict) -> None:
        """Verify Stripe webhook signature and process payment events.

        TODO (v2): Implement using the stripe Python SDK.
        1. event = stripe.Webhook.construct_event(raw_body, headers['stripe-signature'],
               settings.STRIPE_WEBHOOK_SECRET)
        2. Handle event.type == 'payment_intent.succeeded' by:
           a. Finding the Payment by provider_transaction_id
           b. Updating Payment.status = SUCCEEDED
           c. Calling orders.services.transition_order_status(order, 'PAID')
        """
        raise NotImplementedError(
            "Stripe webhook handling is not implemented in v1."
        )
