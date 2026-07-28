"""Dashboard and analytics views for ShopCore admin."""
from __future__ import annotations

import logging
from datetime import timedelta
from decimal import Decimal

from django.db.models import Avg, Count, F, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsStaffUser

logger = logging.getLogger("shopcore.dashboard.views")


def _growth_pct(current, previous) -> float:
    """Return percentage growth from previous to current period."""
    if not previous:
        return 100.0 if current else 0.0
    return round(float((current - previous) / previous * 100), 1)


def _period_bounds(days: int):
    """Return (now, period_start, prev_start) for the requested window."""
    now = timezone.now()
    period_start = now - timedelta(days=days)
    prev_start = period_start - timedelta(days=days)
    return now, period_start, prev_start


# ── Dashboard statistics ───────────────────────────────────────────────────────

@extend_schema(
    summary="Dashboard overview statistics",
    description=(
        "Returns a comprehensive set of KPIs for the admin dashboard. "
        "All figures come directly from database aggregation — no cached "
        "or mocked values. Query param `days` controls the comparison window "
        "(default 30, max 365)."
    ),
    parameters=[
        OpenApiParameter("days", int, description="Comparison window in days (default 30)"),
    ],
    tags=["Dashboard"],
)
class DashboardStatsView(APIView):
    """Staff-only: single endpoint for all dashboard KPIs."""

    permission_classes = [IsStaffUser]

    def get(self, request, *args, **kwargs):
        from apps.accounts.models import User
        from apps.catalog.models import Category, Product
        from apps.inventory.models import StockItem
        from apps.newsletter.models import NewsletterSubscriber
        from apps.orders.constants import PaymentStatus
        from apps.orders.models import Order, OrderItem
        from apps.reviews.models import Review

        try:
            days = max(1, min(365, int(request.query_params.get("days", 30))))
        except (ValueError, TypeError):
            days = 30

        now, period_start, prev_start = _period_bounds(days)

        # ── Revenue ──────────────────────────────────────────────────────────
        paid_qs = Order.objects.filter(payment_status=PaymentStatus.PAID)
        total_revenue = paid_qs.aggregate(v=Sum("grand_total"))["v"] or Decimal("0")
        cur_rev = paid_qs.filter(placed_at__gte=period_start).aggregate(v=Sum("grand_total"))["v"] or Decimal("0")
        prv_rev = paid_qs.filter(placed_at__gte=prev_start, placed_at__lt=period_start).aggregate(v=Sum("grand_total"))["v"] or Decimal("0")

        total_paid_orders = paid_qs.count()
        aov = (total_revenue / total_paid_orders) if total_paid_orders else Decimal("0")

        # ── Orders ───────────────────────────────────────────────────────────
        total_orders = Order.objects.count()
        cur_orders = Order.objects.filter(placed_at__gte=period_start).count()
        prv_orders = Order.objects.filter(placed_at__gte=prev_start, placed_at__lt=period_start).count()
        status_breakdown = {
            row["status"]: row["cnt"]
            for row in Order.objects.values("status").annotate(cnt=Count("id"))
        }

        # ── Customers ────────────────────────────────────────────────────────
        customers_qs = User.objects.filter(is_staff=False)
        total_customers = customers_qs.count()
        cur_customers = customers_qs.filter(date_joined__gte=period_start).count()
        prv_customers = customers_qs.filter(date_joined__gte=prev_start, date_joined__lt=period_start).count()

        # ── Products ─────────────────────────────────────────────────────────
        from apps.catalog.constants import ProductStatus
        products_by_status = {
            row["status"]: row["cnt"]
            for row in Product.all_objects.values("status").annotate(cnt=Count("id"))
        }

        # ── Categories ───────────────────────────────────────────────────────
        total_categories = Category.objects.filter(is_active=True).count()

        # ── Inventory ────────────────────────────────────────────────────────
        low_stock_count = StockItem.objects.filter(
            quantity_on_hand__gt=0,
            quantity_on_hand__lte=F("low_stock_threshold"),
        ).count()
        out_of_stock_count = StockItem.objects.filter(quantity_on_hand=0).count()

        # ── Subscribers ──────────────────────────────────────────────────────
        total_subscribers = NewsletterSubscriber.objects.count()
        active_subscribers = NewsletterSubscriber.objects.filter(active=True).count()
        cur_subs = NewsletterSubscriber.objects.filter(created_at__gte=period_start).count()
        prv_subs = NewsletterSubscriber.objects.filter(created_at__gte=prev_start, created_at__lt=period_start).count()

        # ── Reviews ──────────────────────────────────────────────────────────
        review_agg = Review.objects.aggregate(total=Count("id"), avg=Avg("rating"))
        total_reviews = review_agg["total"] or 0
        avg_rating = round(float(review_agg["avg"] or 0), 2)

        # ── Top products (by period revenue) ─────────────────────────────────
        top_products = list(
            OrderItem.objects.filter(order__placed_at__gte=period_start)
            .values(
                product_id=F("variant__product__id"),
                product_name=F("variant__product__name"),
                product_slug=F("variant__product__slug"),
            )
            .annotate(units_sold=Sum("quantity"), revenue=Sum("line_total"))
            .order_by("-revenue")[:10]
        )

        # ── Top categories (by product count) ────────────────────────────────
        top_categories = list(
            Category.objects.filter(is_active=True)
            .annotate(
                product_count=Count(
                    "products",
                    filter=Q(products__is_active=True, products__status="PUBLISHED"),
                )
            )
            .order_by("-product_count")
            .values("id", "name", "slug", "product_count")[:10]
        )

        # ── Recent orders ────────────────────────────────────────────────────
        recent_orders = list(
            Order.objects.select_related("user")
            .order_by("-placed_at")
            .values(
                "id",
                "order_number",
                "status",
                "payment_status",
                "grand_total",
                "placed_at",
                user_email=F("user__email"),
            )[:10]
        )

        # ── Revenue chart (daily for window) ─────────────────────────────────
        revenue_chart = list(
            paid_qs.filter(placed_at__gte=period_start)
            .annotate(date=TruncDate("placed_at"))
            .values("date")
            .annotate(revenue=Sum("grand_total"), orders=Count("id"))
            .order_by("date")
        )

        # ── Orders chart (all statuses, daily) ───────────────────────────────
        orders_chart = list(
            Order.objects.filter(placed_at__gte=period_start)
            .annotate(date=TruncDate("placed_at"))
            .values("date")
            .annotate(orders=Count("id"))
            .order_by("date")
        )

        # ── Low stock items ───────────────────────────────────────────────────
        low_stock_items = list(
            StockItem.objects.select_related("variant__product", "warehouse")
            .filter(quantity_on_hand__lte=F("low_stock_threshold"))
            .order_by("quantity_on_hand")
            .values(
                "id",
                "quantity_on_hand",
                "quantity_reserved",
                "low_stock_threshold",
                variant_sku=F("variant__sku"),
                product_name=F("variant__product__name"),
                product_slug=F("variant__product__slug"),
                warehouse_name=F("warehouse__name"),
            )[:20]
        )

        return Response(
            {
                "period_days": days,
                "generated_at": now,
                "revenue": {
                    "total_all_time": total_revenue,
                    "current_period": cur_rev,
                    "previous_period": prv_rev,
                    "growth_pct": _growth_pct(cur_rev, prv_rev),
                    "average_order_value": aov,
                },
                "orders": {
                    "total_all_time": total_orders,
                    "current_period": cur_orders,
                    "previous_period": prv_orders,
                    "growth_pct": _growth_pct(cur_orders, prv_orders),
                    "by_status": status_breakdown,
                },
                "customers": {
                    "total": total_customers,
                    "new_current_period": cur_customers,
                    "new_previous_period": prv_customers,
                    "growth_pct": _growth_pct(cur_customers, prv_customers),
                },
                "products": {
                    "total": sum(products_by_status.values()),
                    "by_status": products_by_status,
                },
                "categories": {"total": total_categories},
                "inventory": {
                    "low_stock_count": low_stock_count,
                    "out_of_stock_count": out_of_stock_count,
                },
                "subscribers": {
                    "total": total_subscribers,
                    "active": active_subscribers,
                    "new_current_period": cur_subs,
                    "new_previous_period": prv_subs,
                    "growth_pct": _growth_pct(cur_subs, prv_subs),
                },
                "reviews": {
                    "total": total_reviews,
                    "average_rating": avg_rating,
                },
                "top_products": top_products,
                "top_categories": top_categories,
                "recent_orders": recent_orders,
                "revenue_chart": revenue_chart,
                "orders_chart": orders_chart,
                "low_stock_items": low_stock_items,
            }
        )


