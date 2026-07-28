"""Global search view for ShopCore admin."""
from __future__ import annotations

import logging

from django.db.models import Q
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.pagination import StandardResultsSetPagination
from apps.common.permissions import IsStaffUser

logger = logging.getLogger("shopcore.search.views")

MAX_PER_TYPE = 50  # max results per resource type in global search


def _paginate(request, items: list, resource_type: str):
    """Apply simple offset/limit pagination to an in-memory list."""
    try:
        page = max(1, int(request.query_params.get("page", 1)))
        page_size = max(1, min(100, int(request.query_params.get("page_size", 20))))
    except (ValueError, TypeError):
        page, page_size = 1, 20
    start = (page - 1) * page_size
    return items[start: start + page_size], len(items)


@extend_schema(
    summary="Global admin search",
    description=(
        "Search across products, categories, brands, orders, customers, reviews, and "
        "newsletter subscribers in a single request. Results are grouped by type. "
        "Use the `types` filter to restrict which resource types are queried."
    ),
    parameters=[
        OpenApiParameter("q", str, required=True, description="Search query (min 2 characters)"),
        OpenApiParameter(
            "types",
            str,
            description=(
                "Comma-separated list of resource types to include: "
                "product,category,brand,order,customer,review,subscriber. "
                "Default: all types."
            ),
        ),
        OpenApiParameter("page", int, description="Page number (default 1)"),
        OpenApiParameter("page_size", int, description="Results per type per page (default 20, max 100)"),
    ],
    tags=["Search"],
)
class GlobalSearchView(APIView):
    """Staff-only: search across all resource types."""

    permission_classes = [IsStaffUser]

    # Map type names to handler methods
    SUPPORTED_TYPES = frozenset(
        ["product", "category", "brand", "order", "customer", "review", "subscriber"]
    )

    def get(self, request, *args, **kwargs):
        q = request.query_params.get("q", "").strip()
        if len(q) < 2:
            return Response(
                {"detail": "Search query must be at least 2 characters."},
                status=400,
            )

        types_param = request.query_params.get("types", "")
        if types_param:
            requested_types = {t.strip() for t in types_param.split(",") if t.strip()}
            active_types = requested_types & self.SUPPORTED_TYPES
        else:
            active_types = self.SUPPORTED_TYPES

        try:
            page = max(1, int(request.query_params.get("page", 1)))
            page_size = max(1, min(100, int(request.query_params.get("page_size", 20))))
        except (ValueError, TypeError):
            page, page_size = 1, 20

        offset = (page - 1) * page_size
        results: dict[str, dict] = {}

        if "product" in active_types:
            results["product"] = self._search_products(q, offset, page_size)
        if "category" in active_types:
            results["category"] = self._search_categories(q, offset, page_size)
        if "brand" in active_types:
            results["brand"] = self._search_brands(q, offset, page_size)
        if "order" in active_types:
            results["order"] = self._search_orders(q, offset, page_size)
        if "customer" in active_types:
            results["customer"] = self._search_customers(q, offset, page_size)
        if "review" in active_types:
            results["review"] = self._search_reviews(q, offset, page_size)
        if "subscriber" in active_types:
            results["subscriber"] = self._search_subscribers(q, offset, page_size)

        return Response(
            {
                "query": q,
                "page": page,
                "page_size": page_size,
                "results": results,
            }
        )

    # ── per-type handlers ──────────────────────────────────────────────────────

    def _search_products(self, q: str, offset: int, limit: int) -> dict:
        from apps.catalog.models import Product

        qs = (
            Product.all_objects.filter(
                Q(name__icontains=q)
                | Q(sku__icontains=q)
                | Q(description__icontains=q)
                | Q(short_description__icontains=q)
            )
            .select_related("category", "brand")
            .order_by("-created_at")
        )
        total = qs.count()
        items = [
            {
                "type": "product",
                "id": p.pk,
                "title": p.name,
                "subtitle": p.sku or "",
                "url": f"/admin/products/{p.slug}/",
                "extra": {
                    "status": p.status,
                    "base_price": str(p.base_price),
                    "category": p.category.name if p.category else None,
                    "brand": p.brand.name if p.brand else None,
                },
            }
            for p in qs[offset: offset + limit]
        ]
        return {"total": total, "items": items}

    def _search_categories(self, q: str, offset: int, limit: int) -> dict:
        from apps.catalog.models import Category

        qs = (
            Category.all_objects.filter(Q(name__icontains=q) | Q(slug__icontains=q))
            .select_related("parent")
            .order_by("name")
        )
        total = qs.count()
        items = [
            {
                "type": "category",
                "id": c.pk,
                "title": c.name,
                "subtitle": c.slug,
                "url": f"/admin/categories/{c.pk}/",
                "extra": {"parent": c.parent.name if c.parent else None, "is_active": str(c.is_active)},
            }
            for c in qs[offset: offset + limit]
        ]
        return {"total": total, "items": items}

    def _search_brands(self, q: str, offset: int, limit: int) -> dict:
        from apps.catalog.models import Brand

        qs = (
            Brand.all_objects.filter(Q(name__icontains=q) | Q(slug__icontains=q))
            .order_by("name")
        )
        total = qs.count()
        items = [
            {
                "type": "brand",
                "id": b.pk,
                "title": b.name,
                "subtitle": b.slug,
                "url": f"/admin/brands/{b.pk}/",
                "extra": {"is_active": str(b.is_active)},
            }
            for b in qs[offset: offset + limit]
        ]
        return {"total": total, "items": items}

    def _search_orders(self, q: str, offset: int, limit: int) -> dict:
        from apps.orders.models import Order

        qs = (
            Order.objects.filter(
                Q(order_number__icontains=q) | Q(user__email__icontains=q)
            )
            .select_related("user")
            .order_by("-placed_at")
        )
        total = qs.count()
        items = [
            {
                "type": "order",
                "id": o.pk,
                "title": o.order_number,
                "subtitle": o.user.email,
                "url": f"/admin/orders/{o.order_number}/",
                "extra": {
                    "status": o.status,
                    "payment_status": o.payment_status,
                    "grand_total": str(o.grand_total),
                },
            }
            for o in qs[offset: offset + limit]
        ]
        return {"total": total, "items": items}

    def _search_customers(self, q: str, offset: int, limit: int) -> dict:
        from apps.accounts.models import User

        qs = (
            User.objects.filter(
                Q(email__icontains=q)
                | Q(first_name__icontains=q)
                | Q(last_name__icontains=q)
                | Q(phone_number__icontains=q)
            )
            .order_by("-date_joined")
        )
        total = qs.count()
        items = [
            {
                "type": "customer",
                "id": u.pk,
                "title": u.email,
                "subtitle": u.get_full_name(),
                "url": f"/admin/users/{u.pk}/",
                "extra": {
                    "is_active": str(u.is_active),
                    "is_staff": str(u.is_staff),
                    "is_email_verified": str(u.is_email_verified),
                },
            }
            for u in qs[offset: offset + limit]
        ]
        return {"total": total, "items": items}

    def _search_reviews(self, q: str, offset: int, limit: int) -> dict:
        from apps.reviews.models import Review

        qs = (
            Review.objects.filter(
                Q(title__icontains=q)
                | Q(body__icontains=q)
                | Q(user__email__icontains=q)
                | Q(product__name__icontains=q)
            )
            .select_related("user", "product")
            .order_by("-created_at")
        )
        total = qs.count()
        items = [
            {
                "type": "review",
                "id": r.pk,
                "title": r.title,
                "subtitle": r.user.email,
                "url": f"/admin/reviews/{r.pk}/",
                "extra": {
                    "product": r.product.name,
                    "rating": str(r.rating),
                    "is_approved": str(r.is_approved),
                },
            }
            for r in qs[offset: offset + limit]
        ]
        return {"total": total, "items": items}

    def _search_subscribers(self, q: str, offset: int, limit: int) -> dict:
        from apps.newsletter.models import NewsletterSubscriber

        qs = NewsletterSubscriber.objects.filter(email__icontains=q).order_by("-created_at")
        total = qs.count()
        items = [
            {
                "type": "subscriber",
                "id": s.pk,
                "title": s.email,
                "subtitle": "",
                "url": f"/admin/subscribers/{s.pk}/",
                "extra": {"active": str(s.active)},
            }
            for s in qs[offset: offset + limit]
        ]
        return {"total": total, "items": items}
