"""Base settings shared across all environments."""
from __future__ import annotations

import logging
from datetime import timedelta
from pathlib import Path

import environ

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env()
# Read .env file if present — in Replit/production, variables come from the environment directly
_env_file = BASE_DIR / ".env"
if _env_file.exists():
    environ.Env.read_env(_env_file)

# ---------------------------------------------------------------------------
# Security
# ---------------------------------------------------------------------------
# In production, SECRET_KEY is required and production.py raises if absent.
# For local dev and tests, fall back to a clearly-insecure placeholder so
# `pytest` and `manage.py runserver` work without a .env file.
SECRET_KEY = env(
    "SECRET_KEY",
    default="django-insecure-dev-only-do-not-use-in-production-!!",
)
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

# ---------------------------------------------------------------------------
# Application definition
# ---------------------------------------------------------------------------
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.postgres",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
]

LOCAL_APPS = [
    "apps.common.apps.CommonConfig",
    "apps.accounts.apps.AccountsConfig",
    "apps.catalog.apps.CatalogConfig",
    "apps.inventory.apps.InventoryConfig",
    "apps.cart.apps.CartConfig",
    "apps.orders.apps.OrdersConfig",
    "apps.payments.apps.PaymentsConfig",
    "apps.coupons.apps.CouponsConfig",
    "apps.reviews.apps.ReviewsConfig",
    "apps.wishlist.apps.WishlistConfig",
    "apps.notifications.apps.NotificationsConfig",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.common.middleware.RequestIdMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
_db_url = env("DATABASE_URL", default="")
if _db_url:
    DATABASES = {"default": env.db("DATABASE_URL")}
else:
    # Fallback to SQLite for local dev without PostgreSQL
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
DATABASES["default"]["CONN_MAX_AGE"] = env.int("CONN_MAX_AGE", default=60)
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------
AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 10},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
    {"NAME": "apps.accounts.validators.LetterAndDigitPasswordValidator"},
]

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher",
    "django.contrib.auth.hashers.BCryptSHA256PasswordHasher",
]

# ---------------------------------------------------------------------------
# Internationalization
# ---------------------------------------------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------------------------
# Static & Media
# ---------------------------------------------------------------------------
STATIC_URL = env("STATIC_URL", default="/static/")
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

MEDIA_URL = env("MEDIA_URL", default="/media/")
MEDIA_ROOT = BASE_DIR / "media"

# ---------------------------------------------------------------------------
# Media storage backend
# ---------------------------------------------------------------------------
# MEDIA_STORAGE selects where uploaded files are written.
#
# Supported now:
#   local  — files written to MEDIA_ROOT on the local filesystem (default)
#
# Extension points (not yet implemented; requires django-storages):
#   s3     — AWS S3          (storages.backends.s3boto3.S3Boto3Storage)
#   gcs    — Google Cloud    (storages.backends.gcloud.GoogleCloudStorage)
#   r2     — Cloudflare R2   (storages.backends.s3boto3.S3Boto3Storage + R2 endpoint)
#
# To add a new backend, install django-storages, uncomment the matching branch
# below, add its required env vars to .env.example, and update DEPLOYMENT.md.
# ---------------------------------------------------------------------------
_media_storage = env("MEDIA_STORAGE", default="local")

if _media_storage == "local":
    DEFAULT_FILE_STORAGE = "django.core.files.storage.FileSystemStorage"

# --- Future storage backends: uncomment and configure as needed -------------
# elif _media_storage == "s3":
#     DEFAULT_FILE_STORAGE = "storages.backends.s3boto3.S3Boto3Storage"
#     AWS_STORAGE_BUCKET_NAME = env("AWS_S3_BUCKET_NAME")
#     AWS_S3_REGION_NAME      = env("AWS_S3_REGION_NAME", default="us-east-1")
#     AWS_S3_CUSTOM_DOMAIN    = env("AWS_S3_CUSTOM_DOMAIN", default="")
#     AWS_DEFAULT_ACL         = env("AWS_DEFAULT_ACL", default="private")
#
# elif _media_storage == "gcs":
#     DEFAULT_FILE_STORAGE = "storages.backends.gcloud.GoogleCloudStorage"
#     GS_BUCKET_NAME       = env("GCS_BUCKET_NAME")
#     GS_DEFAULT_ACL       = env("GCS_DEFAULT_ACL", default="projectPrivate")
#
# elif _media_storage == "r2":
#     DEFAULT_FILE_STORAGE    = "storages.backends.s3boto3.S3Boto3Storage"
#     AWS_STORAGE_BUCKET_NAME = env("R2_BUCKET_NAME")
#     AWS_S3_ENDPOINT_URL     = env("R2_ENDPOINT_URL")  # https://<account>.r2.cloudflarestorage.com
#     AWS_S3_REGION_NAME      = "auto"
#     AWS_DEFAULT_ACL         = env("R2_DEFAULT_ACL", default="private")
# ---------------------------------------------------------------------------

else:
    raise ValueError(
        f"Unsupported MEDIA_STORAGE value: {_media_storage!r}. "
        "Valid options: 'local'. "
        "To enable S3/GCS/R2, install django-storages and uncomment the "
        "appropriate branch in config/settings/base.py."
    )

