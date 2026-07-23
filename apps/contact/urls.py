"""URL patterns for the contact app."""
from __future__ import annotations

from django.urls import path

from apps.contact.views import ContactMessageCreateView

app_name = "contact"

urlpatterns = [
    path("", ContactMessageCreateView.as_view(), name="contact-create"),
]
