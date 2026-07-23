"""Serializers for the newsletter app."""
from __future__ import annotations

from rest_framework import serializers

from apps.newsletter.models import NewsletterSubscriber


class NewsletterSubscribeSerializer(serializers.Serializer):
    """Validate a newsletter subscription request."""

    email = serializers.EmailField(max_length=254)

    def validate_email(self, value: str) -> str:
        return value.lower().strip()

    def save(self, **kwargs) -> NewsletterSubscriber:
        email = self.validated_data["email"]
        subscriber, created = NewsletterSubscriber.objects.get_or_create(email=email)
        if not created and subscriber.active:
            raise serializers.ValidationError(
                {"email": ["This email address is already subscribed."]}
            )
        if not created:
            # Reactivate an unsubscribed address
            subscriber.active = True
            subscriber.save(update_fields=["active", "updated_at"])
        return subscriber
