"""Manual payment gateway — marks payment as succeeded immediately.

Use for cash-on-delivery, bank transfers, or any flow where an admin
manually confirms payment. This is the only fully-implemented gateway in v1.
"""
from __future__ import annotations

import logging
from decimal import Decimal

from apps.payments.gateways.base import PaymentGateway, PaymentIntent

logger = logging.getLogger("shopcore.payments.manual")


class ManualGateway(PaymentGateway):
    """Marks payment as succeeded immediately without any external call.

    Suitable for:
    - Cash on delivery (COD) flows
    - Admin-confirmed bank transfers
    - Development/testing without a real gateway
    """

    def initiate(self, order, amount: Decimal, currency: str) -> PaymentIntent:
        """Create a Payment record and immediately mark it succeeded.

        Payment creation and the order-status transition (with its inventory
        side effects) happen inside ONE transaction.atomic() block. If the
        transition fails for any reason, the payment creation is rolled back
        too — a payment can never be left SUCCEEDED while the order stays
        unpaid.
        """
        from django.db import transaction
        from apps.payments.models import Payment
        from apps.payments.constants import PaymentProvider, PaymentStatus
        from apps.orders.constants import OrderStatus
        from apps.orders.services import transition_order_status

        with transaction.atomic():
            payment = Payment.objects.create(
                order=order,
                amount=amount,
                currency=currency,
                provider=PaymentProvider.MANUAL,
                status=PaymentStatus.SUCCEEDED,
                raw_response={"note": "Manual payment — marked succeeded immediately."},
            )
            logger.info("Manual payment %s created for order %s", payment.pk, order.order_number)

            # Trigger order status transition — NOT wrapped in a swallowing
            # except: on failure this must propagate so the outer atomic()
            # rolls back the Payment row created above.
            transition_order_status(order, OrderStatus.PAID, actor=None, note="Manual payment confirmed.")

        return PaymentIntent(
            payment_id=payment.pk,
            provider=PaymentProvider.MANUAL,
        )

    def handle_webhook(self, payload: dict, raw_body: bytes, headers: dict) -> None:
        """Manual gateway has no webhooks."""
        pass
