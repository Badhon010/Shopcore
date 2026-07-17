# Changelog

All notable changes to ShopCore are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).  
This project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0-backend] — 2026-07-11

First stable release of the ShopCore backend. All audit-identified Critical and High
vulnerabilities resolved. Test suite at 100% (88/88). Backend cleared for frontend
development to begin on top of this frozen API surface.

### Security — Phase 2A fixes

- **Checkout address ownership (defense-in-depth):** `CheckoutView.post()` now
  fetches both shipping and billing addresses with `Address.objects.get(pk=...,
  user=request.user)`, returning 404 if the address does not belong to the
  authenticated user. The `CheckoutSerializer` already enforced this at validation;
  the view adds a second layer.

- **JWT token revocation on password change/reset:** Added
  `blacklist_all_refresh_tokens(user)` service helper that iterates
  `OutstandingToken.objects.filter(user=user)` and blacklists every token.
  Called at the end of `change_password()` and inside
  `PasswordResetConfirmView.post()`. All devices are signed out when a password
  changes.

- **Inventory commit failures no longer swallowed:** Removed broad
  `except Exception: logger.error(...)` blocks from `_commit_sale_for_order()`
  and `_release_reservations_for_order()`. Genuine failures now propagate and
  roll back the enclosing `transaction.atomic()` in `transition_order_status`,
  preventing an order from being left in PAID/CANCELLED state with inconsistent
  stock.

- **Invalid payment provider no longer returns HTTP 500:** Changed `provider`
  field in `InitiatePaymentSerializer` from `CharField(default="MANUAL")` to
  `ChoiceField(choices=PaymentProvider.choices, ...)`. Strings outside the enum
  (e.g. "PAYPAL", "xyzzy") are rejected at serializer validation with a 400.
  Added `except ValueError` handler in `InitiatePaymentView` for gateways that
  are enum-valid but not yet implemented, returning `PROVIDER_NOT_AVAILABLE` → 400.

### Security — Phase 3 fixes

- **Production refuses to start without `DATABASE_URL`:** `production.py` now
  raises `ImproperlyConfigured` at import time if `DATABASE_URL` is absent.
  Prevents silent fall-through to SQLite, which cannot support the project's
  `select_for_update()` inventory locking.

- **Production refuses to start without real `EMAIL_URL`:** `production.py` now
  raises `ImproperlyConfigured` at import time if `EMAIL_URL` is absent or set to
  `console://`. Prevents transactional emails from silently printing to stdout.

### Performance — Phase 3 fixes

- **Eliminated N+1 in product stock lookups:** All three catalog selectors
  (`get_product_list`, `get_product_detail`, `search_products`) now include
  `"variants__stock_items"` in `prefetch_related`. `ProductVariantSerializer.
  get_stock_quantity` changed from two queries per variant (`.exists()` + `.first()`)
  to a single `.first()` call served from the prefetch cache.

- **Eliminated N+1 in order status history:** Both `get_orders_for_user` and
  `get_order_by_number` now prefetch `"status_history__changed_by"` (was
  `"status_history"`). `OrderStatusHistorySerializer.get_changed_by_email` no
  longer issues a per-row User query.

### Testing — Phase 3 fixes

- **Test suite throttle misconfiguration resolved:** `config/settings/test.py`
  now keeps all scoped throttle rate keys (`login`, `register`,
  `password_reset_request`, `coupon_apply`) at `10000/min` instead of clearing
  the entire `DEFAULT_THROTTLE_RATES` dict. Views with explicit `throttle_classes`
  (LoginView, RegisterView) no longer raise `ImproperlyConfigured` in tests.
  Test suite: **88/88 passing** (was 80/88).

- **Dev/test bootstrap fixed:** `base.py` `SECRET_KEY` now has an insecure
  dev-only default so `pytest` and `manage.py runserver` work without a `.env`
  file. `production.py` continues to hard-require `SECRET_KEY` via its own check.

### Documentation added

- `README.md` — project overview, local setup, running tests
- `DEPLOYMENT.md` — full deployment guide (Replit, self-hosted, env var reference)
- `.env.example` — annotated template of all environment variables
- `docs/API.md` — complete REST API reference
- `docs/ER_DIAGRAM.md` — entity-relationship diagram (Mermaid)
- `docs/ARCHITECTURE.md` — system architecture overview (Mermaid)
- `docs/PRODUCTION_READINESS_AUDIT_1.md` through `_4.md` — audit trail

### Tests added (Phase 2A)

- `apps/orders/tests/test_checkout_address_ownership.py` — 6 tests
- `apps/accounts/tests/test_token_revocation.py` — 9 tests
- `apps/orders/tests/test_inventory_rollback.py` — 5 tests
- `apps/payments/tests/test_provider_validation.py` — 11 tests

---

## [Unreleased — pre-audit baseline]

- Initial Django project scaffolding (models, serializers, views, URLs)
- Apps: accounts, catalog, cart, orders, inventory, payments, coupons, reviews,
  wishlist, notifications, common
- PostgreSQL full-text search (`SearchVector`) on products
- JWT authentication via `djangorestframework-simplejwt` with token blacklisting
- Argon2 password hashing
- Redis caching (category tree, configurable)
- WhiteNoise static file serving
- `drf-spectacular` OpenAPI 3 schema generation
- Soft-delete mixin (`SoftDeleteModel`) shared across catalog entities
- Idempotent checkout with `(user, idempotency_key)` uniqueness guard
- `select_for_update()` inventory reservation and commit pipeline
- Multi-step order status machine with history tracking
- Staff-only order transition endpoint
- Coupon system with per-user redemption limits and type-based discounting
- Wishlist with move-to-cart
- Product reviews
- Address book with default-address management
