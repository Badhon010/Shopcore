"""Custom middleware for ShopCore."""
from __future__ import annotations

import uuid

_request_id_var: str | None = None


class RequestIdMiddleware:
    """Attaches a UUID to each request for log correlation.

    The request ID is stored on the request object as ``request.id`` and
    in a thread-local (via logging filter) so it appears in every log line
    emitted during the request's lifetime.
    """

    def __init__(self, get_response) -> None:
        self.get_response = get_response

    def __call__(self, request):
        request_id = str(uuid.uuid4())
        request.id = request_id
        # Make request ID available to logging filter
        import threading

        _store = getattr(threading.current_thread(), "_shopcore_request_id", None)
        threading.current_thread()._shopcore_request_id = request_id

        response = self.get_response(request)
        response["X-Request-ID"] = request_id
        return response
