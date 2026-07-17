from __future__ import annotations
from apps.common.exceptions import AppBaseException


class CartNotFoundError(AppBaseException):
    code = "CART_NOT_FOUND"
    default_message = "No active cart found."
    status_code = 404


class CartItemNotFoundError(AppBaseException):
    code = "CART_ITEM_NOT_FOUND"
    default_message = "Cart item not found."
    status_code = 404


class InvalidQuantityError(AppBaseException):
    code = "INVALID_QUANTITY"
    default_message = "Quantity must be at least 1."
    status_code = 400


class VariantNotFoundError(AppBaseException):
    code = "VARIANT_NOT_FOUND"
    default_message = "Product variant not found."
    status_code = 404


class VariantUnavailableError(AppBaseException):
    code = "VARIANT_UNAVAILABLE"
    default_message = "This product variant is not available."
    status_code = 400