MAX_UPLOAD_SIZE_BYTES = env.int("MAX_UPLOAD_SIZE_MB", default=5) * 1024 * 1024
MAX_IMAGE_DIMENSION_PX = env.int("MAX_IMAGE_DIMENSION_PX", default=4000)

# ---------------------------------------------------------------------------
# Django REST Framework
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "apps.common.pagination.StandardResultsSetPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.OrderingFilter",
        "rest_framework.filters.SearchFilter",
    ],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/day",
        "user": "1000/day",
        "login": "5/min",
        "register": "10/hour",
        "password_reset_request": "5/hour",
        "coupon_apply": "20/min",
    },
    "EXCEPTION_HANDLER": "apps.common.exception_handler.custom_exception_handler",
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

# ---------------------------------------------------------------------------
# JWT (SimpleJWT)
# ---------------------------------------------------------------------------
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=env.int("JWT_ACCESS_TOKEN_LIFETIME_MINUTES", default=15)
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=env.int("JWT_REFRESH_TOKEN_LIFETIME_DAYS", default=7)
    ),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "AUTH_HEADER_TYPES": ("Bearer",),
    "TOKEN_OBTAIN_SERIALIZER": "apps.accounts.serializers.CustomTokenObtainPairSerializer",
}

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=["http://localhost:3000"])
CORS_ALLOW_CREDENTIALS = True

# ---------------------------------------------------------------------------
# Cache (Redis)
# ---------------------------------------------------------------------------
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": env("REDIS_URL", default="redis://localhost:6379/0"),
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        },
        "KEY_PREFIX": "shopcore",
    }
}

SESSION_ENGINE = "django.contrib.sessions.backends.cache"
SESSION_CACHE_ALIAS = "default"

# ---------------------------------------------------------------------------
# Email
# ---------------------------------------------------------------------------
_email_url = env("EMAIL_URL", default="console://")
if _email_url and _email_url != "console://":
    try:
        _email_config = env.email_url("EMAIL_URL")
        EMAIL_BACKEND = _email_config.get("EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend")
        EMAIL_HOST = _email_config.get("EMAIL_HOST", "")
        EMAIL_PORT = _email_config.get("EMAIL_PORT", 587)
        EMAIL_HOST_USER = _email_config.get("EMAIL_HOST_USER", "")
        EMAIL_HOST_PASSWORD = _email_config.get("EMAIL_HOST_PASSWORD", "")
        EMAIL_USE_TLS = _email_config.get("EMAIL_USE_TLS", True)
    except Exception:
        EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
else:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
    EMAIL_HOST = ""
    EMAIL_PORT = 587
    EMAIL_HOST_USER = ""
    EMAIL_HOST_PASSWORD = ""
    EMAIL_USE_TLS = True
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="no-reply@shopcore.example")
EMAIL_TIMEOUT = env.int("EMAIL_TIMEOUT", default=10)

# ---------------------------------------------------------------------------
# drf-spectacular (OpenAPI)
# ---------------------------------------------------------------------------
SPECTACULAR_SETTINGS = {
    "TITLE": "ShopCore API",
    "DESCRIPTION": "Production-ready single-vendor e-commerce REST API",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    "ENUM_GENERATE_CHOICE_DESCRIPTION": True,
}

# ---------------------------------------------------------------------------
# Business configuration
# ---------------------------------------------------------------------------
from decimal import Decimal as _Decimal

DEFAULT_CURRENCY = env("DEFAULT_CURRENCY", default="USD")
FLAT_SHIPPING_RATE = _Decimal(env("FLAT_SHIPPING_RATE", default="5.00"))
DEFAULT_TAX_RATE_PERCENT = _Decimal(env("DEFAULT_TAX_RATE_PERCENT", default="0"))

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": (
                "[{asctime}] [{levelname}] [{name}] [request_id={request_id}] {message}"
            ),
            "style": "{",
            "defaults": {"request_id": "N/A"},
        },
        "simple": {
            "format": "[{levelname}] {message}",
            "style": "{",
        },
    },
    "filters": {
        "request_id": {
            "()": "apps.common.logging_filters.RequestIdFilter",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
            "filters": ["request_id"],
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "WARNING",
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "django.request": {
            "handlers": ["console"],
            "level": "ERROR",
            "propagate": False,
        },
        "shopcore": {
            "handlers": ["console"],
            "level": "DEBUG",
            "propagate": False,
        },
    },
}

# ---------------------------------------------------------------------------
# Admin customization
# ---------------------------------------------------------------------------
ADMIN_SITE_HEADER = "ShopCore Administration"
ADMIN_SITE_TITLE = "ShopCore Admin"
ADMIN_INDEX_TITLE = "Welcome to ShopCore Administration"

# ---------------------------------------------------------------------------
# Third-party credentials (documented placeholders; not wired in v1)
# ---------------------------------------------------------------------------
STRIPE_PUBLISHABLE_KEY = env("STRIPE_PUBLISHABLE_KEY", default="")
STRIPE_SECRET_KEY = env("STRIPE_SECRET_KEY", default="")
STRIPE_WEBHOOK_SECRET = env("STRIPE_WEBHOOK_SECRET", default="")
