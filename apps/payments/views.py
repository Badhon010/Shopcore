from __future__ import annotations

import logging

from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.pagination import StandardResultsSetPagination
from apps.common.permissions import IsStaffUser
from apps.orders.models import Order
from apps.payments.models import ManualPaymentSubmission, PaymentMethod
from apps.payments.serializers import (
    InitiatePaymentSerializer,
    ManualPaymentSubmissionSerializer,
    PaymentMethodPublicSerializer,
    PaymentMethodSerializer,
    PaymentSubmissionCreateSerializer,
    PaymentSubmissionReviewSerializer,
)
from apps.payments.services import initiate_payment, review_manual_payment, submit_manual_payment

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
        from apps.payments.exceptions import (
            DuplicatePaymentError,
            GatewayError,
            GatewayNotConfiguredError,
            PaymentMethodNotAvailableError,
        )

        try:
            result = initiate_payment(order, provider=serializer.validated_data["provider"])
        except (
            DuplicatePaymentError,
            GatewayNotConfiguredError,
            GatewayError,
            PaymentMethodNotAvailableError,
        ) as exc:
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
            # members but have no registered gateway implementation yet (e.g.
            # BKASH, NAGAD, ROCKET — manual methods use the submission flow).
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


@extend_schema(
    summary="List enabled payment methods",
    description=(
        "Enabled payment methods available to the storefront checkout, "
        "ordered by sort_order."
    ),
    responses={200: PaymentMethodPublicSerializer(many=True)},
    tags=["Payments"],
)
class PaymentMethodListView(APIView):
    """Public: enabled payment methods for the storefront."""

    permission_classes = [permissions.AllowAny]

    def get(self, request, *args, **kwargs):
        methods = PaymentMethod.objects.filter(is_enabled=True).order_by(
            "sort_order", "provider"
        )
        serializer = PaymentMethodPublicSerializer(
            methods, many=True, context={"request": request}
        )
        return Response(serializer.data)


@extend_schema(
    summary="Admin: list/create payment methods",
    responses={200: PaymentMethodSerializer(many=True), 201: PaymentMethodSerializer},
    tags=["Payments"],
)
class AdminPaymentMethodListView(generics.ListCreateAPIView):
    """Staff-only: list and create payment methods."""

    serializer_class = PaymentMethodSerializer
    permission_classes = [IsStaffUser]
    pagination_class = StandardResultsSetPagination
    queryset = PaymentMethod.objects.all().order_by("sort_order", "provider")


