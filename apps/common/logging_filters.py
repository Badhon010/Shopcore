"""Logging filters for the ShopCore application."""
from __future__ import annotations

import logging
import threading


class RequestIdFilter(logging.Filter):
    """Injects the current request ID into log records."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = getattr(
            threading.current_thread(), "_shopcore_request_id", "N/A"
        )
        return True
