from __future__ import annotations
from django.db import models
from apps.notifications.constants import NotificationChannel, NotificationStatus, NotificationType


class NotificationLog(models.Model):
    """Log every notification attempt, successful or failed."""

    user = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="notification_logs",
    )
    notification_type = models.CharField(max_length=30, choices=NotificationType.choices)
    channel = models.CharField(max_length=10, choices=NotificationChannel.choices, default=NotificationChannel.EMAIL)
    recipient = models.EmailField()
    subject = models.CharField(max_length=255)
    status = models.CharField(max_length=10, choices=NotificationStatus.choices)
    error_message = models.TextField(blank=True)
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-sent_at"]

    def __str__(self) -> str:
        return f"{self.notification_type} to {self.recipient} ({self.status})"
