from __future__ import annotations
import logging
from decimal import Decimal
from datetime import timedelta

from django.db.models import Count, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.accounts.models import Address
from apps.cart.services import get_or_create_cart
from apps.orders.exceptions import OrderNotFoundError
from apps.orders.models import Order
from apps.orders.selectors import get_order_by_number, get_orders_for_user
from apps.orders.serializers import CheckoutSerializer, OrderSerializer
from apps.orders.services import place_order, transition_order_status
from apps.common.permissions import IsStaffUser
from apps.common.pagination import StandardResultsSetPagination

logger = logging.getLogger("shopcore.orders.views")


class OrderListView(generics.ListAPIView):
    serializer_class = OrderSerializer
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        return get_orders_for_user(self.request.user)


class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderSerializer

    def get_object(self):
        try:
            return get_order_by_number(self.request.user, self.kwargs["order_number"])
        except Order.DoesNotExist:
            raise OrderNotFoundError()


class CheckoutView(APIView):
    def post(self, request, *args, **kwargs):
        serializer = CheckoutSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        cart = get_or_create_cart(user=request.user)
        try:
            shipping_address = Address.objects.get(pk=data["shipping_address_id"], user=request.user)
        except Address.DoesNotExist:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": "Shipping address not found.", "details": {}}},
                status=status.HTTP_404_NOT_FOUND,
            )
        billing_address = None
        if data.get("billing_address_id"):
            try:
                billing_address = Address.objects.get(pk=data["billing_address_id"], user=request.user)
            except Address.DoesNotExist:
                return Response(
                    {"error": {"code": "NOT_FOUND", "message": "Billing address not found.", "details": {}}},
                    status=status.HTTP_404_NOT_FOUND,
                )

        from apps.inventory.exceptions import InsufficientStockError
        from apps.orders.exceptions import EmptyCartError
        try:
            order = place_order(
                user=request.user,
                cart=cart,
                shipping_address=shipping_address,
                billing_address=billing_address,
                coupon_code=data.get("coupon_code") or None,
                notes=data.get("notes", ""),
                idempotency_key=data.get("idempotency_key") or None,
            )
        except EmptyCartError as exc:
            return Response(
                {"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
                status=400,
            )
        except InsufficientStockError as exc:
            return Response(
                {"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
                status=409,
            )

        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderCancelView(APIView):
    def post(self, request, order_number, *args, **kwargs):
        try:
            order = Order.objects.get(order_number=order_number, user=request.user)
        except Order.DoesNotExist:
            raise OrderNotFoundError()

        from apps.orders.constants import OrderStatus
        from apps.orders.exceptions import InvalidOrderTransitionError
        try:
            order = transition_order_status(order, OrderStatus.CANCELLED, actor=request.user, note="Cancelled by customer.")
        except InvalidOrderTransitionError as exc:
            return Response(
                {"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
                status=400,
            )
        return Response(OrderSerializer(order).data)


class StaffOrderTransitionView(APIView):
    permission_classes = [IsStaffUser]

    def post(self, request, order_number, *args, **kwargs):
        new_status = request.data.get("status")
        note = request.data.get("note", "")
        try:
            order = Order.objects.get(order_number=order_number)
        except Order.DoesNotExist:
            raise OrderNotFoundError()

        from apps.orders.exceptions import InvalidOrderTransitionError
        try:
            order = transition_order_status(order, new_status, actor=request.user, note=note)
        except InvalidOrderTransitionError as exc:
            return Response(
                {"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
                status=400,
            )
        return Response(OrderSerializer(order).data)


class AdminOrderListView(generics.ListAPIView):
    """Staff-only: list ALL orders across all users."""

    serializer_class = OrderSerializer
    permission_classes = [IsStaffUser]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        from django.db.models import Q

        qs = Order.objects.select_related("user").order_by("-created_at")
        search = self.request.query_params.get("search", "")
        if search:
            qs = qs.filter(
                Q(order_number__icontains=search) | Q(user__email__icontains=search)
            )
        order_status = self.request.query_params.get("status")
        if order_status:
            qs = qs.filter(status=order_status)
        payment_status = self.request.query_params.get("payment_status")
        if payment_status:
            qs = qs.filter(payment_status=payment_status)
        return qs


class AdminOrderStatsView(APIView):
    """Staff-only: aggregate order statistics for the dashboard and analytics pages."""

    permission_classes = [IsStaffUser]

    def get(self, request, *args, **kwargs):
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last_month_start = (month_start - timedelta(days=1)).replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        )
        thirty_days_ago = now - timedelta(days=30)

        # All-time totals
        totals = Order.objects.aggregate(
            total_orders=Count("id"),
            total_revenue=Sum("grand_total"),
        )
        total_orders = totals["total_orders"] or 0
        total_revenue = totals["total_revenue"] or Decimal("0")
        avg_order_value = (
            (total_revenue / total_orders) if total_orders > 0 else Decimal("0")
        )

        # This-month stats
        this_month = Order.objects.filter(created_at__gte=month_start).aggregate(
            orders=Count("id"),
            revenue=Sum("grand_total"),
        )

        # Last-month stats
        last_month = Order.objects.filter(
            created_at__gte=last_month_start, created_at__lt=month_start
        ).aggregate(
            orders=Count("id"),
            revenue=Sum("grand_total"),
        )

        # Status breakdown (full count per status)
        status_qs = Order.objects.values("status").annotate(count=Count("id"))
        status_breakdown = {row["status"]: row["count"] for row in status_qs}

        # Daily revenue for the last 30 days
        daily_qs = (
            Order.objects.filter(created_at__gte=thirty_days_ago)
            .annotate(date=TruncDate("created_at"))
            .values("date")
            .annotate(revenue=Sum("grand_total"), orders=Count("id"))
            .order_by("date")
        )
        daily_revenue = [
            {
                "date": str(row["date"]),
                "revenue": str(row["revenue"] or Decimal("0")),
                "orders": row["orders"],
            }
            for row in daily_qs
        ]

        return Response(
            {
                "total_orders": total_orders,
                "total_revenue": str(total_revenue),
                "avg_order_value": str(round(avg_order_value, 2)),
                "this_month_orders": this_month["orders"] or 0,
                "this_month_revenue": str(this_month["revenue"] or Decimal("0")),
                "last_month_orders": last_month["orders"] or 0,
                "last_month_revenue": str(last_month["revenue"] or Decimal("0")),
                "status_breakdown": status_breakdown,
                "daily_revenue": daily_revenue,
            }
        )
