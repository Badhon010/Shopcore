# ShopCore — Production Readiness Audit #4

**Date:** 2026-07-11  
**Scope:** Full independent re-audit after Phase 3 High fixes.  
**Verdict:** ✅ 0 Critical · ✅ 0 High — backend cleared for freeze at v1.0.0-backend.

---

## Summary

| Severity | Count | Δ from Audit 3 |
|----------|-------|----------------|
| Critical | 0     | —              |
| High     | 0     | ↓ 5 (all resolved) |
| Medium   | 10    | → unchanged    |
| Low      | 13    | ↑ 1 new        |

No regressions introduced by the Phase 3 changes.  
All five High findings confirmed resolved (see section below).

---

## Confirmed Resolved — Phase 3 High Fixes

| ID  | Finding | Confirmation |
|-----|---------|--------------|
| H-1 | Production silently fell back to console email backend when `EMAIL_URL` unset | `production.py:34–40` raises `ImproperlyConfigured` if `EMAIL_URL` is absent or `console://` |
| H-2 | Production silently fell back to SQLite when `DATABASE_URL` unset | `production.py:23–29` raises `ImproperlyConfigured` if `DATABASE_URL` is absent |
| H-3 | `get_stock_quantity` issued 2 DB queries per variant; `stock_items` never prefetched | `serializers.py:69–78` now single `.first()` call; all three catalog selectors (`get_product_list`, `get_product_detail`, `search_products`) now include `"variants__stock_items"` in `prefetch_related` |
| H-4 | Order status history `changed_by` user not prefetched | Both `get_orders_for_user` and `get_order_by_number` now use `"status_history__changed_by"` |
| H-5 | Test throttle misconfiguration broke 8 auth tests in CI | `test.py` now keeps all scoped rate keys at `10000/min`; `88/88` tests pass |

**Side effect fixed:** `base.py` `SECRET_KEY` gained a dev-only insecure default so `pytest` and `manage.py runserver` work without a `.env` file. `production.py` still raises `ImproperlyConfigured` if `SECRET_KEY` is absent in production. Django system check: `0 issues`.

---

## Remaining Medium Findings (10)

These are carry-forwards from Audit 3. None were introduced by Phase 3 changes.

---

### M-1 — `ProductListSerializer` calls `.filter()` on prefetched querysets

**Files:** `apps/catalog/serializers.py:92,98`

`get_primary_image` calls `obj.images.filter(is_primary=True)` and `get_min_price`
calls `obj.variants.filter(is_active=True)`. Both relations are prefetched, but
`.filter()` on a prefetched relation issues a new SQL query — the prefetch is
wasted. Fix: iterate `obj.images.all()` / `obj.variants.all()` and filter in Python.

---

### M-2 — Category tree serializer calls `.filter()` on prefetched children per node

**File:** `apps/catalog/selectors.py:47`

`serialize(cat)` calls `cat.children.filter(is_active=True)` inside a recursive
loop despite `prefetch_related("children__children")`. Fix: filter in Python via
`[c for c in cat.children.all() if c.is_active]`.

Note: `get_category_tree` caches its result for 5 minutes, so this N+1 runs at
most once per cache TTL. Low urgency, but should be fixed before caching is removed.

---

### M-3 — Cart serializer accesses `item.variant` without prefetch

**File:** `apps/cart/views.py:24,51,58,64,75`

`CartView.get` builds `cart.items.select_related("variant__product")` but assigns
it to a local variable `cart_data` that is never used — the `CartSerializer(cart)`
call that follows still walks `cart.items.all()` without the select_related.
`CartItemDetailView` and `ClearCartView` also call `CartSerializer(cart)` after
a `cart.refresh_from_db()` with no prefetch. Fix: add a `get_cart` selector with
`prefetch_related("items__variant__product")` and use it in all cart views.

---

### M-4 — Synchronous SMTP blocks request workers; no retry

**File:** `apps/notifications/services.py:52–70`

All transactional email is sent synchronously in the request/response cycle.
`EMAIL_TIMEOUT = 10s`. Under SMTP congestion, every order placement or password
reset blocks a worker for up to 10 seconds. No Celery integration despite a `TODO`
comment in the code.

---

### M-5 — Production logs written to volatile `/tmp` directory

**File:** `config/settings/production.py:57`

