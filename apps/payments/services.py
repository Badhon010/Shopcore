from __future__ import annotations
import logging
from decimal import Decimal
from apps.payments.gateways.base import PaymentGateway
from apps.payments.gateways.manual import ManualGateway

logger = logging.getLogger("shopcore.payments.services")


def get_gateway(provider: str) -> PaymentGateway:
    """Return the payment gateway implementation for the given provider.

    Args:
        provider: PaymentProvider choice string.

    Returns:
        PaymentGateway instance.

    Raises:
        ValueError: If provider is not supported.
    """
    from apps.payments.constants import PaymentProvider
    gateways = {
        PaymentProvider.MANUAL: ManualGateway,
    }
    gateway_class = gateways.get(provider)
    if gateway_class is None:
        raise ValueError(f"Payment provider '{provider}' is not configured in v1.")
    return gateway_class()


def initiate_payment(order, provider: str = "MANUAL") -> dict:
    """Initiate a payment for an order.

    Args:
        order: The Order instance.
        provider: Payment provider to use.

    Returns:
        Dict with payment initiation data.

    Raises:
        DuplicatePaymentError: If the order already has a successful payment,
            or is already marked as paid. Checked here at the application
            layer; a DB-level constraint on Payment also backstops this
            against a concurrent request racing past this check.
    """
    from django.conf import settings
    from apps.orders.constants import PaymentStatus as OrderPaymentStatus
    from apps.payments.constants import PaymentStatus as GatewayPaymentStatus
    from apps.payments.exceptions import DuplicatePaymentError
    from apps.payments.models import Payment

    if order.payment_status == OrderPaymentStatus.PAID or Payment.objects.filter(
        order=order, status=GatewayPaymentStatus.SUCCEEDED
    ).exists():
        raise DuplicatePaymentError(
            message=f"Order {order.order_number} already has a successful payment.",
            details={"order_number": order.order_number},
        )

    gateway = get_gateway(provider)
    intent = gateway.initiate(
        order=order,
        amount=order.grand_total,
        currency=getattr(settings, "DEFAULT_CURRENCY", "USD"),
    )
    return {
        "payment_id": intent.payment_id,
        "provider": intent.provider,
        "client_secret": intent.client_secret,
        "redirect_url": intent.redirect_url,
    }
