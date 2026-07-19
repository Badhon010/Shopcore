from __future__ import annotations
from rest_framework import serializers
from apps.notifications.models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id",
            "title",
            "body",
            "notification_type",
            "is_read",
            "action_url",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
