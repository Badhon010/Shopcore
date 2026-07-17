# ShopCore — Production Readiness Audit (Fresh Pass)

**Date:** 2026-07-11  
**Scope:** Full codebase re-audit from scratch. All findings below were identified
independently of any prior audit. Prior Critical/High finding status is confirmed
at the end of this document.

---

## Executive Summary

No Critical vulnerabilities were found. The core security posture is solid:
authentication, authorization, inventory locking, order transactions, and address
ownership are correctly implemented. The highest-priority issues are two silent
deployment misconfigurations (email backend, database fallback) that could cause
catastrophic data loss or a completely broken user experience in production without
any startup error, and a severe N+1 query pattern in the product catalog that will
degrade under real traffic.

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High     | 5 |
| Medium   | 10 |
| Low      | 12 |

---

## HIGH Findings

---

### H-1 — Production silently falls back to console email backend when `EMAIL_URL` is unset

**Files:** `config/settings/base.py:237–250`, `config/settings/production.py`

**What happens:** `base.py` sets `EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"`
as the unconditional fallback when `EMAIL_URL` is absent or set to `"console://"`.
`production.py` does not override this. If `EMAIL_URL` is not present in the
production environment:

- Order confirmation emails are never sent to customers
- Password reset links never arrive
- Email verification links are never delivered

All of this fails silently — emails are printed to stdout and the `NotificationLog`
row is written with `status = SENT`. No startup error, no exception, no monitoring
alert. The application appears to function normally.

**Fix:** Require `EMAIL_URL` to be non-console in production at startup:

```python
# config/settings/production.py
_email_url = _env("EMAIL_URL", default="")
if not _email_url or _email_url == "console://":
    raise ImproperlyConfigured(
        "EMAIL_URL must be configured to a real SMTP backend in production."
    )
```

---

### H-2 — Production silently falls back to SQLite when `DATABASE_URL` is unset

**Files:** `config/settings/base.py:102–110`, `config/settings/production.py`

**What happens:** `base.py` falls back to `sqlite3://db.sqlite3` when `DATABASE_URL`
is absent. `production.py` only adds `CONN_MAX_AGE` — it does not require a real
database URL. If deployed without `DATABASE_URL`:

- SQLite has no concurrent write support; two simultaneous requests that write
  will serialize or fail under any real load
- `select_for_update()` on SQLite does not provide real row-level locking
  (the inventory reservation and order transition code depends on this)
- The `db.sqlite3` file is typically on ephemeral storage in containerized
  deployments and is lost on pod restart

**Fix:** Fail loudly at startup in production:

```python
# config/settings/production.py
if not _env("DATABASE_URL", default=""):
    raise ImproperlyConfigured(
        "DATABASE_URL environment variable is required in production."
    )
```

---

### H-3 — Severe N+1: `get_stock_quantity` issues 2 DB queries per variant and `stock_items` is never prefetched

**Files:** `apps/catalog/serializers.py:69–74`, `apps/catalog/selectors.py:63–70`

**What happens:** `ProductVariantSerializer.get_stock_quantity`:

```python
def get_stock_quantity(self, obj) -> int:
    try:
        return obj.stock_items.first().quantity_available if obj.stock_items.exists() else 0
    except Exception:
        return 0
```

This fires **two** queries per variant (`.exists()` then `.first()`). It should be
one. Worse, `get_product_list` in `selectors.py` never includes `variants__stock_items`
in `prefetch_related`. So for a product list page with 20 products × 5 variants
each, this is **200 unplanned queries** per page load.

Additionally, the broad `except Exception: return 0` silently hides any error in
the inventory backend — customers see "out of stock" for items that are actually
available, with no log entry pointing to the real cause.

**Fix (two parts):**

```python
# selectors.py — add to prefetch_related in get_product_list and get_product_detail
.prefetch_related(
    "images",
    "variants__attribute_values__attribute",
    "variants__stock_items",           # add this
)

# serializers.py — single query, explicit error handling
def get_stock_quantity(self, obj) -> int:
    stock = obj.stock_items.first()   # now served from prefetch cache
    return stock.quantity_available if stock else 0
```

---

### H-4 — N+1: Order status history `changed_by` user not prefetched

**Files:** `apps/orders/selectors.py:5–11`, `apps/orders/serializers.py` (OrderStatusHistorySerializer)

