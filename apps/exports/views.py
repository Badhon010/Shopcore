"""CSV and Excel export views for ShopCore admin."""
from __future__ import annotations

import csv
import io
import logging
from datetime import datetime

from django.http import HttpResponse, StreamingHttpResponse
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsStaffUser

logger = logging.getLogger("shopcore.exports.views")

ALLOWED_FORMATS = {"csv", "xlsx"}


def _get_format(request) -> str:
    fmt = request.query_params.get("format", "csv").lower()
    return fmt if fmt in ALLOWED_FORMATS else "csv"


def _csv_response(filename: str, headers: list[str], rows):
    """Return a StreamingHttpResponse for a CSV download."""

    class Echo:
        def write(self, value):
            return value

    pseudo_buffer = Echo()
    writer = csv.writer(pseudo_buffer)

    def stream():
        yield writer.writerow(headers)
        for row in rows:
            yield writer.writerow(row)

    response = StreamingHttpResponse(stream(), content_type="text/csv")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


def _xlsx_response(filename: str, headers: list[str], rows):
    """Return an HttpResponse containing an xlsx workbook."""
    try:
        import openpyxl
        from openpyxl.styles import Font
    except ImportError:
        return HttpResponse(
            "openpyxl is required for Excel export. Install it with: pip install openpyxl",
            status=501,
            content_type="text/plain",
        )

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(headers)
    for cell in ws[1]:
        cell.font = Font(bold=True)

    for row in rows:
        ws.append([str(v) if v is not None else "" for v in row])

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    response = HttpResponse(
        buffer.read(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


def _build_response(request, filename_base: str, headers: list[str], rows):
    fmt = _get_format(request)
    ts = timezone.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{filename_base}_{ts}.{fmt}"
    if fmt == "xlsx":
        return _xlsx_response(filename, headers, list(rows))
    return _csv_response(filename, headers, rows)


# ── Export views ───────────────────────────────────────────────────────────────

@extend_schema(
    summary="Export products",
    description="Stream a CSV or Excel export of all products. Supports status and category filters.",
    parameters=[
        OpenApiParameter("format", str, description="csv or xlsx (default: csv)"),
        OpenApiParameter("status", str, description="Filter by product status: DRAFT|PUBLISHED|ARCHIVED"),
        OpenApiParameter("category", int, description="Filter by category ID"),
        OpenApiParameter("brand", int, description="Filter by brand ID"),
    ],
    tags=["Exports"],
)
class ExportProductsView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request, *args, **kwargs):
        from apps.catalog.models import Product

        qs = (
            Product.all_objects.select_related("category", "brand")
            .prefetch_related("images")
            .order_by("name")
        )
        if status_param := request.query_params.get("status"):
            qs = qs.filter(status=status_param)
        if category_param := request.query_params.get("category"):
            try:
                qs = qs.filter(category_id=int(category_param))
            except ValueError:
                pass
        if brand_param := request.query_params.get("brand"):
            try:
                qs = qs.filter(brand_id=int(brand_param))
            except ValueError:
                pass

        headers = [
            "ID", "Name", "Slug", "SKU", "Status", "Category", "Brand",
            "Base Price", "Compare At Price", "Is Featured", "Weight (kg)",
            "Average Rating", "Review Count", "Is Active", "Created At",
        ]

        def rows():
            for p in qs.iterator(chunk_size=500):
                yield [
                    p.pk, p.name, p.slug, p.sku, p.status,
                    p.category.name if p.category else "",
                    p.brand.name if p.brand else "",
                    p.base_price, p.compare_at_price or "",
                    p.is_featured, p.weight_kg or "",
                    p.average_rating, p.review_count, p.is_active,
                    p.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                ]

        return _build_response(request, "products", headers, rows())


@extend_schema(
    summary="Export orders",
    description="Stream a CSV or Excel export of orders. Supports status and date filters.",
    parameters=[
        OpenApiParameter("format", str, description="csv or xlsx (default: csv)"),
        OpenApiParameter("status", str, description="Filter by order status"),
        OpenApiParameter("payment_status", str, description="Filter by payment status"),
        OpenApiParameter("date_from", str, description="placed_at >= date (YYYY-MM-DD)"),
        OpenApiParameter("date_to", str, description="placed_at <= date (YYYY-MM-DD)"),
    ],
    tags=["Exports"],
)
class ExportOrdersView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request, *args, **kwargs):
        from apps.orders.models import Order

        qs = Order.objects.select_related("user").order_by("-placed_at")
        if status_param := request.query_params.get("status"):
            qs = qs.filter(status=status_param)
        if ps := request.query_params.get("payment_status"):
            qs = qs.filter(payment_status=ps)
        if df := request.query_params.get("date_from"):
            qs = qs.filter(placed_at__date__gte=df)
        if dt := request.query_params.get("date_to"):
            qs = qs.filter(placed_at__date__lte=dt)

        headers = [
            "Order Number", "Customer Email", "Status", "Payment Status",
            "Subtotal", "Discount Total", "Shipping Cost", "Tax Total", "Grand Total",
            "Coupon Code", "Placed At",
        ]

        def rows():
            for o in qs.iterator(chunk_size=500):
                yield [
                    o.order_number, o.user.email, o.status, o.payment_status,
                    o.subtotal, o.discount_total, o.shipping_cost,
                    o.tax_total, o.grand_total,
                    o.coupon_code_snapshot or "",
                    o.placed_at.strftime("%Y-%m-%d %H:%M:%S"),
                ]

        return _build_response(request, "orders", headers, rows())


