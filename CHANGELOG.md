# Changelog

All notable changes to ShopCore are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).  
This project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Backend fixed (2026-07-28)

- **Webhook `raw_body` / `request.body` ordering:** `WebhookView.post()` now
  reads `raw_body = request.body` before accessing `request.data`. Previously
  DRF's stream was consumed by `request.data` first, causing every webhook call
  to raise `RawPostDataException` and return HTTP 400.

- **`verify_signature` added to gateway contract:** `PaymentGateway` base class
  now exposes a concrete (overridable) `verify_signature(raw_body, headers)`
  method. `WebhookView` calls it before `handle_webhook`, catching `ValueError`
  and returning `{"error": {"code": "INVALID_SIGNATURE"}}` with HTTP 400.
  `ManualGateway` inherits the no-op default. No existing gateway behaviour changed.

- **Test suite extended to 377 tests, all passing (was 366 / 377):**
  - `TestWarehouseListView.test_list_warehouses` — accessed `response.data`
    as a flat list; fixed to `response.data["results"]` (view uses pagination).
  - `TestAdminProductVariantListView.test_list_variants_staff_only` — expected
    count 2; fixed to 3 (signal auto-creates one default variant on product creation).
  - `TestAdminProductVariantListView.test_list_variants_forbidden_for_anonymous` —
    expected HTTP 403; fixed to HTTP 401 (DRF returns 401 for unauthenticated requests).
  - `TestAdminBannerListView.test_create_banner` and
    `TestAdminBannerDetailView.test_update_banner` — used truncated JPEG byte
    sequences that Pillow rejected; replaced with `PIL.Image`-generated valid JPEGs.
  - `TestExportProductsView.test_export_products_xlsx` and
    `test_export_products_invalid_format_falls_back_to_csv` — DRF's
    `URL_FORMAT_OVERRIDE` intercepted `?format=xlsx/pdf` as renderer negotiation
    (returning HTTP 404). Added `REST_FRAMEWORK["URL_FORMAT_OVERRIDE"] = None`
    to `config/settings/test.py` so the export views consume the `format`
    query param themselves.

### Maintenance (2026-07-28)

- **`requirements.txt` cleaned up:** Removed multiple duplicate entries that had
  accumulated (every package appeared 4–5 times). Production file now contains
  exactly one entry per dependency with organised section comments.
  Dev-only packages (`pytest`, `factory-boy`, `ruff`, `black`, `isort`,
  `django-debug-toolbar`, `pre-commit`) live only in `requirements-dev.txt`.

---

### Backend added (earlier unreleased)

- **Notifications REST API:** New `Notification` model (`title`, `body`,
  `notification_type`, `is_read`, `action_url`, `created_at`) distinct from the
  existing `NotificationLog` (email delivery ledger).  Added `serializers.py`,
  `views.py`, and `urls.py` to `apps/notifications`.  Three endpoints wired into
  `config/urls.py` under `api/v1/notifications/`:
  - `GET /` — paginated list, newest first, scoped to authenticated user
  - `POST /<pk>/read/` — mark a single notification read; returns the updated object
  - `POST /read-all/` — mark all unread notifications read in a single query

### Backend fixed

- **`formatRelativeDate` crash (root cause):** `Notification.created_at` was
  `undefined` at runtime because the notifications app had no REST API and the only
  existing model (`NotificationLog`) uses `sent_at`. Any frontend code path that
  received notification objects without `created_at` would crash with
  `TypeError: Cannot read properties of undefined (reading 'getTime')`.
  Fixed by building the complete API above.

### Frontend added

- **React / Vite / Tailwind SPA** (`frontend/`):  Full e-commerce UI covering
  catalog browsing, product detail, cart, checkout, account management
  (profile, addresses, orders, wishlist), and the notification centre.
- **Global `RouterErrorBoundary`:** Inline component using `useRouteError` /
  `isRouteErrorResponse` added to the root layout route as `errorElement`.
  Component crashes now show `ServerErrorPage` or `NotFoundPage` instead of
  React Router's raw stack-trace UI and the "provide your own ErrorBoundary"
  message.

### Frontend fixed

- **Notifications page crash** (`NotificationsPage.tsx`): Destructures `error`
  and `refetch` from `useNotifications`; shows `<ErrorState onRetry={refetch} />`
  when the query fails instead of silently rendering nothing.
- **`formatRelativeDate` defensive hardening** (`utils/formatDate.ts`): Both
  `formatRelativeDate` and `formatDate` now accept `string | Date | null |
  undefined` and return `"Unknown date"` / `"—"` respectively for missing or
  invalid input.  Neither function can throw.