**What happens:** `get_orders_for_user` and `get_order_by_number` prefetch
`status_history` but not `status_history__changed_by`. `OrderStatusHistorySerializer`
accesses `obj.changed_by.email` for each history entry. An order with 5 status
transitions triggers 5 extra user-table queries, one per history row. On the
order list page with 20 orders each having history, this is 100+ extra queries.

**Fix:**

```python
# apps/orders/selectors.py
.prefetch_related(
    "items__variant__product",
    "status_history__changed_by",     # was: "status_history"
)
```

---

### H-5 — Test suite throttle misconfiguration breaks authentication tests in CI

**Files:** `config/settings/test.py:26–27`

**What happens:** The test settings clear all throttle rates:

```python
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {}
```

This is intended to disable throttling in tests, but it only affects views that
inherit the *default* throttle configuration. Views with an explicit
`throttle_classes` class attribute (`LoginView`, `RegisterView`) bypass
`DEFAULT_THROTTLE_CLASSES` entirely and still instantiate their per-view throttle.
`SimpleRateThrottle.get_rate()` raises `ImproperlyConfigured: No default throttle
rate set for 'login' scope` because the scope is not in the (now empty) rates dict.

**Result:** `TestRegisterView` (3 tests), `TestOrderPermissions` (1 test), and 4
fixture-setup errors on `TestMeView`/`TestAddressViews` all fail in CI. The login
and register flows — the most critical user paths — cannot be tested.

**Fix:**

```python
# config/settings/test.py
REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"] = []    # keeps this
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {        # keep scoped rates so
    "login": "1000/min",                            # per-view throttles can
    "register": "1000/min",                         # instantiate without error
    "password_reset_request": "1000/min",
    "coupon_apply": "1000/min",
}
```

---

## MEDIUM Findings

---

### M-1 — `ProductListSerializer` calls `.filter()` on prefetched querysets, defeating the prefetch

**Files:** `apps/catalog/serializers.py:92,98`

`get_primary_image` calls `obj.images.filter(is_primary=True)` and `get_min_price`
calls `obj.variants.filter(is_active=True)`. Django **re-issues a new SQL query**
when `.filter()` is called on a relation, even if that relation was prefetched.
The prefetch is wasted.

**Fix:** Filter in Python using `.all()`:

```python
def get_primary_image(self, obj):
    images = [i for i in obj.images.all() if i.is_primary]
    img = images[0] if images else next(iter(obj.images.all()), None)
    return ProductImageSerializer(img).data if img else None

def get_min_price(self, obj):
    prices = [v.effective_price for v in obj.variants.all()
              if v.is_active and v.effective_price is not None]
    return min(prices) if prices else obj.base_price
```

---

### M-2 — Category tree serializer hits the database per node despite prefetch

**Files:** `apps/catalog/selectors.py:43–48`

Inside `serialize(cat)`, `cat.children.filter(is_active=True)` re-queries the DB
for each category node despite the earlier `prefetch_related("children__children")`.

**Fix:** Filter `children` in Python:

```python
def serialize(cat) -> dict:
    return {
        ...
        "children": [
            serialize(c)
            for c in cat.children.all()
            if c.is_active
        ],
    }
```

---

### M-3 — Synchronous SMTP blocks request workers; no Celery integration; no retry

**Files:** `apps/notifications/services.py:52–70`, `config/settings/base.py:256`

All emails are sent synchronously in the request/response cycle. `EMAIL_TIMEOUT`
defaults to 10 seconds. Under SMTP congestion or a slow mail relay, every order
placement or password reset blocks a worker thread for up to 10 seconds. There is
no retry mechanism. The code has a `TODO: Celery` comment acknowledging this.

**Production risk:** 10 simultaneous order confirmations + a degraded SMTP relay
= all gunicorn workers blocked = 503 for all users.

---

### M-4 — Production logs written to volatile `/tmp` directory

**File:** `config/settings/production.py:37`

`"/tmp/shopcore.log"` is ephemeral in containerized environments (Replit
deployments, Docker, ECS, Kubernetes). All log history is lost on pod restart.
Log rotation only retains 50 MB (5 × 10 MB). Logs may be world-readable on
multi-tenant systems.

**Fix:** Write logs to stdout/stderr (12-factor) and ship to an external
aggregator, or write to a mounted persistent volume. For Replit specifically,
`stdout` is the correct destination.

---

### M-5 — No health check endpoint

**File:** `config/urls.py`

No `/health/` or `/ping/` endpoint exists. Load balancers, container
orchestrators, and uptime monitors cannot distinguish between a healthy instance
and a crashed or degraded one. Replit deployment health checks fail.

