from __future__ import annotations
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.cart.services import get_or_create_cart, get_cart_summary
from apps.coupons.serializers import ApplyCouponSerializer
from apps.coupons.services import validate_and_apply_coupon
from apps.common.throttling import CouponApplyThrottle


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
