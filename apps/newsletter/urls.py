"""URL patterns for the newsletter app."""
from __future__ import annotations

from django.urls import path

from apps.newsletter.views import NewsletterSubscribeView

app_name = "newsletter"

urlpatterns = [
    path("subscribe/", NewsletterSubscribeView.as_view(), name="subscribe"),
]