**Fix:** Add a minimal endpoint:

```python
# config/urls.py
from django.http import JsonResponse
urlpatterns += [
    path("health/", lambda r: JsonResponse({"status": "ok"})),
]
```

---

### M-6 — CORS locked to `localhost:3000`; production frontend silently blocked

**File:** `config/settings/base.py:215`

`CORS_ALLOWED_ORIGINS` defaults to `["http://localhost:3000"]` with no override
in `production.py`. If the `CORS_ALLOWED_ORIGINS` env var is not explicitly set,
all cross-origin requests from the production frontend are blocked with no error
at startup. `production.py` should document this requirement explicitly.

---

### M-7 — `PasswordResetConfirmView` and `VerifyEmailView` have no dedicated throttle

**Files:** `apps/accounts/views.py:157,195`

Both views carry `permission_classes = [AllowAny]`. They fall through to the
global `AnonRateThrottle` at 100 requests/day per IP. A distributed attacker can
enumerate password-reset tokens (valid for a limited window) within these limits.
Password reset token brute-force is a well-documented attack.

**Fix:** Add a dedicated tight throttle (e.g., `5/hour`) identical in shape to
`PasswordResetRequestThrottle`.

---

### M-8 — `ResendVerificationEmailView` throttle too permissive

**Files:** `apps/accounts/views.py` (ResendVerificationEmailView)

Falls through to global `UserRateThrottle` (1000/day). An authenticated user can
fire 1000 verification emails per day. At typical SMTP pricing this is a
meaningful cost amplification vector.

---

### M-9 — `ProductVariant.DoesNotExist` not handled in `CartItemListView`

**File:** `apps/cart/views.py:40`

```python
variant = ProductVariant.objects.get(pk=serializer.validated_data["variant_id"])
```

If `variant_id` is valid integer but the variant has been deleted, this raises
`ObjectDoesNotExist` → Django catches it as a 500 (the custom exception handler
does not map `DoesNotExist` to 404 by default). The error response shape will
also differ from the project's standard `{"error": {...}}` envelope.

**Fix:** Wrap with `get_object_or_404` or an explicit try/except returning 404.

---

### M-10 — No Procfile, Dockerfile, or deployment runbook

**File:** repo root

No documented, reproducible path from source to running production service.
There is no `Procfile`, `Dockerfile`, `docker-compose.yml`, or equivalent. The
WSGI entry point (`config/wsgi.py`) exists but there is no record of the gunicorn
command, worker count, timeout, or environment variable requirements.

---

## LOW Findings

---

### L-1 — JWT `SIGNING_KEY` not explicitly set; shares Django `SECRET_KEY`

**File:** `config/settings/base.py:196–210`

simplejwt falls back to `SECRET_KEY` when `SIGNING_KEY` is absent. Rotating JWT
keys (e.g., after a token leak) therefore requires rotating `SECRET_KEY`, which
simultaneously invalidates all Django sessions, CSRF tokens, signed cookies, and
password-reset tokens. Add `"SIGNING_KEY": env("JWT_SIGNING_KEY", default=SECRET_KEY)`
and document that this should be a separate secret in production.

---

### L-2 — `Order.placed_at` is not explicitly indexed despite being the default sort field

**File:** `apps/orders/models.py:48,56`

`Meta.ordering = ["-placed_at"]` but `placed_at` has no entry in `Meta.indexes`.
Django does not auto-index `auto_now_add` fields. The existing `indexes` block
only covers `(user, status)` and `order_number`. On large tables, every order
list page requires a full index scan falling back to seq-scan.

---

### L-3 — Redundant explicit index on `Order.order_number`

**File:** `apps/orders/models.py:58–61`

`order_number = models.CharField(unique=True)` already creates a unique constraint
index. `models.Index(fields=["order_number"])` in `Meta.indexes` creates a second,
non-unique index on the same column. This duplicates storage and write overhead.

---

### L-4 — `StockMovement` missing index on `created_at`

**File:** `apps/inventory/models.py`

Stock movement history queries (audit logs, stock reports) ordered by time will
degrade to full table scans at scale. Add `db_index=True` or an explicit
`Meta.indexes` entry.

---

### L-5 — `OrderItem` missing index on `variant` FK

**File:** `apps/orders/models.py`

Sales analytics queries (`OrderItem.objects.filter(variant=X)`) will degrade to
full scans. Django does not automatically index FK columns (as of Django 4.x,
this is being phased in but is not yet the default).

