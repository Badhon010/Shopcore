"""Models for the newsletter app."""
from __future__ import annotations

from django.db import models

from apps.common.models import TimeStampedModel


class NewsletterSubscriber(TimeStampedModel):
    """A newsletter subscription record."""

    email = models.EmailField(unique=True)
    active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Newsletter Subscriber"
        verbose_name_plural = "Newsletter Subscribers"

    def __str__(self) -> str:
        return self.email

    @property
    def subscribed_at(self):  # type: ignore[override]
        return self.created_at


class NewsletterCampaign(TimeStampedModel):
    """An email campaign sent to newsletter subscribers."""

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        SENDING = "sending", "Sending"
        SENT = "sent", "Sent"
        FAILED = "failed", "Failed"

    title = models.CharField(max_length=200, help_text="Internal campaign name")
    subject = models.CharField(max_length=200, help_text="Email subject line")
    preview_text = models.CharField(
        max_length=200, blank=True, help_text="Preview text shown in email clients"
    )
    html_body = models.TextField(help_text="HTML email body")
    plain_body = models.TextField(blank=True, help_text="Plain-text fallback body")
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT, db_index=True
    )
    sent_at = models.DateTimeField(null=True, blank=True)
    recipient_count = models.PositiveIntegerField(default=0)
    open_count = models.PositiveIntegerField(default=0)
    click_count = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Newsletter Campaign"
        verbose_name_plural = "Newsletter Campaigns"

    def __str__(self) -> str:
        return self.title

    @property
    def open_rate(self) -> float:
        if self.recipient_count == 0:
            return 0.0
        return round(self.open_count / self.recipient_count * 100, 1)

    @property
    def click_rate(self) -> float:
        if self.recipient_count == 0:
            return 0.0
        return round(self.click_count / self.recipient_count * 100, 1)
