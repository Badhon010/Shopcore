"""Serializers for the newsletter app."""
from __future__ import annotations

from rest_framework import serializers

from apps.newsletter.models import NewsletterCampaign, NewsletterSubscriber


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
            subscriber.active = True
            subscriber.save(update_fields=["active", "updated_at"])
        return subscriber


class NewsletterSubscriberAdminSerializer(serializers.ModelSerializer):
    """Admin serializer for managing subscribers."""

    subscribed_at = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = NewsletterSubscriber
        fields = ["id", "email", "active", "subscribed_at", "created_at"]
        read_only_fields = ["id", "email", "subscribed_at", "created_at"]


class NewsletterCampaignSerializer(serializers.ModelSerializer):
    """Serializer for newsletter campaigns."""

    open_rate = serializers.FloatField(read_only=True)
    click_rate = serializers.FloatField(read_only=True)

    class Meta:
        model = NewsletterCampaign
        fields = [
            "id",
            "title",
            "subject",
            "preview_text",
            "html_body",
            "plain_body",
            "status",
            "sent_at",
            "recipient_count",
            "open_count",
            "click_count",
            "open_rate",
            "click_rate",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "status",
            "sent_at",
            "recipient_count",
            "open_count",
            "click_count",
            "open_rate",
            "click_rate",
            "created_at",
            "updated_at",
        ]


class NewsletterCampaignListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for campaign list view."""

    open_rate = serializers.FloatField(read_only=True)
    click_rate = serializers.FloatField(read_only=True)

    class Meta:
        model = NewsletterCampaign
        fields = [
            "id",
            "title",
            "subject",
            "status",
            "sent_at",
            "recipient_count",
            "open_rate",
            "click_rate",
            "created_at",
        ]
        read_only_fields = fields
