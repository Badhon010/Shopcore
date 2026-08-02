# Payment System, Complete Order Workflow & Guest Checkout — Phase 1 Audit

**Status:** Complete code audit · **Date:** 2026-08-02 · **Scope:** `apps/payments`,
`apps/orders`, `apps/cart`, `apps/coupons`, `apps/inventory`, `apps/accounts`,
`apps/notifications`, `apps/dashboard`, `apps/exports`, `apps/search`,
`config/`, `frontend-store/`, `frontend-admin/`, `docs/`.

> ⚠️ This report was produced from reading the codebase. Nothing was assumed.
> Where behavior could not be verified with confidence it is flagged as
> **UNVERIFIED** so it can be confirmed before Phase 2 begins.

---

## Executive summary

| Area | Verdict |
| ---- | ------- |
| Cart (authenticated) | ✅ Production-ready |
| Coupons | ✅ Production-ready (locked checkout path) |
| Inventory reservation / stock movement | ✅ Production-ready (row locks + idempotency) |
| Orders (place / transition / history) | ✅ Production-ready, with 2 notable data-integrity gaps (see §6) |
| Payments — abstraction layer | 🟡 Partial (interface + MANUAL gateway only) |
| Payment methods (COD / bank transfer / bKash / Nagad / Rocket / SSLCommerz / Stripe / PayPal) | ❌ Missing |
| Payment gateway config & enable/disable | ❌ Missing |
| Manual payment verification (receipt, reference, QR, instructions) | ❌ Missing |
| Refund flow | 🟡 Partial (status flag only, no money/stock reversal) |
| Invoice generation | ❌ Missing (print-preview only) |
| Guest checkout / guest cart / guest order tracking | ❌ Missing (frontend only, backend absent) |
| Admin payment management (dashboard, verification, logs, timeline) | ❌ Missing |
| Webhooks | 🟡 Framework exists; no real gateway uses it |
| Background jobs (Celery) | 🟡 Stub, intentionally inactive in v1 |
| Tests | ✅ Good coverage of order/inventory/payment services (see §10 of index) |
| Docs | 🟡 `PRODUCTION_READINESS_AUDIT_*.md` referenced but files missing |

**Headline findings (details in the sections below):**

1. **Only one payment method actually exists** — `MANUAL`, which marks a payment
   succeeded immediately (`apps/payments/gateways/manual.py:25`). There is no
   COD-as-pending, no bank transfer, no bKash/Nagad/Rocket/SSLCommerz/Stripe/PayPal.
   `STRIPE`/`SSLCOMMERZ`/`BKASH` are enum values with no working gateway
   (`apps/payments/constants.py:5`, `apps/payments/gateways/stripe_gateway.py:22`).
2. **Guest checkout is not implemented.** Cart is auth-only
   (`apps/cart/views.py:16-18`), checkout is auth-only (`apps/orders/views.py:43`),
   addresses are user-owned (`apps/accounts/models.py:60`). The frontend ships
   guest-cart token code (`frontend-store/src/services/api/cart.service.ts:27-55`)
   that the backend ignores, and a Track Order page that calls a non-existent
   endpoint (see #5).
3. **Cancelling a *paid* order loses stock and issues no refund.** `PAID → CANCELLED`
   is an allowed transition (`apps/orders/constants.py:25`) and customer-cancellable
   (`apps/orders/views.py:110`), but cancellation only *releases reservations*
   (`apps/orders/services.py:323`), which are already consumed by `commit_sale` on
   payment. `quantity_on_hand` is never restored and no refund record is created.
   The `RETURN` movement type (`apps/inventory/constants.py:12`) is dead code.
4. **The refund "flow" is a status flag only.** `DELIVERED → REFUNDED` sets
   `payment_status = REFUNDED` (`apps/orders/services.py:304-305`) and nothing else —
   no gateway refund call, no refund amount/record, no stock restock, no admin UI.
5. **`/orders/track/` does not exist on the backend** but the storefront Track Order
   page posts to it (`frontend-store/src/services/api/endpoints.ts:44`,
   `frontend-store/src/services/api/orders.service.ts:28`). The page always errors.
6. **No `.env.example` and no `docs/PRODUCTION_READINESS_AUDIT_*.md`** even though
   both are referenced repeatedly in code, README, and CHANGELOG.
7. **Architecture is genuinely solid where it exists:** atomic checkout with an
   idempotency key scoped to `(user, key)` (`apps/orders/models.py:70-78`), DB-level
   backstop against duplicate successful payments
   (`apps/payments/models.py:31-42`), `select_for_update` order transitions
   (`apps/orders/services.py:293`), row-locked coupon limits
   (`apps/coupons/services.py:74-93`), and append-only `StockMovement` audit with
   per-reference idempotency (`apps/inventory/services.py:88-110, 124-150`).

**UNVERIFIED items to confirm before Phase 2 (ask for a follow-up audit on):**

- Exact intended semantics of "Cash on Delivery" (should payment stay pending until
  delivery, or is immediate success acceptable?).
- Which payment providers must go live in this milestone (the enum currently has
  no PAYPAL/NAGAD/ROCKET at all).
- Whether guest checkout must support a *guest address* (no model exists) or must
  be email/phone-only.
- Whether invoice = server-generated PDF/HTML document or a printable page is enough.

---

## Report contents

| # | Section | File |
| - | ------- | ---- |
| 1 | Existing features | [`01-existing-features.md`](01-existing-features.md) |
| 2 | Missing features | [`02-missing-features.md`](02-missing-features.md) |
| 3 | Broken features | [`03-broken-features.md`](03-broken-features.md) |
| 4 | Fake features | [`04-fake-features.md`](04-fake-features.md) |
| 5 | Duplicate logic | [`05-duplicate-logic.md`](05-duplicate-logic.md) |
| 6 | Security issues | [`06-security-issues.md`](06-security-issues.md) |
| 7 | Data flow | [`07-data-flow.md`](07-data-flow.md) |
| 8 | API & config inventory | [`08-api-config-inventory.md`](08-api-config-inventory.md) |
| 9 | Implementation plan (Phase 2) | [`09-implementation-plan.md`](09-implementation-plan.md) |
