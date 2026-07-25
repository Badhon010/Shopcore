"""Views for the newsletter app."""
from __future__ import annotations

import logging

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.pagination import StandardResultsSetPagination
from apps.newsletter.models import NewsletterSubscriber
from apps.newsletter.serializers import (
    NewsletterSubscribeSerializer,
    NewsletterSubscriberAdminSerializer,
)

logger = logging.getLogger("shopcore.newsletter.views")


class NewsletterSubscribeView(APIView):
    """Subscribe an email address to the newsletter."""

    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = NewsletterSubscribeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        subscriber = serializer.save()
        logger.info("Newsletter subscription: %s", subscriber.email)

        try:
            from apps.notifications.services import send_newsletter_confirmation
            send_newsletter_confirmation(subscriber.email)
        except Exception:
            logger.warning(
                "Failed to send newsletter confirmation to %s",
                subscriber.email,
                exc_info=True,
            )

        return Response(
            {"message": "You're subscribed! Thank you for joining."},
            status=status.HTTP_201_CREATED,
        )


class AdminSubscriberListView(generics.ListAPIView):
    """Staff-only: list all newsletter subscribers."""

    serializer_class = NewsletterSubscriberAdminSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        qs = NewsletterSubscriber.objects.all()
        search = self.request.query_params.get("search", "")
        if search:
            qs = qs.filter(email__icontains=search)
        active = self.request.query_params.get("active")
        if active is not None:
            qs = qs.filter(active=active.lower() == "true")
        return qs


class AdminSubscriberDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Staff-only: retrieve, toggle, or delete a subscriber."""

    serializer_class = NewsletterSubscriberAdminSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = NewsletterSubscriber.objects.all()
