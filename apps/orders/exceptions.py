from __future__ import annotations

from apps.common.exceptions import AppBaseException


class OrderNotFoundError(AppBaseException):
    code = "ORDER_NOT_FOUND"
    default_message = "Order not found."
    status_code = 404


class InvalidOrderTransitionError(AppBaseException):
    code = "INVALID_ORDER_TRANSITION"
    default_message = "This order status transition is not allowed."
    status_code = 400


class EmptyCartError(AppBaseException):
    code = "EMPTY_CART"
    default_message = "Cannot place an order with an empty cart."
    status_code = 400


class CheckoutError(AppBaseException):
    code = "CHECKOUT_ERROR"
    default_message = "An error occurred during checkout."
    status_code = 400


class OrderCancellationNotAllowedError(AppBaseException):
    """Raised when a customer tries to cancel an order that has already been
    paid. Paid orders must go through the refund flow instead (audit C-1)."""

    code = "ORDER_CANCELLATION_NOT_ALLOWED"
    default_message = "Only unpaid orders can be cancelled. Paid orders must be refunded instead."
    status_code = 400
