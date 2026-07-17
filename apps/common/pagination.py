"""Standard pagination classes for the ShopCore API."""
from __future__ import annotations

from rest_framework.pagination import PageNumberPagination


class StandardResultsSetPagination(PageNumberPagination):
    """Default paginator: 20 per page, max 100, configurable via query param."""

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class LargeResultsSetPagination(PageNumberPagination):
    """Large paginator for admin-style bulk export endpoints."""

    page_size = 100
    page_size_query_param = "page_size"
    max_page_size = 1000
