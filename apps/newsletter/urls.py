"""URL patterns for the newsletter app."""
from __future__ import annotations

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.newsletter.views import (
    AdminCampaignViewSet,
    AdminNewsletterStatsView,
    AdminSubscriberDetailView,
    AdminSubscriberListView,
    NewsletterSubscribeView,
)

app_name = "newsletter"

router = DefaultRouter()
router.register(r"admin/campaigns", AdminCampaignViewSet, basename="admin-campaigns")

urlpatterns = [
    path("subscribe/", NewsletterSubscribeView.as_view(), name="subscribe"),
    path("admin/subscribers/", AdminSubscriberListView.as_view(), name="admin-subscriber-list"),
    path("admin/subscribers/<int:pk>/", AdminSubscriberDetailView.as_view(), name="admin-subscriber-detail"),
    path("admin/stats/", AdminNewsletterStatsView.as_view(), name="admin-stats"),
    path("", include(router.urls)),
]
