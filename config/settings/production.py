"""Production settings — never enable DEBUG here."""
from __future__ import annotations

import environ

from .base import *  # noqa: F401, F403

_env = environ.Env()

DEBUG = False  # noqa: F405

# SECRET_KEY must be set — fail loudly if missing
try:
    SECRET_KEY = _env("SECRET_KEY")  # noqa: F405
except environ.ImproperlyConfigured as exc:
    raise environ.ImproperlyConfigured(
        "SECRET_KEY environment variable is required in production."
    ) from exc

# DATABASE_URL must be a real Postgres connection string.
# The entire concurrency model (select_for_update, inventory locking,
# order transactions) requires PostgreSQL — SQLite cannot emulate it.
if not _env("DATABASE_URL", default=""):
    raise environ.ImproperlyConfigured(
        "DATABASE_URL environment variable is required in production. "
        "SQLite is not supported because this project relies on "
        "PostgreSQL-specific features (select_for_update row locking, "
        "full-text search via to_tsvector)."
    )

# EMAIL_URL must point to a real SMTP backend.
# console:// and an absent EMAIL_URL both silently drop all transactional
# email (order confirmations, password resets, email verification).
_email_url_prod = _env("EMAIL_URL", default="")
if not _email_url_prod or _email_url_prod.startswith("console://"):
    raise environ.ImproperlyConfigured(
        "EMAIL_URL environment variable is required in production and must "
        "not use the console:// backend. Set it to an SMTP URL, e.g.: "
        "smtp+tls://user:password@smtp.example.com:587"
    )

# HTTPS / Security headers
SECURE_SSL_REDIRECT = _env.bool("SECURE_SSL_REDIRECT", default=True)  # noqa: F405
SECURE_HSTS_SECONDS = 31536000  # noqa: F405
SECURE_HSTS_INCLUDE_SUBDOMAINS = True  # noqa: F405
SECURE_HSTS_PRELOAD = True  # noqa: F405
SECURE_CONTENT_TYPE_NOSNIFF = True  # noqa: F405
SESSION_COOKIE_SECURE = _env.bool("SESSION_COOKIE_SECURE", default=True)  # noqa: F405
CSRF_COOKIE_SECURE = _env.bool("CSRF_COOKIE_SECURE", default=True)  # noqa: F405
X_FRAME_OPTIONS = "DENY"  # noqa: F405
SECURE_REFERRER_POLICY = "same-origin"  # noqa: F405

# Database connection pooling
DATABASES["default"]["CONN_MAX_AGE"] = _env.int("CONN_MAX_AGE", default=60)  # noqa: F405

# Logging — add rotating file handler for production
LOGGING["handlers"]["file"] = {  # noqa: F405
    "class": "logging.handlers.RotatingFileHandler",
    "filename": "/tmp/shopcore.log",
    "maxBytes": 10 * 1024 * 1024,  # 10 MB
    "backupCount": 5,
    "formatter": "verbose",
    "filters": ["request_id"],
}
for logger in LOGGING["loggers"].values():  # noqa: F405
    if "file" not in logger["handlers"]:
        logger["handlers"].append("file")

# In production, don't leak error details to the client
# (the custom exception handler already handles this, but belt-and-suspenders)
REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] = [  # noqa: F405
    "rest_framework.renderers.JSONRenderer",
]

# ---------------------------------------------------------------------------
# Media storage (production notes)
# ---------------------------------------------------------------------------
# MEDIA_STORAGE defaults to "local", which stores uploads on the server's
# local filesystem (MEDIA_ROOT).  This is safe for single-instance deployments
# where the filesystem is persistent, but files will be lost if the instance
# is replaced, scaled horizontally, or its disk is ephemeral (e.g. Replit,
# Docker containers without a mounted volume).
#
# Before going to high-availability or multi-instance production, set
# MEDIA_STORAGE to a cloud backend (s3 / gcs / r2) and configure the
# corresponding environment variables.  See DEPLOYMENT.md → Media Files.
#
# The base.py dispatch block validates MEDIA_STORAGE and raises ValueError
# for any unrecognised value, so misconfiguration fails loudly at startup.
# ---------------------------------------------------------------------------
