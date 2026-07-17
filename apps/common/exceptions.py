"""Base exception classes for the ShopCore application."""
from __future__ import annotations


class AppBaseException(Exception):
    """Base exception for all ShopCore application exceptions.

    Every subclass must define:
        - ``code``: SCREAMING_SNAKE_CASE string used as the ``error.code`` in API responses.
        - ``default_message``: Human-readable fallback message.
        - ``status_code``: HTTP status code (default 400).
    """

    code: str = "APP_ERROR"
    default_message: str = "An application error occurred."
    status_code: int = 400

    def __init__(
        self,
        message: str | None = None,
        details: dict | None = None,
    ) -> None:
        self.message = message or self.default_message
        self.details = details or {}
        super().__init__(self.message)