# ── Analytics endpoints ────────────────────────────────────────────────────────

@extend_schema(
    summary="Revenue analytics",
    description=(
        "Revenue over time, AOV, growth, and payment status breakdown. "
        "Supports `days` (window) and `granularity` (day|week|month) params."
    ),
    parameters=[
        OpenApiParameter("days", int, description="Look-back window in days (default 30)"),
        OpenApiParameter("granularity", str, description="Aggregation granularity: day, week, month (default day)"),
    ],
    tags=["Analytics"],
)
class AnalyticsRevenueView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request, *args, **kwargs):
        from django.db.models.functions import TruncMonth, TruncWeek
        from apps.orders.constants import PaymentStatus
        from apps.orders.models import Order

        try:
            days = max(1, min(730, int(request.query_params.get("days", 30))))
        except (ValueError, TypeError):
            days = 30

        granularity = request.query_params.get("granularity", "day")
        trunc_fn = {"week": TruncWeek, "month": TruncMonth}.get(granularity, TruncDate)

        now, period_start, prev_start = _period_bounds(days)
        paid_qs = Order.objects.filter(payment_status=PaymentStatus.PAID)

        # All-time totals
        all_time = paid_qs.aggregate(
            total_revenue=Sum("grand_total"),
            total_orders=Count("id"),
        )
        total_revenue = all_time["total_revenue"] or Decimal("0")
        total_orders = all_time["total_orders"] or 0
        aov = (total_revenue / total_orders) if total_orders else Decimal("0")

        # Current vs previous period
        cur = paid_qs.filter(placed_at__gte=period_start).aggregate(
            revenue=Sum("grand_total"), orders=Count("id")
        )
        prv = paid_qs.filter(placed_at__gte=prev_start, placed_at__lt=period_start).aggregate(
            revenue=Sum("grand_total"), orders=Count("id")
        )

        cur_rev = cur["revenue"] or Decimal("0")
        prv_rev = prv["revenue"] or Decimal("0")

        # Revenue over time
        over_time = list(
            paid_qs.filter(placed_at__gte=period_start)
            .annotate(bucket=trunc_fn("placed_at"))
            .values("bucket")
            .annotate(revenue=Sum("grand_total"), orders=Count("id"))
            .order_by("bucket")
        )

        # Payment status breakdown (all time)
        payment_breakdown = {
            row["payment_status"]: row["cnt"]
            for row in Order.objects.values("payment_status").annotate(cnt=Count("id"))
        }

        return Response(
            {
                "period_days": days,
                "granularity": granularity,
                "all_time": {
                    "total_revenue": total_revenue,
                    "total_paid_orders": total_orders,
                    "average_order_value": aov,
                },
                "current_period": {
                    "revenue": cur_rev,
                    "orders": cur["orders"] or 0,
                    "aov": (cur_rev / cur["orders"]) if cur["orders"] else Decimal("0"),
                },
                "previous_period": {
                    "revenue": prv_rev,
                    "orders": prv["orders"] or 0,
                },
                "revenue_growth_pct": _growth_pct(cur_rev, prv_rev),
                "orders_growth_pct": _growth_pct(cur["orders"] or 0, prv["orders"] or 0),
                "over_time": over_time,
                "payment_status_breakdown": payment_breakdown,
            }
        )


