"""Views for the contact app."""
from __future__ import annotations

import logging

from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.pagination import StandardResultsSetPagination
from apps.common.permissions import IsStaffUser
from apps.contact.models import ContactMessage
from apps.contact.serializers import (
    AdminContactMessageSerializer,
    AdminContactMessageUpdateSerializer,
    ContactMessageSerializer,
)

logger = logging.getLogger("shopcore.contact.views")


class ContactMessageCreateView(generics.CreateAPIView):
    """Accept a contact form submission and persist it."""

    serializer_class = ContactMessageSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = serializer.save()
        logger.info(
            "Contact message received from %s <%s> — subject: %s",
            message.name,
            message.email,
            message.subject,
        )

        try:
            from apps.notifications.services import send_contact_received
            send_contact_received(message)
        except Exception:
            logger.warning(
                "Failed to send contact notification for message from %s",
                message.email,
                exc_info=True,
            )

        return Response(
            {"message": "Your message has been received. We'll get back to you within one business day."},
            status=status.HTTP_201_CREATED,
        )


@extend_schema(
    tags=["Admin - Contact Messages"],
    parameters=[
        OpenApiParameter(name="search", description="Search name, email, subject, message", type=str),
        OpenApiParameter(name="status", description="Filter by status (new/in_progress/resolved)", type=str),
        OpenApiParameter(name="created_at__gte", description="Filter by created_at >= date", type=str),
        OpenApiParameter(name="created_at__lte", description="Filter by created_at <= date", type=str),
        OpenApiParameter(name="ordering", description="Order by field (default: -created_at)", type=str),
    ],
)
class AdminContactMessageListView(generics.ListAPIView):
    """Admin list view for contact messages with search, filter, and ordering."""

    serializer_class = AdminContactMessageSerializer
    permission_classes = [IsStaffUser]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        qs = ContactMessage.objects.all()
        params = self.request.query_params

        # Search across text fields
        search = params.get("search")
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(name__icontains=search)
                | Q(email__icontains=search)
                | Q(subject__icontains=search)
                | Q(message__icontains=search)
            )

        # Filter by status
        status_filter = params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        # Date range filters
        created_at_gte = params.get("created_at__gte")
        if created_at_gte:
            qs = qs.filter(created_at__gte=created_at_gte)

        created_at_lte = params.get("created_at__lte")
        if created_at_lte:
            qs = qs.filter(created_at__lte=created_at_lte)

        # Ordering
        ordering = params.get("ordering", "-created_at")
        allowed_orderings = {"created_at", "-created_at", "name", "-name", "status", "-status"}
        if ordering in allowed_orderings:
            qs = qs.order_by(ordering)
        else:
            qs = qs.order_by("-created_at")

        return qs


@extend_schema(tags=["Admin - Contact Messages"])
class AdminContactMessageDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin detail view: retrieve, update status, or hard-delete a contact message."""

    permission_classes = [IsStaffUser]
    queryset = ContactMessage.objects.all()

    def get_serializer_class(self):
        if self.request.method in ("PATCH", "PUT"):
            return AdminContactMessageUpdateSerializer
        return AdminContactMessageSerializer

    def update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return super().update(request, *args, **kwargs)


@extend_schema(
    tags=["Admin - Contact Messages"],
    request=None,
    responses={200: AdminContactMessageSerializer},
)
class AdminContactMessageMarkResolvedView(APIView):
    """Set contact message status to 'resolved'."""

    permission_classes = [IsStaffUser]

    def post(self, request, pk: int):
        message = get_object_or_404(ContactMessage, pk=pk)
        message.status = ContactMessage.Status.RESOLVED
        message.save(update_fields=["status"])
        serializer = AdminContactMessageSerializer(message)
        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema(
    tags=["Admin - Contact Messages"],
    request=None,
    responses={200: AdminContactMessageSerializer},
)
class AdminContactMessageMarkNewView(APIView):
    """Set contact message status back to 'new'."""

    permission_classes = [IsStaffUser]

    def post(self, request, pk: int):
        message = get_object_or_404(ContactMessage, pk=pk)
        message.status = ContactMessage.Status.NEW
        message.save(update_fields=["status"])
        serializer = AdminContactMessageSerializer(message)
        return Response(serializer.data, status=status.HTTP_200_OK)
