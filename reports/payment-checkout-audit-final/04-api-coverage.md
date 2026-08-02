# Final Audit — 04: API Coverage

## New / updated endpoints (all tested)

| Method | Path | Auth | Throttle | Tests |
|--------|------|------|----------|-------|
| POST | `/api/orders/track/` | None | 10/min/IP | `test_guest_checkout.py` |
| POST | `/api/orders/<number>/refund/` | Staff | — | `test_refunds.py` |
| POST | `/api/orders/<number>/cancel/` | Owner **or guest secret** | — | `test_guest_checkout.py`, `test_cancel_policy.py` |
| POST | `/api/orders/checkout/` | Owner **or guest** (`X-Cart-Token`) | — | `test_guest_checkout.py` |
| GET | `/api/payments/methods/` | None | — | `test_payment_methods.py` |
| GET/POST | `/api/payments/admin/methods/` | Staff | — | `test_payment_methods.py` |
| GET/PUT/PATCH/DELETE | `/api/payments/admin/methods/<pk>/` | Staff | — | `test_payment_methods.py` |
| POST | `/api/payments/submit/` | Owner or guest secret | — | `test_manual_submissions.py` |
| GET | `/api/payments/admin/submissions/` | Staff | — | `test_manual_submissions.py` |
| POST | `/api/payments/admin/submissions/<pk>/review/` | Staff | — | `test_manual_submissions.py` |
| POST | `/api/payments/initiate/` | Owner | — | `test_provider_validation.py`, `test_gateway_architecture.py` |
| POST | `/api/payments/webhook/<provider>/` | None (signature) | — | `test_gateway_architecture.py` |
| POST | `/api/accounts/login/` | None | 5/min | `test_guest_checkout.py` (claim + cart merge) |

## New gateway endpoints (H-3)

- `POST /api/payments/webhook/sslcommerz/`, `…/stripe/`, `…/paypal/` — signature
  verified (SSLCommerz `verify_sign`+`val_id`, Stripe `whsec_` HMAC, PayPal
  verify-webhook-signature API), events logged to `PaymentEventLog` for
  idempotent replay handling.
- Unknown providers → `UNKNOWN_PROVIDER` 400; bad signature →
  `INVALID_SIGNATURE` 400; duplicate events → 200 `{status:"duplicate"}`.

## OpenAPI / schema

- All new views carry `@extend_schema` decorators; schema generation verified
  via `manage.py spectacular` (no new warnings from the new code).
- Swagger UI remains available at `/api/schema/swagger-ui/`.

## Docs

- `docs/API.md` updated: guest checkout payloads, guest track/cancel rules,
  gateway providers + `GATEWAY_NOT_CONFIGURED`, manual submit, refund,
  payment methods, corrected transition table + status machine, `order_track`
  rate limit, BDT default currency.

## Serializers added / updated

- `TrackOrderSerializer` (order_number + email optional + phone + lookup_token)
- `PublicOrderSerializer`
- `PaymentMethodSerializer` / `PaymentMethodPublicSerializer` (+ `is_configured`)
- `PaymentSubmissionCreateSerializer` (guest identity fields) /
  `ManualPaymentSubmissionSerializer` / `PaymentSubmissionReviewSerializer`
- `RefundSerializer` / `RefundRequestSerializer`
- `GuestAddressSerializer` / `GuestCheckoutSerializer` / `GuestCancelSerializer`
- `OrderSerializer` (+ `is_guest`, `guest_*` fields)

## Migrations

- `payments/0003_paymentmethod_alter_payment_provider_and_more` (schema)
- `payments/0004_seed_payment_methods` (data seed)
- `payments/0005_paymentmethod_gateway_config_alter_payment_currency_and_more`
  (gateway config + currency default + `PaymentEventLog`)
- `orders/0006_alter_order_user_guest_*` (nullable user + guest fields)
- `cart/000x_*` (guest cart session_key support)
- All applied; `manage.py check` clean.
