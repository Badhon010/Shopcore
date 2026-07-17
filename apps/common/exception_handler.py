"""Custom DRF exception handler that produces a consistent JSON error envelope.

Every error response from the API has the shape::

    {
        "error": {
            "code": "SCREAMING_SNAKE_CASE",
            "message": "Human-readable description.",
            "details": {}   // optional extra context
        }
    }

Unhandled exceptions in production return a generic INTERNAL_ERROR response and
log the full traceback server-side.
"""
from __future__ import annotations

import logging

from django.conf import settings
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

from apps.common.exceptions import AppBaseException

logger = logging.getLogger("shopcore.exception_handler")


def custom_exception_handler(exc: Exception, context: dict) -> Response | None:
    """Convert all exceptions into the standard error envelope.

    Args:
        exc: The raised exception.
        context: DRF context dict (view, request, args, kwargs).

    Returns:
        A DRF ``Response`` with the standard error shape, or ``None`` if the
        exception should be handled by the default handler.
    """
    # Let DRF handle its own exceptions first (builds a Response for us).
    response = exception_handler(exc, context)

    if isinstance(exc, AppBaseException):
        return Response(
            {
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "details": exc.details,
                }
            },
            status=exc.status_code,
        )

    if response is not None:
        # DRF handled it (ValidationError, NotFound, etc.)
        code = _derive_code(exc, response)
        message = _flatten_drf_errors(response.data)
        return Response(
            {
                "error": {
                    "code": code,
                    "message": message,
                    "details": response.data if isinstance(response.data, dict) else {},
                }
            },
            status=response.status_code,
        )

    # Truly unhandled exception — log full traceback, return generic message.
    logger.exception(
        "Unhandled exception in request",
        exc_info=exc,
        extra={"request": context.get("request")},
    )

    if settings.DEBUG:
        # In debug mode, re-raise so the Django debug page shows the traceback.
        return None

    return Response(
        {
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "Something went wrong. Please try again later.",
                "details": {},
            }
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )


def _derive_code(exc: Exception, response: Response) -> str:
    """Derive a stable error code string from a DRF exception."""
    from rest_framework import exceptions as drf_exc

    mapping = {
        drf_exc.ValidationError: "VALIDATION_ERROR",
        drf_exc.AuthenticationFailed: "AUTHENTICATION_FAILED",
        drf_exc.NotAuthenticated: "NOT_AUTHENTICATED",
        drf_exc.PermissionDenied: "PERMISSION_DENIED",
        drf_exc.NotFound: "NOT_FOUND",
        drf_exc.MethodNotAllowed: "METHOD_NOT_ALLOWED",
        drf_exc.Throttled: "THROTTLED",
    }
    for exc_class, code in mapping.items():
        if isinstance(exc, exc_class):
            return code
    return f"HTTP_{response.status_code}"


def _flatten_drf_errors(data: dict | list | str) -> str:
    """Flatten DRF error data into a single human-readable string."""
    if isinstance(data, str):
        return data
    if isinstance(data, list):
        return " ".join(str(item) for item in data)
    if isinstance(data, dict):
        messages = []
        for key, value in data.items():
            if isinstance(value, list):
                messages.append(f"{key}: {', '.join(str(v) for v in value)}")
            else:
                messages.append(f"{key}: {value}")
        return " | ".join(messages)
    return str(data)
