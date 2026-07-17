"""Domain exceptions for the wishlist app."""
from __future__ import annotations

from apps.common.exceptions import AppBaseException


class VariantNotFoundError(AppBaseException):
    code = "VARIANT_NOT_FOUND"
    default_message = "No active variant found for this product."
    status_code = 404