@extend_schema(
    summary="Admin: retrieve/update/delete a payment method",
    responses={200: PaymentMethodSerializer},
    tags=["Payments"],
)
class AdminPaymentMethodDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Staff-only: manage a single payment method."""

    serializer_class = PaymentMethodSerializer
    permission_classes = [IsStaffUser]
    queryset = PaymentMethod.objects.all()


@extend_schema(
    summary="Submit a manual payment",
    description=(
        "Submit an offline payment (bank transfer, bKash, Nagad, Rocket, ...) "
        "with a reference number and optional receipt for staff verification."
    ),
    request=PaymentSubmissionCreateSerializer,
    responses={201: ManualPaymentSubmissionSerializer},
    tags=["Payments"],
)
class SubmitManualPaymentView(APIView):
    """Customer: submit an offline payment for an unpaid order.

    Registered orders: JWT auth establishes ownership. Guest orders (audit
    H-4): the lookup secret in the payload (phone, or email + token) is the
    bearer credential.
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = PaymentSubmissionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            order = Order.objects.get(order_number=data["order_number"])
        except Order.DoesNotExist:
            return Response(
                {
                    "error": {
                        "code": "ORDER_NOT_FOUND",
                        "message": "Order not found.",
                        "details": {},
                    }
                },
                status=404,
            )

        is_guest = order.user_id is None
        if not is_guest:
            # Registered order: only its owner may submit a payment. Everyone
            # else (including anonymous) gets the same 404 as a missing order
            # — no existence leak (audit S-5).
            if (
                not request.user.is_authenticated
                or request.user.pk != order.user_id
            ):
                return Response(
                    {
                        "error": {
                            "code": "ORDER_NOT_FOUND",
                            "message": "Order not found.",
                            "details": {},
                        }
                    },
                    status=404,
                )
        elif request.user.is_authenticated:
            # A registered user submitting for a guest order must first claim
            # it (via verified email or admin) — not allowed directly.
            return Response(
                {
                    "error": {
                        "code": "ORDER_NOT_FOUND",
                        "message": "Order not found.",
                        "details": {},
                    }
                },
                status=404,
            )

        from apps.payments.exceptions import PaymentSubmissionError

        guest_identity = None
        if is_guest:
            guest_identity = {
                "phone_number": data.get("phone_number", ""),
                "email": data.get("email", ""),
                "lookup_token": data.get("lookup_token", ""),
            }
            if not any(guest_identity.values()):
                return Response(
                    {
                        "error": {
                            "code": "PAYMENT_SUBMISSION_ERROR",
                            "message": "Guest orders require a phone number, or an email + lookup token.",
                            "details": {},
                        }
                    },
                    status=400,
                )

        try:
            submission = submit_manual_payment(
                order=order,
                user=request.user if request.user.is_authenticated else None,
                method_id=data.get("method_id"),
                reference_number=data["reference_number"],
                receipt=data.get("receipt"),
                notes=data.get("notes", ""),
                guest_identity=guest_identity,
            )
        except PaymentSubmissionError as exc:
            return Response(
                {"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
                status=exc.status_code,
            )

        return Response(
            ManualPaymentSubmissionSerializer(submission, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


@extend_schema(
    summary="Admin: list manual payment submissions",
    responses={200: ManualPaymentSubmissionSerializer(many=True)},
    tags=["Payments"],
)
class AdminPaymentSubmissionListView(generics.ListAPIView):
    """Staff-only: pending/manual payment submissions queue."""

    serializer_class = ManualPaymentSubmissionSerializer
    permission_classes = [IsStaffUser]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        qs = ManualPaymentSubmission.objects.select_related("order", "user", "method").all()
        review_status = self.request.query_params.get("status")
        if review_status:
            qs = qs.filter(status=review_status)
        order_number = self.request.query_params.get("order_number", "")
        if order_number:
            qs = qs.filter(order__order_number__icontains=order_number)
        return qs


@extend_schema(
    summary="Admin: review a manual payment submission",
    description="Approve (marks the order paid) or reject a pending manual payment submission.",
    request=PaymentSubmissionReviewSerializer,
    responses={200: ManualPaymentSubmissionSerializer},
    tags=["Payments"],
)
class AdminPaymentSubmissionReviewView(APIView):
    """Staff-only: approve or reject a manual payment submission."""

    permission_classes = [IsStaffUser]

    def post(self, request, pk: int, *args, **kwargs):
        try:
            submission = ManualPaymentSubmission.objects.select_related(
                "order", "method"
            ).get(pk=pk)
        except ManualPaymentSubmission.DoesNotExist:
            return Response(
                {
                    "error": {
                        "code": "NOT_FOUND",
                        "message": "Payment submission not found.",
                        "details": {},
                    }
                },
                status=404,
            )
        serializer = PaymentSubmissionReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # AppBaseException subclasses (e.g. SUBMISSION_ALREADY_REVIEWED,
        # INVALID_ORDER_TRANSITION) are formatted by the global exception
        # handler. IntegrityError is the DB-level backstop when two reviews
        # race to record a successful payment for the same order — map it to
        # a clean 409 instead of a 500.
        from django.db import IntegrityError

        try:
            reviewed = review_manual_payment(
                submission,
                approve=serializer.validated_data["approve"],
                actor=request.user,
                admin_note=serializer.validated_data.get("admin_note", ""),
            )
        except IntegrityError:
            logger.error("Duplicate payment race while reviewing submission %s", pk, exc_info=True)
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

        return Response(
            ManualPaymentSubmissionSerializer(reviewed, context={"request": request}).data
        )


class WebhookView(APIView):
    """Gateway webhook endpoint — verifies signature, dedupes, updates status."""

    permission_classes = [permissions.AllowAny]

    def post(self, request, provider: str, *args, **kwargs):
        from apps.payments.exceptions import WebhookVerificationError
        from apps.payments.services import process_gateway_webhook

        # Read raw_body BEFORE request.data is parsed — accessing request.body
        # after DRF has already consumed the stream raises RawPostDataException.
        raw_body = request.body
        try:
            outcome = process_gateway_webhook(
                provider=provider.upper(),
                payload=request.data,
                raw_body=raw_body,
                headers=dict(request.headers),
            )
        except WebhookVerificationError as exc:
            return Response(
                {"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
                status=exc.status_code,
            )
        except ValueError as exc:
            # Unknown/unregistered provider → UNKNOWN_PROVIDER; any other
            # ValueError (signature mismatch) → INVALID_SIGNATURE.
            message = str(exc)
            if "unknown provider" in message.lower() or "no registered gateway" in message.lower():
                return Response(
                    {
                        "error": {
                            "code": "UNKNOWN_PROVIDER",
                            "message": message,
                            "details": {},
                        }
                    },
                    status=400,
                )
            return Response(
                {"error": {"code": "INVALID_SIGNATURE", "message": message, "details": {}}},
                status=400,
            )
        except Exception as exc:
            logger.error("Webhook error for provider %s: %s", provider, exc, exc_info=True)
            return Response(
                {"error": {"code": "WEBHOOK_ERROR", "message": str(exc), "details": {}}},
                status=400,
            )

        # Duplicates return 200 so the gateway stops retrying.
        return Response({"status": "ok", "result": outcome["status"]})
