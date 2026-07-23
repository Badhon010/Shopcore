"""Serializers for the contact app."""
from __future__ import annotations

from rest_framework import serializers

from apps.contact.models import ContactMessage


class ContactMessageSerializer(serializers.ModelSerializer):
    """Validate and create a ContactMessage."""

    class Meta:
        model = ContactMessage
        fields = ["name", "email", "subject", "message"]
        extra_kwargs = {
            "name": {"max_length": 200},
            "subject": {"max_length": 200},
            "message": {"max_length": 5000},
        }

    def validate_name(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Name cannot be blank.")
        return value

    def validate_subject(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Subject cannot be blank.")
        return value

    def validate_message(self, value: str) -> str:
        value = value.strip()
        if len(value) < 10:
            raise serializers.ValidationError(
                "Please provide a bit more detail (at least 10 characters)."
            )
        return value
