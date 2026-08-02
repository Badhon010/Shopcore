# 6. Security issues

Findings grouped by the spec's categories. Each item notes the actual risk, current
mitigation, and gap. Severity: 🔴 High / 🟠 Medium / 🟡 Low.

## Payment security

- **🟡 S-1 — Amounts are client-independent (good), but trust it stays that way.**
  Checkout recomputes all totals server-side from `variant.effective_price`
  (`apps/orders/services.py:172-174`) and `initiate_payment` charges
  `order.grand_total` read from the DB (`apps/payments/services.py:54-56`). The
  client can only influence `shipping_address_id`, `billing_address_id`,
  `coupon_code`, `notes`, and `idempotency_key`. No price-tampering vector exists
  today. **Keep it that way when adding real gateways** — never accept an amount
  from the client.
- **🟠 S-2 — No `PENDING` payment state for real gateways.** `ManualGateway` creates
  `Payment` already `SUCCEEDED`. When Stripe/SSLCommerz/etc. are added, the
  initiate→webhook→confirm lifecycle must be implemented with `INITIATED` →
  `SUCCEEDED` transitions and the existing unique-succeeded constraint reused.
- **🟡 S-3 — Webhook endpoint is `AllowAny` and currently unverified.** `WebhookView`
  (`apps/payments/views.py:78-85`) is public by design; safety depends on each
  gateway's `verify_signature`. `ManualGateway.verify_signature` is a no-op
  (`apps/payments/gateways/base.py:42-49` default). Until a real gateway is wired,
  the endpoint is inert; when wiring one, HMAC/Stripe-signature verification is
  **mandatory** and must be unit-tested (the test suite already patches
  `verify_signature` to simulate bad HMACs — `apps/payments/tests/test_webhooks.py:50-63`).

## Guest security

- **🟡 S-4 — No guest surface exists yet, so no guest attack surface — but the
  frontend pretends otherwise.** The `X-Cart-Token` header
  (`frontend-store/src/services/api/cart.service.ts:55`) is ignored by the backend;
  if a guest-cart API is later added, the token must be unguessable, server-issued,
  and never be accepted as an ownership credential for payment.
- **🟡 S-5 — Order numbers are enumerable.** `generate_order_number`
  (`apps/common/utils.py:37-47`) is `ORD-YYYYMMDD-NNNNNN` with a time-derived
  sequence (no randomness). Order detail is ownership-gated today, so exposure is
  limited; but the **future guest order-tracking** feature must pair the order
  number with a secret (email + phone) — never allow tracking by order number alone.

## Webhook security

- **🟡 S-6 — No webhook idempotency store.** The webhook view has no "processed
  events" log. Replay safety currently rests on DB constraints (unique succeeded
  payment) and per-reference inventory idempotency guards
  (`apps/inventory/services.py:88-110`). Tests verify double webhook delivery is
  safe (`apps/payments/tests/test_webhooks.py:83-92`, `apps/orders/tests/test_services.py:157`).
  A dedicated processed-events table is recommended when real gateways land.

## Inventory race conditions

- **✅ Well-mitigated.** All mutations lock rows via `select_for_update`
  (`apps/inventory/services.py:60-64, 91-96, 127-132`), and checkout holds cart-item
  locks (`apps/orders/services.py:170`). Overselling is prevented. Tests cover
  concurrent scenarios (`apps/inventory/tests/test_services.py:82`).
- **🟠 S-7 — No reservation expiry.** A `PENDING_PAYMENT` order keeps stock reserved
  forever unless an admin cancels it. Attackers can "hoard" inventory by placing
  unpaid orders. Needs an expiry job (Critical-path concern for real gateways).

## Order duplication

- **✅ Well-mitigated.** Idempotency key scoped to `(user, key)` + partial unique
  constraint (`apps/orders/models.py:70-78`), pre-check + `IntegrityError` race
  resolution (`apps/orders/services.py:71-118`). Tests cover concurrent identical
  checkouts.

## Coupon abuse

- **✅ Well-mitigated at checkout.** `validate_and_lock_coupon` + `F()` increment in
  one transaction (`apps/coupons/services.py:74-137`); preview endpoint throttled
  (`apps/common/throttling.py:31-36`).
- **🟡 S-8 — Preview can be abused as a free discount oracle** (throttled 20/min)
  and the checkout silently drops an invalid coupon (B-10). Not a financial loss
  vector, but the silent-drop UX hides limit enforcement from the customer.

## Price tampering

- **✅ Not possible today** (server-side totals, frozen snapshots, no client
  amounts). See S-1.

## Session abuse

- **🟡 S-9 — Sessions/CORS are reasonable.** JWT access token 15 min
  (`config/settings/base.py:159`), refresh rotation + blacklist, logout blacklists
  (`apps/accounts/views.py:52-72`), password changes revoke all tokens
  (`apps/accounts/services.py:106-129`). Sessions use Redis cache backend
  (`config/settings/base.py:195-199`).
- **🟡 S-10 — No login device/session enumeration or throttle on token refresh.**
  Refresh endpoint uses no custom throttle (global user throttle applies). Minor.

## CSRF

- **✅** API is JWT-based (no session cookies), so CSRF is largely N/A for the API;
  Django's `CsrfViewMiddleware` protects the admin site; production sets
  `CSRF_COOKIE_SECURE` (`config/settings/production.py`). `CORS_ALLOWED_ORIGINS` is
  restricted (`config/settings/base.py:178-179`).

## Permission issues

- **🟠 S-11 — `IsAdminUser` vs `IsStaffUser` semantics.** DRF's `IsAdminUser` only
  checks `is_staff` (`rest_framework.permissions.IsAdminUser`), and the accounts
  admin views use it (`apps/accounts/views.py:334+`). Any staff user can manage
  customers. Consistent across the app, but note that "admin" and "staff" are the
  same permission tier — there is no superuser-only tier for payment/refund
  operations (and none exist yet anyway).
- **🟡 S-12 — Customers can cancel `PAID` orders** (`apps/orders/constants.py:25`,
  `apps/orders/views.py:110`). Combined with B-4 this is a financial-data-integrity
  issue: paid orders can be cancelled without refund/restock. Decision needed:
  restrict customer cancellation to `PENDING_PAYMENT`/`PROCESSING`, or implement a
  real refund path first.
- **🟡 S-13 — Staff transition endpoint accepts any target status string** and maps
  it through `ALLOWED_TRANSITIONS` (`apps/orders/views.py:126-139`) — safe by
  construction (invalid values raise), but a staff user can set `REFUNDED` on any
  order with no refund record (B-5).

## OWASP-ish hygiene already handled

- Error envelope never leaks internals in production (`apps/common/exception_handler.py:56-69`).
- Image uploads validated by Pillow content, size, dimensions; SVG rejected; EXIF
  stripped (`apps/common/utils.py:87-160`).
- Argon2 password hashing (`config/settings/base.py:99-104`).
- Password-reset always returns 204 (no account enumeration)
  (`apps/accounts/views.py:126-137`); resend-verification likewise.
- Production settings fail loudly on missing SECRET_KEY / DATABASE_URL / SMTP
  (`config/settings/production.py`).
