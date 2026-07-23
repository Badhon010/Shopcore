"""Views for the contact app."""
from __future__ import annotations

import logging

from rest_framework import generics, permissions, status
from rest_framework.response import Response

from apps.contact.serializers import ContactMessageSerializer

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
        return Response(
            {"message": "Your message has been received. We'll get back to you within one business day."},
            status=status.HTTP_201_CREATED,
        )