@extend_schema(
    summary="Order analytics",
    description="Orders over time, status distribution, and cancellation rate.",
    parameters=[
        OpenApiParameter("days", int, description="Look-back window in days (default 30)"),
        OpenApiParameter("granularity", str, description="day|week|month (default day)"),
    ],
    tags=["Analytics"],
)
class AnalyticsOrdersView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request, *args, **kwargs):
        from django.db.models.functions import TruncMonth, TruncWeek
        from apps.orders.models import Order

        try:
            days = max(1, min(730, int(request.query_params.get("days", 30))))
        except (ValueError, TypeError):
            days = 30

        granularity = request.query_params.get("granularity", "day")
        trunc_fn = {"week": TruncWeek, "month": TruncMonth}.get(granularity, TruncDate)
        now, period_start, _ = _period_bounds(days)

        over_time = list(
            Order.objects.filter(placed_at__gte=period_start)
            .annotate(bucket=trunc_fn("placed_at"))
            .values("bucket")
            .annotate(orders=Count("id"))
            .order_by("bucket")
        )

        status_dist = list(
            Order.objects.values("status").annotate(count=Count("id"), pct=Count("id"))
        )
        total = sum(r["count"] for r in status_dist)
        for row in status_dist:
            row["pct"] = round(row["count"] / total * 100, 1) if total else 0.0

        cancelled = Order.objects.filter(status="CANCELLED").count()
        cancel_rate = round(cancelled / total * 100, 1) if total else 0.0

        return Response(
            {
                "period_days": days,
                "granularity": granularity,
                "over_time": over_time,
                "status_distribution": status_dist,
                "cancellation_rate_pct": cancel_rate,
            }
        )


