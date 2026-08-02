from __future__ import annotations

import logging
from decimal import Decimal

from django.conf import settings
from django.db import transaction

from apps.payments.gateways.base import PaymentGateway
from apps.payments.gateways.manual import ManualGateway
from apps.payments.models import ManualPaymentSubmission, Payment, Refund

logger = logging.getLogger("shopcore.payments.services")


def get_gateway(provider: str, method=None) -> PaymentGateway:
    """Return the payment gateway implementation for the given provider.

    Args:
        provider: PaymentProvider choice string.
        method: Optional PaymentMethod row — passed to the gateway's
            configure() so it can read sandbox/live + non-secret config.

    Returns:
        PaymentGateway instance (configured).

    Raises:
        ValueError: If provider is not registered.
    """
    from apps.payments.constants import PaymentProvider
    from apps.payments.gateways.paypal_gateway import PayPalGateway
    from apps.payments.gateways.sslcommerz_gateway import SSLCommerzGateway
    from apps.payments.gateways.stripe_gateway import StripeGateway

    gateways = {
        PaymentProvider.MANUAL: ManualGateway,
        PaymentProvider.SSLCOMMERZ: SSLCommerzGateway,
        PaymentProvider.STRIPE: StripeGateway,
        PaymentProvider.PAYPAL: PayPalGateway,
    }
    gateway_class = gateways.get(provider)
    if gateway_class is None:
        raise ValueError(f"Payment provider '{provider}' has no registered gateway.")
    gateway = gateway_class()
    gateway.configure(method)
    return gateway


def initiate_payment(order, provider: str = "MANUAL") -> dict:
    """Initiate a payment for an order.

    Manual providers confirm immediately (Payment SUCCEEDED). Gateway-backed
    providers (SSLCommerz, Stripe, PayPal) create an INITIATED Payment row
    and return the client_secret / redirect_url the frontend needs; the
    payment is finalized by the gateway webhook.

    Args:
        order: The Order instance.
        provider: Payment provider to use.

    Returns:
        Dict with payment initiation data.

    Raises:
        DuplicatePaymentError: If the order already has a successful payment.
        GatewayNotConfiguredError: If a gateway-backed provider has no env
            credentials configured (audit H-3 — graceful failure).
        GatewayError: If the provider rejects initiation.
    """
    from django.conf import settings

    from apps.orders.constants import PaymentStatus as OrderPaymentStatus
    from apps.payments.constants import PaymentProvider
    from apps.payments.constants import PaymentStatus as GatewayPaymentStatus
    from apps.payments.exceptions import DuplicatePaymentError, PaymentMethodNotAvailableError
    from apps.payments.models import Payment, PaymentMethod

    if order.payment_status == OrderPaymentStatus.PAID or Payment.objects.filter(
        order=order, status=GatewayPaymentStatus.SUCCEEDED
    ).exists():
        raise DuplicatePaymentError(
            message=f"Order {order.order_number} already has a successful payment.",
            details={"order_number": order.order_number},
        )

    # Order of checks matters:
    #   1. Provider with no registered gateway (BKASH/NAGAD/ROCKET manual
    #      methods use the submission flow) → PROVIDER_NOT_AVAILABLE.
    #   2. Method disabled → PAYMENT_METHOD_NOT_AVAILABLE.
    #   3. Gateway credentials missing → GATEWAY_NOT_CONFIGURED (graceful).
    get_gateway(provider)  # raises ValueError if unregistered → view maps to 400

    method = PaymentMethod.objects.filter(provider=provider, is_enabled=True).first()
    if method is None:
        raise PaymentMethodNotAvailableError(
            message=f"The {provider} payment method is not enabled.",
            details={"provider": provider},
        )
    gateway = get_gateway(provider, method=method)
    intent = gateway.initiate(
        order=order,
        amount=order.grand_total,
        currency=getattr(settings, "DEFAULT_CURRENCY", "BDT"),
    )

    # Manual providers already recorded the SUCCEEDED Payment inside
    # gateway.initiate() — return their data as-is.
    if provider == PaymentProvider.MANUAL:
        return {
            "payment_id": intent.payment_id,
            "provider": intent.provider,
            "client_secret": intent.client_secret,
            "redirect_url": intent.redirect_url,
        }

    # Gateway-backed: create (or reuse) an INITIATED Payment row keyed to the
    # provider's transaction id so the webhook can correlate and finalize it.
    with transaction.atomic():
        payment = Payment.objects.filter(
            order=order, provider=provider, status=GatewayPaymentStatus.INITIATED
        ).first()
        if payment is None:
            payment = Payment.objects.create(
                order=order,
                amount=order.grand_total,
                currency=getattr(settings, "DEFAULT_CURRENCY", "BDT"),
                provider=provider,
                status=GatewayPaymentStatus.INITIATED,
                provider_transaction_id=intent.provider_transaction_id,
                raw_response=intent.extra or {},
            )
        else:
            if intent.provider_transaction_id:
                payment.provider_transaction_id = intent.provider_transaction_id
            payment.raw_response = intent.extra or payment.raw_response
            payment.save(
                update_fields=["provider_transaction_id", "raw_response", "updated_at"]
            )

    return {
        "payment_id": payment.pk,
        "provider": intent.provider,
        "client_secret": intent.client_secret,
        "redirect_url": intent.redirect_url,
        "provider_transaction_id": intent.provider_transaction_id,
    }


