# 8. API & config inventory

## 8.1 Payment / order / cart / checkout endpoints (existing)

All under `api/v1/`.

| Method | Path | Auth | Purpose | Source |
| ------ | ---- | ---- | ------- | ------ |
| POST | `/orders/checkout/` | Bearer | Place order (address IDs, coupon, notes, idempotency_key) | `apps/orders/urls.py:18` |
| GET | `/orders/` | Bearer | User's order list | `apps/orders/urls.py:12` |
| GET | `/orders/<order_number>/` | Bearer (owner) | Order detail | `apps/orders/urls.py:22` |
| POST | `/orders/<order_number>/cancel/` | Bearer (owner) | Cancel order | `apps/orders/urls.py:23` |
| GET | `/orders/admin/` | Staff | All orders (search/status/payment/date filters) | `apps/orders/urls.py:15` |
| GET | `/orders/admin/stats/` | Staff | Order stats | `apps/orders/urls.py:16` |
| GET | `/orders/admin/<order_number>/` | Staff | Any order | `apps/orders/urls.py:17` |
| POST | `/orders/<order_number>/transition/` | Staff | Status transition | `apps/orders/urls.py:24` |
| POST | `/payments/initiate/` | Bearer | Initiate payment (`provider` defaults MANUAL) | `apps/payments/urls.py:8` |
| POST | `/payments/webhook/<provider>/` | Public | Gateway webhooks | `apps/payments/urls.py:9` |
| GET | `/cart/` | Bearer | Get cart | `apps/cart/urls.py:11` |
| POST | `/cart/items/` | Bearer | Add item | `apps/cart/urls.py:12` |
| PATCH/DELETE | `/cart/items/<id>/` | Bearer | Update/remove item | `apps/cart/urls.py:13` |
| POST | `/cart/clear/` | Bearer | Clear cart | `apps/cart/urls.py:14` |
| POST | `/coupons/apply/` | Bearer | Coupon preview (throttled) | `apps/coupons/urls.py:12` |
| GET/POST | `/coupons/` | Staff | Admin coupon CRUD | `apps/coupons/urls.py:13-14` |
| GET/POST | `/accounts/addresses/` | Bearer | Address list/create | `apps/accounts/urls.py:38` |
| GET/PATCH/DELETE | `/accounts/addresses/<pk>/` | Bearer (owner) | Address detail | `apps/accounts/urls.py:39` |
| POST | `/accounts/addresses/<pk>/set-default/` | Bearer (owner) | Default address | `apps/accounts/urls.py:40` |
| GET | `/exports/orders/` | Staff | CSV/XLSX orders export | `apps/exports/urls.py` |

**Endpoints the frontend calls that DON'T exist on the backend:**

| Method | Path | Frontend ref | Status |
| ------ | ---- | ------------ | ------ |
| POST | `/orders/track/` | `frontend-store/src/services/api/endpoints.ts:44` | 404 — B-1 |
| GET | `/orders/<id>/invoice/` | `frontend-store/src/services/api/endpoints.ts:46` | 404 — B-9 (never called) |

## 8.2 Endpoints the spec asks for that DON'T exist

- Payment method list / enable / disable / configuration.
- Manual payment submission (reference number + receipt upload) & verification
  (approve/reject).
- Refund (initiate / list / detail).
- Payment list / search / filters / timeline / logs (admin).
- Guest: cart, address, checkout, track, cancel, history, merge-on-login.
- Invoice download.
- Payments export.
- Order packing status / archive.

## 8.3 Environment variables

