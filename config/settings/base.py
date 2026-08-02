"""Base settings shared across all environments."""
from __future__ import annotations

from datetime import timedelta
from decimal import Decimal as _Decimal
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
    "apps.contact.apps.ContactConfig",
    "apps.newsletter.apps.NewsletterConfig",
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
    # The global anon/user buckets apply to every request not covered by a
    # narrower per-endpoint throttle. They must be generous: a single
    # home-page load issues several anonymous GETs (banners, category tree,
    # brands, featured products, cart), the browser fires a CORS preflight
    # (OPTIONS) per cross-origin request, and React Query re-fetches stale
    # queries on window focus. 100/min per IP was far too tight — a minute
    # of browsing exhausted it and every subsequent request (including
    # token refresh, which shares the anonymous bucket) returned 429. The
    # Storefront* classes below exclude preflights from the count entirely;
    # the tight scopes (login, register, password reset, coupon, order
    # track, token refresh) are the actual anti-abuse controls.
    #
    # Production note: the anon/user buckets are keyed by client IP. When
    # deployed behind a reverse proxy (nginx / Replit edge), set NUM_PROXIES
    # below so DRF reads the real client IP from X-Forwarded-For — otherwise
    # every anonymous visitor shares the proxy's IP and the "generous"
    # bucket becomes a site-wide limit.
    "NUM_PROXIES": env.int("NUM_PROXIES", default=0),
    "DEFAULT_THROTTLE_CLASSES": [
        "apps.common.throttling.StorefrontAnonRateThrottle",
        "apps.common.throttling.StorefrontUserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "1000/min",
        "user": "5000/hour",
        "login": "5/min",
        "register": "10/hour",
        "password_reset_request": "5/hour",
        "resend_verification": "5/hour",
        "coupon_apply": "20/min",
        "order_track": "20/min",
        "token_refresh": "60/min",
    },
    "EXCEPTION_HANDLER": "apps.common.exception_handler.custom_exception_handler",
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    # Export endpoints use ?format=csv/xlsx as a business parameter. Disable
    # DRF's URL format override so renderer negotiation does not intercept it.
    "URL_FORMAT_OVERRIDE": None,
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
# The storefront sends an X-Cart-Token header for guest carts (audit H-4) on
# every cart call and on login. It must be in the allowed preflight headers or
# the browser blocks those requests with a CORS error before they reach Django.
from corsheaders.defaults import default_headers  # noqa: E402

CORS_ALLOW_HEADERS = [*default_headers, "x-cart-token"]

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
# Supports two configuration styles:
#
#   Style 1 — individual Django vars (preferred, set in .env or Replit Secrets):
#     EMAIL_BACKEND, EMAIL_HOST, EMAIL_PORT, EMAIL_USE_TLS,
#     EMAIL_HOST_USER, EMAIL_HOST_PASSWORD
#
#   Style 2 — DSN string (legacy):
#     EMAIL_URL=smtp+tls://user:pass@smtp.example.com:587
#
# Style 1 takes precedence when EMAIL_BACKEND is present.

_email_backend_env = env("EMAIL_BACKEND", default="")
if _email_backend_env:
    # Individual SMTP vars (standard Django style)
    EMAIL_BACKEND = _email_backend_env
    EMAIL_HOST = env("EMAIL_HOST", default="")
    EMAIL_PORT = env.int("EMAIL_PORT", default=587)
    EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
    EMAIL_USE_SSL = env.bool("EMAIL_USE_SSL", default=False)
    EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
    EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
else:
    # Fall back to EMAIL_URL DSN parsing
    _email_url = env("EMAIL_URL", default="console://")
    if _email_url and _email_url != "console://":
        try:
            _email_config = env.email_url("EMAIL_URL")
            EMAIL_BACKEND = _email_config.get(
                "EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend"
            )
            EMAIL_HOST = _email_config.get("EMAIL_HOST", "")
            EMAIL_PORT = _email_config.get("EMAIL_PORT", 587)
            EMAIL_HOST_USER = _email_config.get("EMAIL_HOST_USER", "")
            EMAIL_HOST_PASSWORD = _email_config.get("EMAIL_HOST_PASSWORD", "")
            EMAIL_USE_TLS = _email_config.get("EMAIL_USE_TLS", True)
            EMAIL_USE_SSL = False
        except Exception:
            EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
            EMAIL_HOST = ""
            EMAIL_PORT = 587
            EMAIL_HOST_USER = ""
            EMAIL_HOST_PASSWORD = ""
            EMAIL_USE_TLS = True
            EMAIL_USE_SSL = False
    else:
        EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
        EMAIL_HOST = ""
        EMAIL_PORT = 587
        EMAIL_HOST_USER = ""
        EMAIL_HOST_PASSWORD = ""
        EMAIL_USE_TLS = True
        EMAIL_USE_SSL = False

DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="no-reply@shopcore.example")
EMAIL_TIMEOUT = env.int("EMAIL_TIMEOUT", default=10)

# ---------------------------------------------------------------------------
# Frontend / site
# ---------------------------------------------------------------------------
# Used in transactional email links (verify email, password reset, etc.).
# Must be set to your actual frontend origin in production.
FRONTEND_URL = env("FRONTEND_URL", default="http://localhost:5000")
# Admin notification email — receives contact form submissions.
ADMIN_EMAIL = env("ADMIN_EMAIL", default="")

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
# Primary store currency (BDT = Bangladeshi Taka). The pricing system is
# designed for future multi-currency support via the centralized
# apps.common.utils.format_currency() helper, but the production store
# currently operates only in BDT (audit 10 currency decision).
DEFAULT_CURRENCY = env("DEFAULT_CURRENCY", default="BDT")
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
# Payment gateway credentials (H-3) — secrets live ONLY in environment
# variables, never in code or the database. Gateways report
# "gateway not configured" until their keys are set.
# ---------------------------------------------------------------------------
STRIPE_PUBLISHABLE_KEY = env("STRIPE_PUBLISHABLE_KEY", default="")
STRIPE_SECRET_KEY = env("STRIPE_SECRET_KEY", default="")
STRIPE_WEBHOOK_SECRET = env("STRIPE_WEBHOOK_SECRET", default="")

SSLCOMMERZ_STORE_ID = env("SSLCOMMERZ_STORE_ID", default="")
SSLCOMMERZ_STORE_PASSWORD = env("SSLCOMMERZ_STORE_PASSWORD", default="")
SSLCOMMERZ_SANDBOX = env.bool("SSLCOMMERZ_SANDBOX", default=True)

PAYPAL_CLIENT_ID = env("PAYPAL_CLIENT_ID", default="")
PAYPAL_CLIENT_SECRET = env("PAYPAL_CLIENT_SECRET", default="")
PAYPAL_WEBHOOK_ID = env("PAYPAL_WEBHOOK_ID", default="")
PAYPAL_SANDBOX = env.bool("PAYPAL_SANDBOX", default=True)