def record_successful_payment(
    order,
    provider: str,
    amount: Decimal,
    currency: str,
    raw_response: dict | None = None,
    payment=None,
) -> Payment:
    """Create (or reuse) a SUCCEEDED Payment and mark the order PAID atomically.

    Single source of truth for "payment is confirmed": used by ManualGateway
    (COD), staff approval of a manual payment submission, and gateway
    webhooks (SSLCommerz / Stripe / PayPal). Payment creation and the
    order-status transition (with its inventory side effects) happen inside
    ONE transaction — if the transition fails for any reason, the payment row
    rolls back too.

    Args:
        order: The Order instance.
        provider: PaymentProvider choice string.
        amount: The confirmed amount.
        currency: ISO 4217 currency code.
        raw_response: Optional gateway/payload context stored on the Payment.
        payment: Optional existing Payment row (e.g. an INITIATED row created
            at initiate time) to upgrade to SUCCEEDED instead of creating one.

    Returns:
        The created/updated Payment.

    Raises:
        InvalidOrderTransitionError: If the order cannot transition to PAID.
    """
    from apps.orders.constants import OrderStatus
    from apps.orders.services import transition_order_status
    from apps.payments.constants import PaymentStatus as GatewayPaymentStatus

    with transaction.atomic():
        if payment is None:
            payment = Payment.objects.filter(
                order=order, provider=provider, status=GatewayPaymentStatus.INITIATED
            ).first()
        if payment is None:
            payment = Payment.objects.create(
                order=order,
                amount=amount,
                currency=currency,
                provider=provider,
                status=GatewayPaymentStatus.SUCCEEDED,
                raw_response=raw_response or {"note": "Payment confirmed."},
            )
        else:
            payment.amount = amount
            payment.currency = currency
            payment.status = GatewayPaymentStatus.SUCCEEDED
            payment.raw_response = raw_response or payment.raw_response or {}
            payment.save(
                update_fields=["amount", "currency", "status", "raw_response", "updated_at"]
            )
        logger.info(
            "Payment %s (provider=%s) succeeded for order %s",
            payment.pk, provider, order.order_number,
        )
        transition_order_status(order, OrderStatus.PAID, actor=None, note="Payment confirmed.")
    return payment


def record_failed_payment(order, provider: str, raw_response: dict | None = None) -> Payment | None:
    """Mark an order's pending payment as FAILED (gateway webhook failure).

    Updates the INITIATED Payment row to FAILED. Does not transition the order
    (PENDING_PAYMENT stays; the customer may retry payment). Idempotent — a
    later success webhook can still upgrade the order to PAID.

    Args:
        order: The Order instance.
        provider: PaymentProvider choice string.
        raw_response: Optional gateway payload stored on the Payment.

    Returns:
        The updated Payment, or None if no pending payment row exists.
    """
    from apps.payments.constants import PaymentStatus as GatewayPaymentStatus

    with transaction.atomic():
        payment = Payment.objects.filter(
            order=order, provider=provider, status=GatewayPaymentStatus.INITIATED
        ).first()
        if payment is None:
            logger.info(
                "No INITIATED payment to mark failed for order %s (provider=%s)",
                order.order_number, provider,
            )
            return None
        payment.status = GatewayPaymentStatus.FAILED
        payment.raw_response = raw_response or payment.raw_response or {}
        payment.save(update_fields=["status", "raw_response", "updated_at"])
        logger.info("Payment %s marked FAILED for order %s", payment.pk, order.order_number)
        return payment