| Var | Default | Used by |
| --- | ------- | ------- |
| `SECRET_KEY` | dev placeholder | base.py |
| `ALLOWED_HOSTS` | localhost, 127.0.0.1 | base.py |
| `DATABASE_URL` | (none → SQLite dev fallback) | base.py; **required** in production |
| `REDIS_URL` | redis://localhost:6379/0 | base.py (cache/sessions) |
| `JWT_ACCESS_TOKEN_LIFETIME_MINUTES` | 15 | base.py |
| `JWT_REFRESH_TOKEN_LIFETIME_DAYS` | 7 | base.py |
| `CORS_ALLOWED_ORIGINS` | http://localhost:3000 | base.py |
| `EMAIL_BACKEND` / `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_USE_TLS` / `EMAIL_HOST_USER` / `EMAIL_HOST_PASSWORD` | console | base.py; non-console required in prod |
| `EMAIL_URL` | console:// | base.py (legacy DSN) |
| `DEFAULT_FROM_EMAIL` | no-reply@shopcore.example | base.py |
| `FRONTEND_URL` | http://localhost:5000 | notifications |
| `ADMIN_EMAIL` | "" | contact notifications |
| `DEFAULT_CURRENCY` | USD | payments/orders |
| `FLAT_SHIPPING_RATE` | 5.00 | orders |
| `DEFAULT_TAX_RATE_PERCENT` | 0 | orders |
| `MEDIA_STORAGE` | local | base.py |
| `MAX_UPLOAD_SIZE_MB` | 5 | uploads |
| `MAX_IMAGE_DIMENSION_PX` | 4000 | uploads |
| `SECURE_SSL_REDIRECT` / `SESSION_COOKIE_SECURE` / `CSRF_COOKIE_SECURE` | true in prod | production.py |
| `STRIPE_PUBLISHABLE_KEY` / `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | "" | **unused** (stub) |

**Missing env vars for target features:** none exist for SSLCommerz (store_id,
store_password, live/sandbox), PayPal (client_id, client_secret, mode), bKash/Nagad/
Rocket credentials, or gateway enable/disable switches. **`.env.example` does not
exist** despite being referenced.

## 8.4 Models (relevant to this audit)

| Model | App | Notes |
| ----- | --- | ----- |
| `User` | accounts | email login, `phone_number` (unique, no verification) |
| `Address` | accounts | user-owned, `is_default` partial-unique |
| `Cart` / `CartItem` | cart | `session_key` guest path exists but API-gated |
| `Coupon` / `CouponRedemption` | coupons | limits, categories |
| `Warehouse` / `StockItem` / `StockMovement` | inventory | append-only ledger |
| `Order` / `OrderItem` / `OrderStatusHistory` | orders | snapshots, idempotency key |
| `Payment` | payments | gateway-agnostic, unique-succeeded constraint |
| `Notification` / `NotificationLog` | notifications | in-app + email log |

**No models exist for:** PaymentMethod / gateway config, manual-payment submission
(receipt/reference/QR), refund, invoice, guest identity, guest address, order-tracking token.

## 8.5 Migrations

46 migration files across 13 apps (full list at `apps/*/migrations/`). Payments
has 2 (`0001_initial`, `0002_payment_unique_succeeded_payment_per_order`); orders
has 2 (`0001_initial`, `0002_alter_order_idempotency_key_and_more`). No pending
migrations for this feature area — the spec's new features will add several.

## 8.6 Tests (existing, per app)

| App | Test files |
| --- | ---------- |
| accounts | test_views, test_services, test_token_revocation, test_admin_customer |
| cart | test_views |
| catalog | test_views, test_admin_extensions, test_admin_slug_generation |
| contact | test_admin_views |
| coupons | test_services, test_serializers |
| dashboard | test_views |
| exports | test_views |
| inventory | test_services, test_management |
| notifications | test_management, test_views |
| orders | test_services, test_inventory_rollback, test_checkout_address_ownership, test_admin_views |
| payments | test_services, test_gateways, test_provider_validation, test_webhooks |
| reviews | test_views |
| search | test_views |
| wishlist | test_views |

**Missing tests:** guest checkout, order tracking, refund processing, manual
payment verification, payment-method admin config, invoice, PAID-order cancellation
inventory behavior (B-4 has **no** test — `test_inventory_rollback.py` covers
`PENDING_PAYMENT → CANCELLED` only), coupon silent-drop at checkout (B-10), and
storefront payment-selection UI.

## 8.7 Swagger / docs

- OpenAPI schema: `/api/schema/`, Swagger UI `/api/docs/`, ReDoc `/api/redoc/`
  (`config/urls.py:23-33`).
- `docs/API.md` documents checkout/initiate/webhook but has the drift noted in B-8.
- `docs/FRONTEND_ADMIN_GUIDE.md:483` explicitly warns "Payment processing is a v2
  feature. Do not build admin UI that depends on real payment processing."