@extend_schema(
    summary="Best-selling products analytics",
    description="Products ranked by units sold and revenue over the requested period.",
    parameters=[
        OpenApiParameter("days", int, description="Look-back window in days (default 30)"),
        OpenApiParameter("limit", int, description="Number of results (default 20, max 100)"),
    ],
    tags=["Analytics"],
)
class AnalyticsBestSellersView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request, *args, **kwargs):
        from apps.orders.models import OrderItem

        try:
            days = max(1, min(730, int(request.query_params.get("days", 30))))
            limit = max(1, min(100, int(request.query_params.get("limit", 20))))
        except (ValueError, TypeError):
            days, limit = 30, 20

        _, period_start, _ = _period_bounds(days)

        results = list(
            OrderItem.objects.filter(order__placed_at__gte=period_start)
            .values(
                product_id=F("variant__product__id"),
                product_name=F("variant__product__name"),
                product_slug=F("variant__product__slug"),
                category_name=F("variant__product__category__name"),
            )
            .annotate(units_sold=Sum("quantity"), revenue=Sum("line_total"), orders=Count("order", distinct=True))
            .order_by("-revenue")[:limit]
        )

        return Response({"period_days": days, "results": results})


@extend_schema(
    summary="Customer growth analytics",
    description="New customer registrations over time, total and active counts.",
    parameters=[
        OpenApiParameter("days", int, description="Look-back window in days (default 30)"),
        OpenApiParameter("granularity", str, description="day|week|month (default day)"),
    ],
    tags=["Analytics"],
)
class AnalyticsCustomerGrowthView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request, *args, **kwargs):
        from django.db.models.functions import TruncMonth, TruncWeek
        from apps.accounts.models import User

        try:
            days = max(1, min(730, int(request.query_params.get("days", 30))))
        except (ValueError, TypeError):
            days = 30

        granularity = request.query_params.get("granularity", "day")
        trunc_fn = {"week": TruncWeek, "month": TruncMonth}.get(granularity, TruncDate)
        _, period_start, _ = _period_bounds(days)

        customers_qs = User.objects.filter(is_staff=False)
        total = customers_qs.count()
        active = customers_qs.filter(is_active=True).count()

        over_time = list(
            customers_qs.filter(date_joined__gte=period_start)
            .annotate(bucket=trunc_fn("date_joined"))
            .values("bucket")
            .annotate(new_customers=Count("id"))
            .order_by("bucket")
        )

        return Response(
            {
                "period_days": days,
                "granularity": granularity,
                "total_customers": total,
                "active_customers": active,
                "over_time": over_time,
            }
        )


@extend_schema(
    summary="Inventory analytics",
    description="Inventory value, low-stock and out-of-stock counts, stock by warehouse.",
    tags=["Analytics"],
)
class AnalyticsInventoryView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request, *args, **kwargs):
        from django.db.models import ExpressionWrapper, FloatField
        from apps.inventory.models import StockItem

        total_items = StockItem.objects.count()
        low_stock = StockItem.objects.filter(
            quantity_on_hand__gt=0, quantity_on_hand__lte=F("low_stock_threshold")
        ).count()
        out_of_stock = StockItem.objects.filter(quantity_on_hand=0).count()
        in_stock = total_items - low_stock - out_of_stock

        # Total inventory value using DB-level multiplication where possible
        stock_items = list(
            StockItem.objects.select_related("variant__product")
            .values("quantity_on_hand", base_price=F("variant__product__base_price"))
        )
        inventory_value = sum(
            Decimal(str(s["quantity_on_hand"])) * (s["base_price"] or Decimal("0"))
            for s in stock_items
        )

        # By warehouse
        by_warehouse = list(
            StockItem.objects.values(
                warehouse_name=F("warehouse__name"),
                warehouse_code=F("warehouse__code"),
            )
            .annotate(
                total_on_hand=Sum("quantity_on_hand"),
                total_reserved=Sum("quantity_reserved"),
                sku_count=Count("id"),
            )
            .order_by("warehouse_name")
        )

        return Response(
            {
                "summary": {
                    "total_sku_count": total_items,
                    "in_stock_count": in_stock,
                    "low_stock_count": low_stock,
                    "out_of_stock_count": out_of_stock,
                    "total_inventory_value": inventory_value,
                },
                "by_warehouse": by_warehouse,
            }
        )


