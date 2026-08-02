from __future__ import annotations

from apps.common.exceptions import AppBaseException


class DuplicatePaymentError(AppBaseException):
    """Raised when a caller tries to initiate payment for an order that
    already has a successful payment (or is already marked paid)."""
    code = "DUPLICATE_PAYMENT"
    default_message = "This order already has a successful payment."
    status_code = 409


class RefundError(AppBaseException):
    """Generic refund-processing error (e.g. invalid amount)."""

    code = "REFUND_ERROR"
    default_message = "The refund could not be processed."
    status_code = 400


class OrderNotRefundableError(AppBaseException):
    """Raised when a refund is attempted on an order that is not paid."""

    code = "ORDER_NOT_REFUNDABLE"
    default_message = "Only paid orders can be refunded."
    status_code = 400


class AlreadyRefundedError(AppBaseException):
    """Raised when a refund is attempted on an order that already has one."""

    code = "ALREADY_REFUNDED"
    default_message = "This order has already been refunded."
    status_code = 409


class PaymentSubmissionError(AppBaseException):
    """Raised when a manual payment submission cannot be created."""

    code = "PAYMENT_SUBMISSION_ERROR"
    default_message = "The payment submission could not be created."
    status_code = 400


class SubmissionAlreadyReviewedError(AppBaseException):
    """Raised when a manual payment submission is reviewed more than once."""

    code = "SUBMISSION_ALREADY_REVIEWED"
    default_message = "This payment submission has already been reviewed."
    status_code = 409


class PaymentMethodNotAvailableError(AppBaseException):
    """Raised when a payment method is disabled or does not exist."""

    code = "PAYMENT_METHOD_NOT_AVAILABLE"
    default_message = "This payment method is not available."
    status_code = 400


class GatewayNotConfiguredError(AppBaseException):
    """Raised when a gateway-backed payment method is used before its
    credentials are configured in the environment (H-3). The gateway must
    fail gracefully with this error instead of crashing."""

    code = "GATEWAY_NOT_CONFIGURED"
    default_message = "This payment method is not configured yet."
    status_code = 400


class GatewayError(AppBaseException):
    """Generic gateway processing error (initiate/webhook/refund failure)."""

    code = "GATEWAY_ERROR"
    default_message = "The payment gateway reported an error."
    status_code = 400


class WebhookVerificationError(AppBaseException):
    """Raised when a webhook signature/verification fails."""

    code = "WEBHOOK_VERIFICATION_FAILED"
    default_message = "Webhook signature verification failed."
    status_code = 400


class WebhookEventAlreadyProcessedError(AppBaseException):
    """Raised when a webhook event has already been processed (idempotency)."""

    code = "WEBHOOK_EVENT_ALREADY_PROCESSED"
    default_message = "This webhook event has already been processed."
    status_code = 200