@extend_schema(
    summary="Export customers",
    description="Stream a CSV or Excel export of all customer accounts.",
    parameters=[
        OpenApiParameter("format", str, description="csv or xlsx (default: csv)"),
        OpenApiParameter("is_active", str, description="true or false"),
        OpenApiParameter("is_staff", str, description="true or false"),
    ],
    tags=["Exports"],
)
class ExportCustomersView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request, *args, **kwargs):
        from apps.accounts.models import User

        qs = User.objects.order_by("-date_joined")
        if ia := request.query_params.get("is_active"):
            qs = qs.filter(is_active=ia.lower() == "true")
        if is_s := request.query_params.get("is_staff"):
            qs = qs.filter(is_staff=is_s.lower() == "true")

        headers = [
            "ID", "Email", "First Name", "Last Name", "Phone",
            "Is Active", "Is Staff", "Email Verified", "Date Joined",
        ]

        def rows():
            for u in qs.iterator(chunk_size=500):
                yield [
                    u.pk, u.email, u.first_name, u.last_name,
                    u.phone_number or "",
                    u.is_active, u.is_staff, u.is_email_verified,
                    u.date_joined.strftime("%Y-%m-%d %H:%M:%S"),
                ]

        return _build_response(request, "customers", headers, rows())


@extend_schema(
    summary="Export newsletter subscribers",
    description="Stream a CSV or Excel export of newsletter subscribers.",
    parameters=[
        OpenApiParameter("format", str, description="csv or xlsx (default: csv)"),
        OpenApiParameter("active", str, description="true or false"),
    ],
    tags=["Exports"],
)
class ExportSubscribersView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request, *args, **kwargs):
        from apps.newsletter.models import NewsletterSubscriber

        qs = NewsletterSubscriber.objects.order_by("-created_at")
        if active_param := request.query_params.get("active"):
            qs = qs.filter(active=active_param.lower() == "true")

        headers = ["ID", "Email", "Active", "Subscribed At"]

        def rows():
            for s in qs.iterator(chunk_size=1000):
                yield [s.pk, s.email, s.active, s.created_at.strftime("%Y-%m-%d %H:%M:%S")]

        return _build_response(request, "subscribers", headers, rows())


@extend_schema(
    summary="Export product reviews",
    description="Stream a CSV or Excel export of product reviews.",
    parameters=[
        OpenApiParameter("format", str, description="csv or xlsx (default: csv)"),
        OpenApiParameter("is_approved", str, description="true or false"),
        OpenApiParameter("min_rating", int, description="Minimum rating (1-5)"),
        OpenApiParameter("max_rating", int, description="Maximum rating (1-5)"),
    ],
    tags=["Exports"],
)
class ExportReviewsView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request, *args, **kwargs):
        from apps.reviews.models import Review

        qs = Review.objects.select_related("user", "product").order_by("-created_at")
        if ia := request.query_params.get("is_approved"):
            qs = qs.filter(is_approved=ia.lower() == "true")
        if mr := request.query_params.get("min_rating"):
            try:
                qs = qs.filter(rating__gte=int(mr))
            except ValueError:
                pass
        if xr := request.query_params.get("max_rating"):
            try:
                qs = qs.filter(rating__lte=int(xr))
            except ValueError:
                pass

        headers = [
            "ID", "Product", "Customer Email", "Rating", "Title",
            "Verified Purchase", "Approved", "Created At",
        ]

        def rows():
            for r in qs.iterator(chunk_size=500):
                yield [
                    r.pk, r.product.name, r.user.email, r.rating, r.title,
                    r.is_verified_purchase, r.is_approved,
                    r.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                ]

        return _build_response(request, "reviews", headers, rows())


@extend_schema(
    summary="Export inventory",
    description="Stream a CSV or Excel export of all stock items.",
    parameters=[
        OpenApiParameter("format", str, description="csv or xlsx (default: csv)"),
        OpenApiParameter("low_stock_only", str, description="true — only items at or below threshold"),
        OpenApiParameter("out_of_stock_only", str, description="true — only items with 0 on hand"),
    ],
    tags=["Exports"],
)
class ExportInventoryView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request, *args, **kwargs):
        from apps.inventory.models import StockItem

        qs = (
            StockItem.objects.select_related("variant__product", "warehouse")
            .order_by("variant__sku")
        )
        if request.query_params.get("out_of_stock_only", "").lower() == "true":
            qs = qs.filter(quantity_on_hand=0)
        elif request.query_params.get("low_stock_only", "").lower() == "true":
            from django.db.models import F
            qs = qs.filter(quantity_on_hand__lte=F("low_stock_threshold"))

        headers = [
            "Stock Item ID", "SKU", "Product", "Warehouse",
            "On Hand", "Reserved", "Available", "Low Stock Threshold", "Is Low Stock",
        ]

        def rows():
            for s in qs.iterator(chunk_size=500):
                yield [
                    s.pk, s.variant.sku, s.variant.product.name, s.warehouse.name,
                    s.quantity_on_hand, s.quantity_reserved, s.quantity_available,
                    s.low_stock_threshold, s.is_low_stock,
                ]

        return _build_response(request, "inventory", headers, rows())
