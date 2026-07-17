"""Test settings — optimized for speed and isolation."""
from __future__ import annotations

from .base import *  # noqa: F401, F403

DEBUG = False  # noqa: F405

# Fast password hasher for tests — never use in production
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]  # noqa: F405

# Use locmem email backend — capture outgoing emails in tests
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"  # noqa: F405

# Use local memory cache — no real Redis dependency for tests
CACHES = {  # noqa: F405
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "shopcore-test",
    }
}

# Use a fast, clearly fake secret key
SECRET_KEY = "test-secret-key-not-for-production"  # noqa: F405, S105

# Disable global throttling in tests, but keep every scoped rate defined.
# Views with an explicit throttle_classes (e.g. LoginView → LoginRateThrottle
# scope="login") bypass DEFAULT_THROTTLE_CLASSES and still look up their scope
# in DEFAULT_THROTTLE_RATES.  If the scope is absent, SimpleRateThrottle raises
# ImproperlyConfigured.  Setting high rates (10 000/min) prevents that error
# while still never throttling within a normal test run.
REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"] = []  # noqa: F405
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {  # noqa: F405
    "anon": "10000/min",
    "user": "10000/min",
    "login": "10000/min",
    "register": "10000/min",
    "password_reset_request": "10000/min",
    "coupon_apply": "10000/min",
}

# Silence whitenoise in tests
STATICFILES_STORAGE = "django.contrib.staticfiles.storage.StaticFilesStorage"  # noqa: F405

# Prefer the provisioned PostgreSQL database when DATABASE_URL is set — this
# project relies on Postgres-only features (SearchVector/to_tsvector full-text
# search, row-level locking via select_for_update()) that SQLite cannot
# emulate, so Postgres is required for tests to exercise real behavior.
# pytest-django will create/drop a throwaway "test_<dbname>" database, fully
# isolated from the dev database. Fall back to a dedicated SQLite file only
# when no Postgres connection is configured (keeps `pytest` runnable in
# environments without a database).
from pathlib import Path as _Path  # noqa: E402

if env("DATABASE_URL", default=""):  # noqa: F405
    DATABASES = {"default": env.db("DATABASE_URL")}  # noqa: F405
else:
    DATABASES = {  # noqa: F405
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": _Path(__file__).resolve().parent.parent.parent / "test_db.sqlite3",
        }
    }