def process_gateway_webhook(provider: str, payload: dict, raw_body: bytes, headers: dict) -> dict:
    """Route a verified gateway webhook to its handler with idempotency.

    Every event is logged to PaymentEventLog keyed by (provider, event_id);
    the unique constraint short-circuits replays so a payment can never be
    recorded twice for the same event (audit S-6).

    Args:
        provider: PaymentProvider choice string (uppercased).
        payload: Parsed JSON payload.
        raw_body: Raw request body bytes.
        headers: HTTP headers from the webhook request.

    Returns:
        Dict describing the outcome ("processed" | "duplicate" | "ignored").

    Raises:
        ValueError / WebhookVerificationError: If the signature is invalid.
    """
    import hashlib

    from apps.payments.models import PaymentEventLog

    gateway = get_gateway(provider)
    if gateway is None:
        raise ValueError(f"Unknown provider: {provider}")

    gateway.verify_signature(raw_body=raw_body, headers=headers)

    event_id = payload.get("id") or payload.get("tran_id") or ""
    event_type = payload.get("type") or payload.get("status") or ""
    payload_hash = hashlib.sha256(raw_body).hexdigest() if raw_body else ""

    if event_id:
        try:
            with transaction.atomic():
                PaymentEventLog.objects.create(
                    provider=provider,
                    event_id=event_id,
                    event_type=event_type or "UNKNOWN",
                    payload_hash=payload_hash,
                    raw_payload=payload,
                )
        except Exception:
            # Unique constraint hit → duplicate event. Find the existing log
            # and report it without re-processing.
            try:
                existing = PaymentEventLog.objects.get(provider=provider, event_id=event_id)
            except PaymentEventLog.DoesNotExist:
                raise
            logger.info(
                "Duplicate webhook event %s:%s — already processed (status=%s)",
                provider, event_id, existing.status,
            )
            return {
                "status": "duplicate",
                "event_id": event_id,
                "previous_status": existing.status,
            }

    try:
        gateway.handle_webhook(payload=payload, raw_body=raw_body, headers=headers)
    except Exception as exc:
        logger.error("Webhook handler failed for %s: %s", provider, exc, exc_info=True)
        if event_id:
            PaymentEventLog.objects.filter(provider=provider, event_id=event_id).update(
                status="FAILED"
            )
        raise

    if event_id:
        PaymentEventLog.objects.filter(provider=provider, event_id=event_id).update(
            status="SUCCEEDED"
        )

    return {"status": "processed", "event_id": event_id, "event_type": event_type}


