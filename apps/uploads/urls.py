"""URL configuration for the uploads app."""
from __future__ import annotations

from django.urls import path

from apps.uploads.views import FileUploadView

app_name = "uploads"

urlpatterns = [
    path("", FileUploadView.as_view(), name="upload"),
]
