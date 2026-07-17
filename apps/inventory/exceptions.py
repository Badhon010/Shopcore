from __future__ import annotations
from apps.common.exceptions import AppBaseException


class InsufficientStockError(AppBaseException):
    """Raised when requested quantity exceeds available stock."""
    code = "INSUFFICIENT_STOCK"
    default_message = "Insufficient stock available."
    status_code = 409

    def __init__(self, variant_sku: str, requested: int, available: int) -> None:
        super().__init__(
            message=f"Only {available} unit(s) of '{variant_sku}' are available.",
            details={"variant_sku": variant_sku, "requested": requested, "available": available},
        )