- **`Notification` TypeScript interface** (`types/models.ts`): `type:
  'order' | 'promotion' | …` renamed to `notification_type: string` to match the
  backend serializer field name exactly, eliminating the runtime field mismatch.
- **Category routing refactored** (`pages/`, `app/router.tsx`,
  `constants/routes.ts`): Deleted `CategoryPage.tsx` and `SubcategoryPage.tsx`.
  `ProductListPage` now operates in two modes:
  - Mode 1 — `/products` — all products with sidebar filters
  - Mode 2 — `/products/category/:slug` — category-scoped with heading,
    description, and three-crumb breadcrumb

  `buildRoute.category(slug)` updated to `/products/category/${slug}`.
  Old `/category/:slug` and `/products?category=X` paths redirect permanently.
  React Router v6 specificity resolves `/products/category/:slug` before
  `/products/:productSlug` without requiring explicit route ordering.
- **Address field contract** (`types/models.ts`, `AddressForm.tsx`,
  `AddressesPage.tsx`, `CheckoutPage.tsx`, `OrderDetailsPage.tsx`,
  `checkout.service.ts`): Frontend `Address` interface rewritten to use backend
  field names exactly — `full_name`, `phone_number` (required with regex),
  `state_province`, `address_type`.  `AddressForm.handleSubmit` wrapped in
  try/catch that calls `applyServerErrors` so DRF field errors surface inline.
- **TypeScript build** — 31 compilation errors resolved:
  - Token-refresh URL corrected to `/accounts/token/refresh/` in `axiosClient.ts`
    and `AuthContext.tsx`
  - Address endpoints moved to `/accounts/addresses/`, profile endpoint to
    `/accounts/me/`
  - `SearchBar` undefined-index guard; `WishlistButton` `isLoading` → `disabled`
  - `useIntersectionObserver` return type updated for React 19
    `RefObject<T | null>`
  - `normalizers.ts` `variants` typed as `ProductVariant[]`
  - `setupTests.ts` `global.IntersectionObserver` → `window.IntersectionObserver`
  - `ListParams` given index signature; `Skeleton` import corrected
  - `vite.config.ts` `defineConfig` import changed to `vitest/config`
  - `tsconfig.node.json` added `"types": ["node"]`
  - `tsconfig.app.json` added `"types": ["vitest/globals"]`
  - Installed `@types/node` and `vitest` dev deps

### Frontend assets updated

- **`favicon.svg`** — Replaced generic wave-line mark with a clean blue rounded
  square containing a white shopping-bag silhouette (body + handle arch).
- **`logo.svg`** — Improved icon (filled blue bag + handle) with Inter wordmark.
- **`placeholder-product.svg`** — Replaced ambiguous download-arrow icon with
  a standard photo-frame placeholder (mountain silhouette + sun, "No image
  available" caption).

---

## [1.0.0-backend] — 2026-07-11

First stable release of the ShopCore backend. All audit-identified Critical and
High vulnerabilities resolved. Test suite at 100% (88 / 88). Backend cleared for
frontend development to begin on top of this frozen API surface.

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
  are rejected with a 400. Added `except ValueError` handler in
  `InitiatePaymentView` for enum-valid but unimplemented providers.

### Security — Phase 3 fixes

- **Production refuses to start without `DATABASE_URL`:** `production.py` now
  raises `ImproperlyConfigured` at import time if `DATABASE_URL` is absent,
  preventing silent fall-through to SQLite.

- **Production refuses to start without real `EMAIL_URL`:** `production.py` now
  raises `ImproperlyConfigured` at import time if `EMAIL_URL` is absent or set
  to `console://`, preventing transactional emails from printing to stdout.

### Performance — Phase 3 fixes

- **Eliminated N+1 in product stock lookups:** All three catalog selectors now
  include `"variants__stock_items"` in `prefetch_related`.

- **Eliminated N+1 in order status history:** Both `get_orders_for_user` and
  `get_order_by_number` now prefetch `"status_history__changed_by"`.

### Testing — Phase 3 fixes

- **Inventory `reserve_stock` validation:** `ValueError` raised for zero or
  negative quantities before any DB access. Two tests added.

- **Test suite throttle misconfiguration resolved:** `config/settings/test.py`
  now keeps all scoped throttle rate keys at `10000/min`. Test suite: **90 / 90
  passing** (was 80 / 88 before Phase 3).

- **Dev/test bootstrap fixed:** `base.py` `SECRET_KEY` now has an insecure
  dev-only default so `pytest` and `manage.py runserver` work without a `.env`
  file.

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