@extend_schema(
    summary="Coupon usage analytics",
    description="Coupon usage counts, discount totals, and top coupons by use.",
    parameters=[
        OpenApiParameter("days", int, description="Look-back window in days (default 30)"),
    ],
    tags=["Analytics"],
)
class AnalyticsCouponUsageView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request, *args, **kwargs):
        from apps.coupons.models import Coupon
        from apps.orders.models import Order

        try:
            days = max(1, min(730, int(request.query_params.get("days", 30))))
        except (ValueError, TypeError):
            days = 30

        _, period_start, _ = _period_bounds(days)

        # Orders with coupons in the period
        coupon_orders = Order.objects.filter(
            placed_at__gte=period_start,
            coupon__isnull=False,
        )
        total_coupon_orders = coupon_orders.count()
        total_discount = coupon_orders.aggregate(v=Sum("discount_total"))["v"] or Decimal("0")

        # Top coupons by use
        top_coupons = list(
            coupon_orders.values(
                coupon_code=F("coupon_code_snapshot"),
            )
            .annotate(times_used=Count("id"), total_discount=Sum("discount_total"))
            .order_by("-times_used")[:20]
        )

        # All coupons usage totals
        all_coupons = list(
            Coupon.objects.values("code", "discount_type", "discount_value", "times_used", "is_active")
            .order_by("-times_used")[:50]
        )

        return Response(
            {
                "period_days": days,
                "period_coupon_orders": total_coupon_orders,
                "period_total_discount": total_discount,
                "top_coupons_this_period": top_coupons,
                "all_coupons": all_coupons,
            }
        )


@extend_schema(
    summary="Newsletter growth analytics",
    description="Subscriber growth over time and campaign performance summary.",
    parameters=[
        OpenApiParameter("days", int, description="Look-back window in days (default 30)"),
        OpenApiParameter("granularity", str, description="day|week|month (default day)"),
    ],
    tags=["Analytics"],
)
class AnalyticsNewsletterView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request, *args, **kwargs):
        from django.db.models.functions import TruncMonth, TruncWeek
        from apps.newsletter.models import NewsletterCampaign, NewsletterSubscriber

        try:
            days = max(1, min(730, int(request.query_params.get("days", 30))))
        except (ValueError, TypeError):
            days = 30

        granularity = request.query_params.get("granularity", "day")
        trunc_fn = {"week": TruncWeek, "month": TruncMonth}.get(granularity, TruncDate)
        _, period_start, _ = _period_bounds(days)

        total_subs = NewsletterSubscriber.objects.count()
        active_subs = NewsletterSubscriber.objects.filter(active=True).count()

        growth = list(
            NewsletterSubscriber.objects.filter(created_at__gte=period_start)
            .annotate(bucket=trunc_fn("created_at"))
            .values("bucket")
            .annotate(new_subscribers=Count("id"))
            .order_by("bucket")
        )

        # Campaign stats (sent campaigns)
        campaign_stats = list(
            NewsletterCampaign.objects.filter(status="sent")
            .values(
                "id", "title", "subject", "sent_at",
                "recipient_count", "open_count", "click_count",
            )
            .order_by("-sent_at")[:20]
        )
        for c in campaign_stats:
            rc = c["recipient_count"] or 0
            c["open_rate"] = round(c["open_count"] / rc * 100, 1) if rc else 0.0
            c["click_rate"] = round(c["click_count"] / rc * 100, 1) if rc else 0.0

        return Response(
            {
                "period_days": days,
                "granularity": granularity,
                "total_subscribers": total_subs,
                "active_subscribers": active_subs,
                "growth_over_time": growth,
                "recent_campaign_stats": campaign_stats,
            }
        )
