"""Views for the newsletter app."""
from __future__ import annotations

import logging

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.newsletter.serializers import NewsletterSubscribeSerializer

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
