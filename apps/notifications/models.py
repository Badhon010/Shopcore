from __future__ import annotations

from django.db import models

from apps.notifications.constants import NotificationChannel, NotificationStatus, NotificationType


class Notification(models.Model):
    """In-app notification displayed in the user's notification centre.

    Distinct from NotificationLog (which tracks email delivery attempts).
    These rows are written when a user-facing event occurs and are read
    back by the /notifications/ REST API.
    """

    class Type(models.TextChoices):
        ORDER = "order", "Order"
        PROMOTION = "promotion", "Promotion"
        SYSTEM = "system", "System"
        REVIEW = "review", "Review"

    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    title = models.CharField(max_length=255)
    body = models.TextField()
    notification_type = models.CharField(
        max_length=20,
        choices=Type.choices,
        default=Type.SYSTEM,
    )
    is_read = models.BooleanField(default=False)
    action_url = models.CharField(max_length=500, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"[{self.notification_type}] {self.title} → {self.user_id}"


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