`RotatingFileHandler` writes to `/tmp/shopcore.log` — lost on pod/container
restart. Max retention is 50 MB (5 × 10 MB). Logs should go to stdout or a
mounted persistent volume.

---

### M-6 — No health check endpoint

**File:** `config/urls.py`

No `/health/` or `/ping/` route for load-balancer and container-orchestrator
probes. The `DEPLOYMENT.md` documents that one must be added before serving
behind a load balancer.

---

### M-7 — CORS defaults to `localhost:3000`; production frontend silently blocked

**File:** `config/settings/base.py:220`

`CORS_ALLOWED_ORIGINS` defaults to `["http://localhost:3000"]`. Production
requires the `CORS_ALLOWED_ORIGINS` env var to be set explicitly; this is now
documented in `.env.example` and `DEPLOYMENT.md`.

---

### M-8 — `PasswordResetConfirmView` and `VerifyEmailView` lack dedicated throttles

**File:** `apps/accounts/views.py:157,195`

Both have `AllowAny` and fall through to global `AnonRateThrottle` (100/day per
IP). A distributed attacker can attempt password-reset token enumeration within
these limits. A dedicated throttle of 5/hour is recommended.

---

### M-9 — `ResendVerificationEmailView` inherits the permissive `UserRateThrottle`

**File:** `apps/accounts/views.py` (ResendVerificationEmailView)

Falls through to `UserRateThrottle` (1000/day). 1000 verification emails per
authenticated user per day is a cost amplification vector. Tighten to ~5/hour.

---

### M-10 — `ProductVariant.DoesNotExist` unhandled in `CartItemListView` → 500

**File:** `apps/cart/views.py:40`

`ProductVariant.objects.get(pk=...)` raises `DoesNotExist` → unhandled 500 if
the variant ID does not exist. Should be `get_object_or_404`.

---

## Low Findings (13)

Carry-forwards from Audit 3, plus one new finding:

| # | Description | File |
|---|-------------|------|
| L-1 | JWT `SIGNING_KEY` not explicitly set; shares Django `SECRET_KEY` | `config/settings/base.py:196` |
| L-2 | `Order.placed_at` not explicitly indexed despite being the default sort key | `apps/orders/models.py:48,56` |
| L-3 | Redundant explicit index on `Order.order_number` (already unique) | `apps/orders/models.py:59` |
| L-4 | `StockMovement` missing index on `created_at` | `apps/inventory/models.py` |
| L-5 | `OrderItem` missing index on `variant` FK | `apps/orders/models.py` |
| L-6 | `NotificationLog` written after `msg.send()` — crash window produces phantom emails | `apps/notifications/services.py:60–79` |
| L-7 | `SetDefaultAddressView` ownership enforced only by service layer | `apps/accounts/views.py:259` |
| L-8 | Many views rely implicitly on global `IsAuthenticated` | various |
| L-9 | Abandoned cart records accumulate with no purge task | `apps/cart/services.py` |
| L-10 | Review system has no purchase verification | `apps/reviews/views.py` |
| L-11 | Redundant explicit `order_number` index (same as L-3) | `apps/orders/models.py` |
| L-12 | `search_products` prefetches `variants` but not `variants__attribute_values__attribute` | `apps/catalog/selectors.py:126` |
| L-13 *(new)* | `WebhookView` catches all exceptions and returns `str(exc)` to client — potential internal detail disclosure | `apps/payments/views.py:94–96` |

---

## New Findings — Phase 3 Changes

Phase 3 introduced one new informational item (not a finding):

- **`base.py` `SECRET_KEY` dev default** — The insecure fallback string contains
  the literal word "insecure" and "do-not-use-in-production", making intent clear.
  `production.py` hard-fails on startup if `SECRET_KEY` is not set in the
  environment. Risk: Informational only.

No new Medium or High issues were introduced.

---

## Backend Freeze Verdict

| Gate | Status |
|------|--------|
| 0 Critical vulnerabilities | ✅ |
| 0 High vulnerabilities | ✅ |
| ≤ 10 Medium findings | ✅ (exactly 10) |
| Test suite 100% passing | ✅ (88/88) |
| `manage.py check` clean | ✅ (0 issues) |
| No uncommitted migrations | ✅ |

**Backend is cleared for v1.0.0-backend freeze.**
