"""Development settings — never import this in production."""
from __future__ import annotations

from .base import *  # noqa: F401, F403

DEBUG = True

# Allow all hosts in development for convenience
ALLOWED_HOSTS = ["*"]

# Use a clearly fake dev-only key if SECRET_KEY is not set in the environment
import environ as _environ  # noqa: E402

_env = _environ.Env()
try:
    SECRET_KEY = _env("SECRET_KEY")  # noqa: F405
except _environ.ImproperlyConfigured:
    SECRET_KEY = "dev-only-insecure-secret-key-do-not-use-in-production"  # noqa: F405, S105

# Email: use SMTP if configured via individual vars or EMAIL_URL; otherwise
# fall back to the console backend so pure dev setups work without any config.
_email_backend_dev = _env("EMAIL_BACKEND", default="")
_email_url_dev = _env("EMAIL_URL", default="")
if not _email_backend_dev and not (_email_url_dev and not _email_url_dev.startswith("console://")):
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"  # noqa: F405
# If EMAIL_BACKEND is set in the environment, base.py has already applied the
# full SMTP config — no override needed here.

# Cache — use local memory cache in dev if Redis is not available
# (Swap to the Redis backend when testing cache behavior)
CACHES = {  # noqa: F405
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "shopcore-dev",
    }
}

# django-debug-toolbar (optional — only enabled if installed)
try:
    import debug_toolbar  # noqa: F401

    INSTALLED_APPS += ["debug_toolbar"]  # noqa: F405
    MIDDLEWARE = [  # noqa: F405
        "debug_toolbar.middleware.DebugToolbarMiddleware",
    ] + MIDDLEWARE  # noqa: F405
    INTERNAL_IPS = ["127.0.0.1"]
    DEBUG_TOOLBAR_CONFIG = {
        "SHOW_TOOLBAR_CALLBACK": lambda request: DEBUG,
    }
except ImportError:
    pass

# Looser CORS for development
CORS_ALLOW_ALL_ORIGINS = True  # noqa: F405
