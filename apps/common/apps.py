"""AppConfig for apps.common."""
from __future__ import annotations

from django.apps import AppConfig


class CommonConfig(AppConfig):
    """Common shared code — no reverse dependencies on other apps."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.common"
    label = "common"
