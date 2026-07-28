from __future__ import annotations
import logging
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.orders.models import Order
from apps.payments.serializers import InitiatePaymentSerializer
from apps.payments.services import initiate_payment

logger = logging.getLogger("shopcore.payments.views")


class InitiatePaymentView(APIView):
    def post(self, request, *args, **kwargs):
        serializer = InitiatePaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            order = Order.objects.get(
                order_number=serializer.validated_data["order_number"],
                user=request.user,
            )
        except Order.DoesNotExist:
            return Response(
                {"error": {"code": "ORDER_NOT_FOUND", "message": "Order not found.", "details": {}}},
                status=404,
            )

        from django.db import IntegrityError
        from apps.orders.exceptions import InvalidOrderTransitionError
        from apps.payments.exceptions import DuplicatePaymentError

        try:
            result = initiate_payment(order, provider=serializer.validated_data["provider"])
        except DuplicatePaymentError as exc:
            return Response(
                {"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
                status=exc.status_code,
            )
        except InvalidOrderTransitionError as exc:
            return Response(
                {"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
                status=exc.status_code,
            )
        except ValueError as exc:
            # get_gateway() raises ValueError for providers that are valid enum
            # members but have no gateway implementation yet (e.g. STRIPE,
            # BKASH). Return 400 so the caller gets an actionable error instead
            # of a 500.
            return Response(
                {
                    "error": {
                        "code": "PROVIDER_NOT_AVAILABLE",
                        "message": str(exc),
                        "details": {},
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        except IntegrityError:
            # DB-level backstop: a concurrent request won the unique
            # constraint race on Payment(order, status=SUCCEEDED).
            return Response(
                {
                    "error": {
                        "code": "DUPLICATE_PAYMENT",
                        "message": "This order already has a successful payment.",
                        "details": {},
                    }
                },
                status=409,
            )
        return Response(result, status=status.HTTP_200_OK)


class WebhookView(APIView):
    """Gateway webhook endpoint — verifies signature and updates payment status."""

    permission_classes = [permissions.AllowAny]

    def post(self, request, provider: str, *args, **kwargs):
        from apps.payments.services import get_gateway
        # Read raw_body BEFORE request.data is parsed — accessing request.body
        # after DRF has already consumed the stream raises RawPostDataException.
        raw_body = request.body
        try:
            gateway = get_gateway(provider.upper())
        except ValueError:
            return Response({"error": {"code": "UNKNOWN_PROVIDER", "message": f"Unknown provider: {provider}", "details": {}}}, status=400)

        try:
            gateway.verify_signature(raw_body=raw_body, headers=dict(request.headers))
        except ValueError as exc:
            return Response({"error": {"code": "INVALID_SIGNATURE", "message": str(exc), "details": {}}}, status=400)

        try:
            gateway.handle_webhook(
                payload=request.data,
                raw_body=raw_body,
                headers=dict(request.headers),
            )
        except Exception as exc:
            logger.error("Webhook error for provider %s: %s", provider, exc, exc_info=True)
            return Response({"error": {"code": "WEBHOOK_ERROR", "message": str(exc), "details": {}}}, status=400)

        return Response({"status": "ok"})
