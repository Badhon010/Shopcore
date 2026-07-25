"""URL patterns for the newsletter app."""
from __future__ import annotations

from django.urls import path

from apps.newsletter.views import (
    AdminSubscriberDetailView,
    AdminSubscriberListView,
    NewsletterSubscribeView,
)

app_name = "newsletter"

urlpatterns = [
    path("subscribe/", NewsletterSubscribeView.as_view(), name="subscribe"),
    path("admin/subscribers/", AdminSubscriberListView.as_view(), name="admin-subscriber-list"),
    path("admin/subscribers/<int:pk>/", AdminSubscriberDetailView.as_view(), name="admin-subscriber-detail"),
]
