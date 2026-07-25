from __future__ import annotations

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cart.services import get_cart_summary, get_or_create_cart
from apps.common.pagination import StandardResultsSetPagination
from apps.common.permissions import IsStaffUser
from apps.common.throttling import CouponApplyThrottle
from apps.coupons.models import Coupon
from apps.coupons.serializers import ApplyCouponSerializer, CouponSerializer
from apps.coupons.services import validate_and_apply_coupon


class ApplyCouponView(APIView):
    """Preview the discount a coupon would apply without committing."""

    throttle_classes = [CouponApplyThrottle]

    def post(self, request, *args, **kwargs):
        serializer = ApplyCouponSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        cart = get_or_create_cart(user=request.user)
        items = list(cart.items.select_related("variant__product").all())
        summary = get_cart_summary(cart)

        try:
            discount_amount, coupon = validate_and_apply_coupon(
                subtotal=summary["subtotal"],
                cart_items=items,
                code=serializer.validated_data["code"],
                user=request.user,
            )
        except Exception as exc:
            code = getattr(exc, "code", "COUPON_ERROR")
            message = getattr(exc, "message", str(exc))
            details = getattr(exc, "details", {})
            return Response(
                {"error": {"code": code, "message": message, "details": details}},
                status=400,
            )

        return Response({
            "code": coupon.code,
            "discount_type": coupon.discount_type,
            "discount_value": str(coupon.discount_value),
            "discount_amount": str(discount_amount),
            "subtotal_after_discount": str(summary["subtotal"] - discount_amount),
        })


class AdminCouponListCreateView(generics.ListCreateAPIView):
    """Staff-only: list and create coupons."""

    serializer_class = CouponSerializer
    permission_classes = [IsStaffUser]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        qs = Coupon.objects.all()
        search = self.request.query_params.get("search", "")
        if search:
            qs = qs.filter(code__icontains=search)
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == "true")
        return qs


class AdminCouponDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Staff-only: retrieve, update, or delete a coupon."""

    serializer_class = CouponSerializer
    permission_classes = [IsStaffUser]
    queryset = Coupon.objects.all()