---

### L-6 — `NotificationLog` written after `msg.send()`; crash window produces phantom emails

**File:** `apps/notifications/services.py:60–79`

Current order: (1) `msg.send()`, (2) `NotificationLog.objects.create()`.  
If the process crashes between steps 1 and 2, the email is delivered but never
logged. Retry logic (when added) cannot detect the prior delivery.

**Better order:** Create a `PENDING` log entry first, send, then update status.
This makes the log the source of truth and makes the send idempotent from an
observability standpoint.

---

### L-7 — `SetDefaultAddressView` ownership enforced only by the service layer

**File:** `apps/accounts/views.py:259`

`AddressDetailView` uses `permission_classes = [IsAuthenticated, IsOwner]`
explicitly. `SetDefaultAddressView` does not set `IsOwner`; it relies on the
`set_default_address(user, address_pk)` service to filter by user. A single layer
of defence.

---

### L-8 — Several views rely implicitly on the global `IsAuthenticated` default

**Files:** LogoutView, MeView, ChangePasswordView, AddressListCreateView, all
Cart views, OrderListView, OrderDetailView, CheckoutView, InitiatePaymentView, etc.

None of these set `permission_classes` explicitly. Correct today, but fragile: a
future refactor that moves a view to a different base class or that accidentally
adds `permission_classes = []` anywhere in the class hierarchy would silently open
the endpoint.

---

### L-9 — Abandoned cart records accumulate with no purge task

**File:** `apps/cart/services.py`

`place_order` marks carts `is_active=False` but never deletes them. Session-based
guest carts are never cleaned up. No management command or Celery beat task
exists to prune stale carts. The table grows without bound.

---

### L-10 — Review system has no purchase verification

**File:** `apps/reviews/views.py`

Any authenticated user can submit a review for any product regardless of purchase
history. Common e-commerce fraud vector (competitor review bombing).

---

### L-11 — Duplicate `order_number` explicit index

*(See L-3 above — mentioned separately for migration note)*

If `models.Index(fields=["order_number"])` is removed in a migration, verify
the unique constraint index is preserved. Do not drop both.

---

### L-12 — `LoginView` throttle scope `"login"` breaks when `DEFAULT_THROTTLE_RATES` is cleared

*(Root cause documented in H-5; this is the specific manifestation on LoginView)*

The 5/min `login` rate in base.py is correct for production. The test-settings
override must preserve the scope keys while setting high limits (see H-5 fix).

---

## Confirmed Status of Previous Critical/High Findings

The four issues fixed in the most recent session are confirmed resolved in the
current codebase:

| Finding | Description | Status |
|---------|-------------|--------|
| C-NEW-1 | Checkout used `Address.objects.get(pk=...)` without `user=request.user` — another user's address could be embedded in an order | ✅ **RESOLVED** — `CheckoutSerializer.validate_shipping/billing_address_id` enforces ownership; view adds defense-in-depth with a second `get(pk=..., user=request.user)` |
| H1 | JWT refresh tokens remained valid after password change or password reset | ✅ **RESOLVED** — `blacklist_all_refresh_tokens(user)` called in both `change_password()` and `PasswordResetConfirmView.post()` |
| H2 | `_commit_sale_for_order` and `_release_reservations_for_order` caught all exceptions, leaving orders in `PAID` state with uncommitted stock | ✅ **RESOLVED** — `except Exception` blocks removed; inventory failures now propagate and roll back the enclosing `transaction.atomic()` |
| H3 | An invalid payment provider string caused an unhandled `ValueError` → HTTP 500 | ✅ **RESOLVED** — `provider` field is now a `ChoiceField(choices=PaymentProvider.choices)`; view catches `ValueError` from `get_gateway()` and returns 400 `PROVIDER_NOT_AVAILABLE` |

No previously-fixed Critical or High issues have regressed.

---

## Audit Methodology

Nine parallel read-only subagents were dispatched covering security/auth,
concurrency/transactions, API design, infrastructure/performance, view permission
mapping, email/notification handling, N+1 and index analysis, payment/webhook
internals, and settings/throttle configuration. Key files were then read directly
to verify claims before classification. Findings were classified using a
production-risk standard: Critical = exploitable data breach or data loss,
High = causes production failure or security regression under foreseeable
conditions, Medium = degrades performance or correctness without immediate crisis,
Low = technical debt, defence-in-depth gaps, or future operational risk.