def submit_manual_payment(
    order,
    user,
    method_id: int | None,
    reference_number: str,
    receipt=None,
    notes: str = "",
    guest_identity: dict | None = None,
) -> ManualPaymentSubmission:
    """Create a pending manual payment submission for an unpaid order.

    Args:
        order: The unpaid Order being paid via a manual method.
        user: The order's owner (registered orders). None for guest orders.
        method_id: Optional PaymentMethod PK for the method used.
        reference_number: Customer-provided transaction reference.
        receipt: Optional uploaded receipt file.
        notes: Optional customer notes.
        guest_identity: For guest orders (user=None): dict with phone_number
            OR (email + lookup_token) — the lookup secret that authorizes
            acting on the guest order (audit H-4).

    Returns:
        The created ManualPaymentSubmission (status=PENDING).

    Raises:
        PaymentSubmissionError: If the order is already paid, already has an
            approved submission, or the caller is not authorized.
    """
    from apps.orders.constants import PaymentStatus as OrderPaymentStatus
    from apps.orders.models import Order
    from apps.payments.exceptions import PaymentSubmissionError

    if user is not None:
        if order.user_id != user.pk:
            raise PaymentSubmissionError(
                message="This order does not belong to you.",
                details={"order_number": order.order_number},
            )
    else:
        # Guest order: verify the lookup secret (phone, or email + token).
        if order.user_id is not None or not _verify_guest_identity(order, guest_identity):
            raise PaymentSubmissionError(
                message="You are not authorized to act on this order.",
                details={"order_number": order.order_number},
            )
    if order.payment_status != OrderPaymentStatus.PENDING:
        raise PaymentSubmissionError(
            message="Only unpaid orders can be submitted for manual payment.",
            details={"order_number": order.order_number, "payment_status": order.payment_status},
        )
    method = None
    if method_id:
        from apps.payments.models import PaymentMethod
        method = PaymentMethod.objects.filter(pk=method_id, is_enabled=True).first()
        if method is None:
            raise PaymentSubmissionError(
                message="The selected payment method is not available.",
                details={"method_id": method_id},
            )

    with transaction.atomic():
        # Lock the order row so two concurrent submissions for the same order
        # cannot both pass the pending-submission check below (audit H-2,
        # reviewer note: duplicate admin emails / competing submissions).
        Order.objects.select_for_update().get(pk=order.pk)

        # One PENDING submission at a time: prevents duplicate admin-email spam
        # and narrows the concurrent double-approve race (audit H-2).
        pending = ManualPaymentSubmission.objects.filter(
            order=order, status=ManualPaymentSubmission.Status.PENDING
        )
        if pending.exists():
            raise PaymentSubmissionError(
                message="This order already has a pending payment submission.",
                details={"order_number": order.order_number},
            )
        if ManualPaymentSubmission.objects.filter(
            order=order, status=ManualPaymentSubmission.Status.APPROVED
        ).exists():
            raise PaymentSubmissionError(
                message="This order already has an approved payment submission.",
                details={"order_number": order.order_number},
            )

        submission = ManualPaymentSubmission.objects.create(
            order=order,
            user=user,
            method=method,
            reference_number=reference_number,
            receipt=receipt,
            notes=notes,
            status=ManualPaymentSubmission.Status.PENDING,
        )

    # Notify admins (outside the transaction — notification failure must not
    # roll back the submission).
    try:
        from apps.notifications.services import send_payment_submission_notification
        send_payment_submission_notification(submission)
    except Exception:
        logger.warning(
            "Failed to send payment-submission notification for %s",
            submission.order.order_number, exc_info=True,
        )

    return submission


def _verify_guest_identity(order, guest_identity: dict | None) -> bool:
    """Verify a guest's lookup secret against a guest order (audit H-4)."""
    from apps.orders.services import verify_guest_lookup_token

    if not guest_identity:
        return False
    phone = guest_identity.get("phone_number", "")
    if phone:
        snapshot_phone = (order.shipping_address_snapshot or {}).get(
            "phone_number", ""
        ) or ""
        return phone == order.guest_phone or phone == snapshot_phone
    email = guest_identity.get("email", "")
    token = guest_identity.get("lookup_token", "")
    return bool(
        email
        and order.guest_email
        and email.lower() == order.guest_email.lower()
        and verify_guest_lookup_token(order, token)
    )


def review_manual_payment(
    submission,
    approve: bool,
    actor,
    admin_note: str = "",
) -> ManualPaymentSubmission:
    """Staff review of a manual payment submission.

    Approving records a SUCCEEDED Payment (provider from the submission's
    method, falling back to MANUAL) and transitions the order to PAID — all
    atomically. Rejecting only updates the submission status so the customer
    can resubmit.

    Args:
        submission: The ManualPaymentSubmission instance.
        approve: True to approve (mark order paid), False to reject.
        actor: The staff user performing the review.
        admin_note: Optional note visible to the customer/staff.

    Returns:
        The updated submission.

    Raises:
        SubmissionAlreadyReviewedError: If already reviewed.
        InvalidOrderTransitionError / DuplicatePaymentError: If the order
            can no longer be paid (rolled back, submission stays PENDING).
    """
    from django.utils import timezone

    from apps.payments.constants import PaymentProvider
    from apps.payments.exceptions import SubmissionAlreadyReviewedError

    with transaction.atomic():
        locked = ManualPaymentSubmission.objects.select_for_update().get(pk=submission.pk)
        if locked.status != ManualPaymentSubmission.Status.PENDING:
            raise SubmissionAlreadyReviewedError(
                message="This payment submission has already been reviewed.",
                details={
                    "submission_id": locked.pk,
                    "status": locked.status,
                },
            )

        if approve:
            provider = (
                locked.method.provider
                if locked.method is not None
                else PaymentProvider.MANUAL
            )
            payment = record_successful_payment(
                locked.order,
                provider=provider,
                amount=locked.order.grand_total,
                currency=getattr(settings, "DEFAULT_CURRENCY", "BDT"),
                raw_response={
                    "manual_submission_id": locked.pk,
                    "reference_number": locked.reference_number,
                },
            )
            locked.payment = payment
            locked.status = ManualPaymentSubmission.Status.APPROVED
        else:
            locked.status = ManualPaymentSubmission.Status.REJECTED

        locked.admin_note = admin_note
        locked.reviewed_by = actor
        locked.reviewed_at = timezone.now()
        locked.save(
            update_fields=["status", "admin_note", "reviewed_by", "reviewed_at", "updated_at"]
        )

    return locked


