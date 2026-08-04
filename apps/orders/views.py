from __future__ import annotations

import logging
from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Address
from apps.cart.services import get_or_create_cart
from apps.common.pagination import StandardResultsSetPagination
from apps.common.permissions import IsStaffUser
from apps.common.throttling import OrderTrackThrottle
from apps.orders.exceptions import OrderNotFoundError
from apps.orders.models import Order
from apps.orders.selectors import get_order_by_number, get_orders_for_user
from apps.orders.serializers import (
    CheckoutSerializer,
    GuestCheckoutSerializer,
    OrderSerializer,
    PublicOrderSerializer,
    TrackOrderSerializer,
)
from apps.orders.services import (
    get_guest_order_by_token,
    guest_email_matches,
    place_order,
    transition_order_status,
    verify_guest_lookup_token,
)
from apps.payments.serializers import RefundRequestSerializer, RefundSerializer

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
    """Place an order — registered users use saved Address FKs; guests (no
    auth, X-Cart-Token header) supply inline address + identity (audit H-4)."""

    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        is_authenticated = request.user.is_authenticated

        if is_authenticated:
            return self._checkout_registered(request)
        return self._checkout_guest(request)

    def _checkout_registered(self, request):
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

    def _checkout_guest(self, request):
        from apps.cart.views import _resolve_cart_identity
        from apps.inventory.exceptions import InsufficientStockError
        from apps.orders.exceptions import EmptyCartError

        serializer = GuestCheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        _, session_key = _resolve_cart_identity(request)
        if not session_key:
            return Response(
                {
                    "error": {
                        "code": "CART_TOKEN_REQUIRED",
                        "message": "A cart token (X-Cart-Token header) is required for guest checkout.",
                        "details": {},
                    }
                },
                status=400,
            )
        cart = get_or_create_cart(user=None, session_key=session_key)

        guest_data = {
            "guest_name": data["guest_name"],
            "guest_email": data["guest_email"],
            "guest_phone": data["guest_phone"],
            "guest_session_id": session_key,
        }
        try:
            order = place_order(
                user=None,
                cart=cart,
                coupon_code=data.get("coupon_code") or None,
                notes=data.get("notes", ""),
                idempotency_key=data.get("idempotency_key") or None,
                guest_data=guest_data,
                shipping_address_snapshot=data["shipping_address"],
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

        serializer_out = OrderSerializer(order).data
        # Return the plain lookup token exactly once — the DB stores only its
        # hash. The guest uses it (with the order number) for tracking/cancel.
        plain_token = getattr(order, "_guest_lookup_token_plain", "")
        if plain_token:
            serializer_out["guest_lookup_token"] = plain_token
        return Response(serializer_out, status=status.HTTP_201_CREATED)


class OrderCancelView(APIView):
    """Cancel an order — registered users by ownership; guests must supply the
    lookup secret (order number + phone OR email + lookup token) (audit H-4)."""

    permission_classes = [permissions.AllowAny]

    def post(self, request, order_number, *args, **kwargs):
        from apps.orders.exceptions import InvalidOrderTransitionError

        if request.user.is_authenticated:
            try:
                order = Order.objects.get(order_number=order_number, user=request.user)
            except Order.DoesNotExist:
                raise OrderNotFoundError()
        else:
            order = self._get_guest_order_authorized(request, order_number)
            if order is None:
                raise OrderNotFoundError()

        from apps.orders.constants import OrderStatus, PaymentStatus
        from apps.orders.exceptions import (
            OrderCancellationNotAllowedError,
        )

        # Audit C-1 / B-4: customers may only cancel UNPAID orders (PENDING or
        # FAILED payment). A paid order's money cannot be reversed by
        # cancellation — staff must use the refund endpoint instead.
        if order.payment_status in (PaymentStatus.PAID, PaymentStatus.REFUNDED):
            raise OrderCancellationNotAllowedError(
                details={
                    "order_number": order.order_number,
                    "payment_status": order.payment_status,
                }
            )

        try:
            order = transition_order_status(
                order,
                OrderStatus.CANCELLED,
                actor=request.user if request.user.is_authenticated else None,
                note="Cancelled by customer.",
            )
        except InvalidOrderTransitionError as exc:
            return Response(
                {"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
                status=400,
            )
        return Response(OrderSerializer(order).data)

    def _get_guest_order_authorized(self, request, order_number: str):
        """Resolve a guest order and verify the lookup secret.

        Accepts: phone (matches guest_phone or snapshot), email + lookup_token,
        or lookup_token alone (a 32+ char cryptographic bearer credential).
        Returns the Order or None (caller raises ORDER_NOT_FOUND — same envelope
        as a missing order to prevent probing, audit S-5).
        """
        from apps.orders.serializers import GuestCancelSerializer

        serializer = GuestCancelSerializer(data=request.data)
        if not serializer.is_valid():
            return None
        data = serializer.validated_data

        try:
            order = Order.objects.get(order_number=order_number)
        except Order.DoesNotExist:
            return None

        # A registered order can never be cancelled via the guest path.
        if order.user_id is not None:
            return None

        phone = data.get("phone_number", "")
        if phone:
            snapshot_phone = (order.shipping_address_snapshot or {}).get("phone_number", "") or ""
            if phone == order.guest_phone or phone == snapshot_phone:
                return order
            return None

        token = data.get("lookup_token", "")
        if not verify_guest_lookup_token(order, token):
            return None

        # A supplied email must still match the order — a valid token does not
        # excuse a mismatching email (fail-closed).
        if not guest_email_matches(order, data.get("email", "")):
            return None
        return order


@extend_schema(
    summary="Track an order (guest)",
    description=(
        "Look up an order by its number plus the bearer secret used at "
        "checkout: the phone, the email + guest lookup token, or the guest "
        "lookup token alone. A mismatch returns the same 404 as a missing "
        "order."
    ),
    request=TrackOrderSerializer,
    responses={200: PublicOrderSerializer},
    tags=["Orders"],
)
class TrackOrderView(APIView):
    """Guest order tracking by order number + email (+ optional phone).

    The email (and phone, when supplied) must match the order's owner. A
    mismatch returns the same 404 envelope as a missing order so that order
    numbers cannot be probed (audit S-5).
    """

    permission_classes = [permissions.AllowAny]
    throttle_classes = [OrderTrackThrottle]

    def post(self, request, *args, **kwargs):
        serializer = TrackOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        order_number = data.get("order_number", "").strip()
        if not order_number:
            # No order number: the guest tracking code alone identifies the
            # order (guest orders only). The token is stored only as a SHA-256
            # hash, so a wrong code matches no row → same 404 as a missing
            # order (no probing, audit S-5).
            order = get_guest_order_by_token(data.get("lookup_token", ""))
            if order is None:
                raise OrderNotFoundError()
            # A supplied email must still match the order — a valid token does
            # not excuse a mismatching email (fail-closed).
            if not guest_email_matches(order, data.get("email", "")):
                raise OrderNotFoundError()
            return Response(
                PublicOrderSerializer(order, context={"request": request}).data
            )

        try:
            order = Order.objects.select_related("user").get(
                order_number=order_number
            )
        except Order.DoesNotExist:
            raise OrderNotFoundError()

        # Registered orders: verify the account email (and phone when given).
        if order.user_id is not None:
            if order.user.email.lower() != data["email"].strip().lower():
                raise OrderNotFoundError()
            phone = data.get("phone_number", "")
            if phone:
                user_phone = (order.user.phone_number or "").strip()
                snapshot_phone = (order.shipping_address_snapshot or {}).get(
                    "phone_number", ""
                ) or ""
                if phone not in (user_phone, snapshot_phone):
                    raise OrderNotFoundError()
            return Response(
                PublicOrderSerializer(order, context={"request": request}).data
            )

        # Guest orders (audit H-4): lookup requires Order Number + Phone  OR
        # Order Number + Email + Lookup Token  OR  Order Number + Lookup Token
        # alone (the token is a 32+ char cryptographic secret, so it is a valid
        # bearer credential by itself). A mismatch returns the same 404 envelope
        # as a missing order (no probing, audit S-5).
        phone = data.get("phone_number", "")
        if phone:
            snapshot_phone = (order.shipping_address_snapshot or {}).get(
                "phone_number", ""
            ) or ""
            if phone == order.guest_phone or phone == snapshot_phone:
                return Response(
                    PublicOrderSerializer(order, context={"request": request}).data
                )
            raise OrderNotFoundError()

        token = data.get("lookup_token", "")
        if not verify_guest_lookup_token(order, token):
            raise OrderNotFoundError()

        # A supplied email must still match the order — a valid token does not
        # excuse a mismatching email (fail-closed).
        if not guest_email_matches(order, data.get("email", "")):
            raise OrderNotFoundError()

        return Response(
            PublicOrderSerializer(order, context={"request": request}).data
        )


@extend_schema(
    summary="Process a refund (staff)",
    description=(
        "Refund a paid order: records a Refund, marks the successful Payment "
        "REFUNDED, transitions the order to REFUNDED, and restocks inventory."
    ),
    request=RefundRequestSerializer,
    responses={201: RefundSerializer, 400: None, 404: None},
    tags=["Orders"],
)
class RefundOrderView(APIView):
    """Staff-only: process a refund for a paid order (audit C-2)."""

    permission_classes = [IsStaffUser]

    def post(self, request, order_number, *args, **kwargs):
        from apps.payments.exceptions import (
            AlreadyRefundedError,
            OrderNotRefundableError,
            RefundError,
        )
        from apps.payments.services import process_refund

        try:
            order = Order.objects.get(order_number=order_number)
        except Order.DoesNotExist:
            raise OrderNotFoundError()

        serializer = RefundRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            refund = process_refund(
                order,
                actor=request.user,
                amount=serializer.validated_data.get("amount"),
                reason=serializer.validated_data.get("reason", ""),
            )
        except (OrderNotRefundableError, AlreadyRefundedError, RefundError) as exc:
            return Response(
                {"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
                status=exc.status_code,
            )

        return Response(RefundSerializer(refund).data, status=status.HTTP_201_CREATED)


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


class AdminOrderDetailView(generics.RetrieveAPIView):
    """Staff-only: retrieve ANY order by order number, bypassing user ownership."""

    serializer_class = OrderSerializer
    permission_classes = [IsStaffUser]

    def get_object(self):
        try:
            return Order.objects.select_related("user").get(
                order_number=self.kwargs["order_number"]
            )
        except Order.DoesNotExist:
            raise OrderNotFoundError()


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
        # Date range filters — validate upfront with parse_date so a malformed
        # value is ignored instead of raising lazily at query evaluation (500).
        from django.utils.dateparse import parse_date
        date_from = parse_date(self.request.query_params.get("date_from", "") or "")
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        date_to = parse_date(self.request.query_params.get("date_to", "") or "")
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)
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
