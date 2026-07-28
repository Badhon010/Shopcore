"""URL configuration for the search app."""
from __future__ import annotations

from django.urls import path

from apps.search.views import GlobalSearchView

app_name = "search"

urlpatterns = [
    path("", GlobalSearchView.as_view(), name="global-search"),
]