def process_refund(order, actor, amount: Decimal | None = None, reason: str = "") -> Refund:
    """Process a refund for a paid order (audit C-2).

    Creates a Refund record, marks the order's successful Payment REFUNDED,
    and transitions the order to REFUNDED — which restocks the committed
    sale back to inventory inside the same transaction.

    Args:
        order: The paid Order to refund.
        actor: The staff user processing the refund.
        amount: Refund amount; defaults to the order's grand total.
        reason: Optional refund reason.

    Returns:
        The created Refund.

    Raises:
        OrderNotRefundableError: If the order is not paid.
        AlreadyRefundedError: If the order already has a refund.
        RefundError: If the amount is invalid.
    """
    from apps.orders.constants import (
        ALLOWED_TRANSITIONS,
        OrderStatus,
    )
    from apps.orders.constants import (
        PaymentStatus as OrderPaymentStatus,
    )
    from apps.orders.services import transition_order_status
    from apps.payments.constants import PaymentStatus as GatewayPaymentStatus
    from apps.payments.exceptions import (
        AlreadyRefundedError,
        OrderNotRefundableError,
        RefundError,
    )

    if order.payment_status != OrderPaymentStatus.PAID:
        raise OrderNotRefundableError(
            message="Only paid orders can be refunded.",
            details={"order_number": order.order_number, "payment_status": order.payment_status},
        )
    # The order's current status must legally reach REFUNDED (e.g. SHIPPED
    # must be delivered first). Fail BEFORE creating anything so the caller
    # gets a clean error instead of a rolled-back half-flow.
    if OrderStatus.REFUNDED not in ALLOWED_TRANSITIONS.get(order.status, []):
        raise OrderNotRefundableError(
            message=(
                f"Order {order.order_number} cannot be refunded from its current "
                f"status ({order.status})."
            ),
            details={"order_number": order.order_number, "order_status": order.status},
        )
    if Refund.objects.filter(order=order).exists():
        raise AlreadyRefundedError(
            message=f"Order {order.order_number} has already been refunded.",
            details={"order_number": order.order_number},
        )

    refund_amount = amount if amount is not None else order.grand_total
    if refund_amount <= 0 or refund_amount > order.grand_total:
        raise RefundError(
            message="Refund amount must be greater than zero and no more than the order total.",
            details={
                "order_number": order.order_number,
                "order_total": str(order.grand_total),
                "requested": str(refund_amount),
            },
        )
    # Full-refund only in this version: a partial refund would leave the order
    # marked REFUNDED while only part of the money is returned. Partial-refund
    # semantics need a sum-of-refunds model (product decision) — see the
    # additional audit.
    if refund_amount != order.grand_total:
        raise RefundError(
            message="Only full refunds are supported in this version.",
            details={
                "order_number": order.order_number,
                "order_total": str(order.grand_total),
                "requested": str(refund_amount),
            },
        )

    with transaction.atomic():
        refund = Refund.objects.create(
            order=order,
            amount=refund_amount,
            currency=getattr(settings, "DEFAULT_CURRENCY", "BDT"),
            reason=reason,
            status=Refund.Status.SUCCEEDED,
            created_by=actor,
        )
        # Mark the successful payment refunded (if a row exists).
        Payment.objects.filter(order=order, status=GatewayPaymentStatus.SUCCEEDED).update(
            status=GatewayPaymentStatus.REFUNDED
        )
        # Transitions the order to REFUNDED and restocks inventory in the
        # same transaction (transition_order_status handles side effects).
        transition_order_status(
            order, OrderStatus.REFUNDED, actor=actor, note=reason or "Refund processed."
        )

    logger.info(
        "Refund %s created for order %s (amount=%s)",
        refund.pk, order.order_number, refund_amount,
    )
    return refund
