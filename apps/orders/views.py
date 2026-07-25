from __future__ import annotations
import logging
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
