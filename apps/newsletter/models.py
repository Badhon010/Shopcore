"""Models for the newsletter app."""
from __future__ import annotations

from django.db import models

from apps.common.models import TimeStampedModel


class NewsletterSubscriber(TimeStampedModel):
    """A newsletter subscription record."""

    email = models.EmailField(unique=True)
    active = models.BooleanField(default=True, db_index=True)
    # subscribed_at is satisfied by TimeStampedModel.created_at;
    # expose it via a property for clarity without an extra DB column.

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Newsletter Subscriber"
        verbose_name_plural = "Newsletter Subscribers"

    def __str__(self) -> str:
        return self.email

    @property
    def subscribed_at(self):  # type: ignore[override]
        return self.created_at
