from __future__ import annotations
from apps.common.exceptions import AppBaseException


class DuplicatePaymentError(AppBaseException):
    """Raised when a caller tries to initiate payment for an order that
    already has a successful payment (or is already marked paid)."""
    code = "DUPLICATE_PAYMENT"
    default_message = "This order already has a successful payment."
    status_code = 409
