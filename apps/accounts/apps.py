"""AppConfig for apps.accounts."""
from __future__ import annotations

from django.apps import AppConfig


class AccountsConfig(AppConfig):
    """Custom user model, JWT auth, addresses."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.accounts"
    label = "accounts"

    def ready(self) -> None:
        import apps.accounts.signals  # noqa: F401
