"""URL patterns for the contact app."""
from __future__ import annotations

from django.urls import path

from apps.contact.views import (
    AdminContactMessageDetailView,
    AdminContactMessageListView,
    AdminContactMessageMarkNewView,
    AdminContactMessageMarkResolvedView,
    ContactMessageCreateView,
)

app_name = "contact"

urlpatterns = [
    path("", ContactMessageCreateView.as_view(), name="contact-create"),
    path("admin/messages/", AdminContactMessageListView.as_view(), name="admin-message-list"),
    path("admin/messages/<int:pk>/", AdminContactMessageDetailView.as_view(), name="admin-message-detail"),
    path("admin/messages/<int:pk>/resolve/", AdminContactMessageMarkResolvedView.as_view(), name="admin-message-resolve"),
    path("admin/messages/<int:pk>/mark-new/", AdminContactMessageMarkNewView.as_view(), name="admin-message-mark-new"),
]
