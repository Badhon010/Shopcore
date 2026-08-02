# 9. Implementation plan (Phase 2)

Produced only after the Phase 1 audit. **Nothing here is implemented.** Priority is
driven by the audit: fix data-integrity bugs before adding surface area.

> ⚠️ Confirm the UNVERIFIED items in the cover README before starting Phase 2 —
> especially COD semantics, which providers are in scope, and whether guests need a
> stored address.

## P0 — Critical (data integrity & security, do first)

### C-1. Fix paid-order cancellation (B-4)
Restore stock + require refund when a PAID order is cancelled; restrict
customer-initiated cancellation to pre-paid statuses (or gate it behind refund).

- **Backend files:** `apps/orders/constants.py` (transition map), `apps/orders/services.py`
  (`_release_reservations_for_order` → release *and* restock on paid cancel /
  `refund`), `apps/inventory/services.py` (add `restock`/`RETURN` usage), `apps/orders/views.py`
  (cancel policy), `apps/payments/services.py` (refund helper).
- **Migrations:** none strictly required (uses existing `RETURN` movement type).
- **Tests:** `apps/orders/tests/test_inventory_rollback.py` (add PAID→CANCELLED case),
  `apps/orders/tests/test_services.py`.
- **API:** possibly `POST /orders/<n>/refund/` (staff) if cancellation must refund.

### C-2. Implement a real refund flow (B-5)
Money movement for MANUAL (record refund + set `Payment.status=REFUNDED` + order
`REFUNDED` + restock). For future gateways, per-gateway refund calls.

- **Backend:** `apps/payments/models.py` (refund fields or a `Refund` model),
  `apps/payments/services.py` (refund service), `apps/payments/serializers.py`,
  `apps/payments/views.py` + `urls.py` (refund endpoint), `apps/orders/services.py`
  (wire into transition), `apps/inventory/services.py` (restock on refund).
- **Migrations:** 1 (refund model/fields).
- **Tests:** `apps/payments/tests/test_refunds.py` (new), extend `apps/orders/tests/`.
- **API:** `POST /payments/<id>/refund/` (staff) or `POST /orders/<n>/refund/`.

### C-3. Guest order tracking endpoint (B-1)
Implement `POST /orders/track/` (order_number + email [+ phone]) returning a
limited order payload. Order-number enumeration (S-5) requires the email/phone
pair as the lookup key.

- **Backend:** `apps/orders/serializers.py` (TrackOrderSerializer), `apps/orders/views.py`
  (TrackOrderView), `apps/orders/urls.py`, `apps/orders/selectors.py`.
- **Migrations:** none.
- **Tests:** `apps/orders/tests/test_track_order.py` (new) — incl. wrong-email
  negative case and no-order-number-only lookups.
- **API:** `POST /orders/track/`.

## P1 — High (core payment capabilities)

### H-1. PaymentMethod / gateway configuration model + admin API
Admin enable/disable and configure each method (COD, bank transfer, bKash, Nagad,
Rocket, SSLCommerz, Stripe, PayPal): instructions, account number/name, QR image,
notes, gateway keys, sandbox/live.

- **Backend:** `apps/payments/models.py` (PaymentMethod), `serializers.py`,
  `views.py`, `urls.py`, `admin.py`; `config/settings/base.py` (no hardcoded keys).
- **Migrations:** 1.
- **API:** `GET/PUT /payments/admin/methods/`, `GET /payments/methods/` (storefront).
- **Frontend-admin:** `frontend-admin/src/pages/payments/` (new), navigation entry,
  `services/api/payments.service.ts`, `endpoints.ts`.

### H-2. Manual payment submission & verification
Storefront: reference number + receipt upload → admin approve/reject → order paid.

- **Backend:** `apps/payments/models.py` (ManualPaymentSubmission), `serializers.py`,
  `views.py`, `urls.py`, `services.py`, `apps/notifications/services.py` (admin
  notification on submission), `apps/orders/services.py` (transition on approve).
- **Migrations:** 1.
- **API:** `POST /payments/submit/` (customer), `GET/PATCH /payments/admin/submissions/`,
  `POST /payments/admin/submissions/<id>/approve|reject/`.
- **Frontend-store:** `PaymentPage` (selection + manual method UI), `checkout.service.ts`,
  `features/checkout/`.
- **Frontend-admin:** payments page (submissions queue + verify).

### H-3. Real gateway: pick 1–2 for this milestone (recommend SSLCommerz + Stripe)
Implement `PaymentGateway` subclasses, register in `get_gateway()`, implement
`verify_signature` + `handle_webhook` with a processed-events idempotency store
(S-6), and the `INITIATED → SUCCEEDED/FAILED` lifecycle.

- **Backend:** `apps/payments/gateways/sslcommerz_gateway.py`, `stripe_gateway.py`
  (replace stub), `apps/payments/services.py`, `models.py` (webhook-event log),
  `requirements.txt` (stripe SDK; sslcommerz via requests), `.env.example` (new).
- **Migrations:** 1 (webhook event log / payment fields).
- **Tests:** gateway initiate/webhook tests incl. signature + replay (extend
  `apps/payments/tests/test_webhooks.py`).
- **Storefront:** payment selection + redirect/3DS handling in `PaymentPage`.

### H-4. Guest checkout
Guest cart + guest address (or email-only) + guest checkout + guest cancellation +
guest history by (order number, email/phone).

- **Backend:** guest cart endpoints (re-enable session/token path securely),
  `apps/cart/views.py`, `serializers.py`; guest checkout variant in
  `apps/orders/serializers.py` + `views.py` (guest address snapshot input);
  optional account-creation-after-checkout endpoint.
- **Migrations:** 1–2 (guest address/identity if stored).
- **API:** `GET/POST /cart/` unauthenticated with token; `POST /orders/checkout/`
  guest variant; `POST /orders/<n>/cancel/` guest variant.
- **Storefront:** checkout pages without auth (`CheckoutPage`, `PaymentPage`,
  `routeConfig.ts` `requiresAuth` handling, `cart.service.ts` token wiring).

## P2 — Medium (admin management, docs, exports)

- **M-1.** Payment dashboard/timeline/logs page + payment list with search/filters
  (`frontend-admin/src/pages/payments/`, backend `GET /payments/admin/`).
- **M-2.** Payments export (`apps/exports/views.py` + `frontend-admin` ExportsPage).
- **M-3.** Invoice generation (server HTML/PDF endpoint `GET /orders/<n>/invoice/`,
  template; update storefront button to call it).
- **M-4.** Packing status + `PACKING`/`READY_TO_SHIP` in `ALLOWED_TRANSITIONS`
  (`apps/orders/constants.py`, frontend-admin OrderDetailPage).
- **M-5.** Reservation expiry job (management command + Celery task stub or cron)
  to auto-cancel stale `PENDING_PAYMENT` orders (S-7).
- **M-6.** Order-status in-app `Notification` rows for customers
  (`apps/orders/services.py` → `apps/notifications/`).
- **M-7.** Restore `docs/PRODUCTION_READINESS_AUDIT_1..4.md` or update references
  (B-7); create `.env.example`; fix API.md/ARCHITECTURE.md drift (B-8).
- **M-8.** Order-number entropy for guest tracking tokens if required by product
  (S-5).

## P3 — Low (polish, refactors)

- **L-1.** Consolidate cart totals/price-change logic (D-1, D-2) into one service
  used by serializer + preview.
- **L-2.** Consolidate order fetch selectors (D-4).
- **L-3.** Coupon silent-drop UX: surface dropped coupon to the frontend instead of
  silently proceeding (B-10).
- **L-4.** `PENDING_PAYMENT → CANCELLED` expiry semantics + auto-release tests.
- **L-5.** Storefront payment-method footer cleanup (hardcoded Visa/Mastercard/PayPal
  list in `frontend-store/src/components/layout/Footer.tsx:27`).

## Estimate of affected files (planning numbers)

| Layer | Files touched (incl. new) |
| ----- | ------------------------- |
| Backend models/services | ~25 (payments +8, orders +6, cart +3, inventory +2, notifications +2, coupons +1, exports +1) |
| Backend API (views/serializers/urls) | ~18 |
| Migrations | ~6–8 new |
| Backend tests | ~8 new files + ~6 extended |
| frontend-store | ~12 (checkout feature, payment selection, guest flows, services) |
| frontend-admin | ~10 (payments pages, navigation, services, exports) |
| Env vars (new) | ~12–15 (gateway keys, method flags) — document in new `.env.example` |
| Docs | API.md, FRONTEND_ADMIN_GUIDE.md, README, new audit trail |

## Validation gate (required before declaring done)

1. `python manage.py check` — Django system check.
2. `python manage.py makemigrations && python manage.py migrate`.
3. Full pytest suite (`pytest`) — coverage gate is 85% (`pyproject.toml`).
4. `npx tsc --noEmit` in both `frontend-store/` and `frontend-admin/`.
5. Regenerate Swagger (`/api/schema/`) and update `docs/API.md` + `FRONTEND_ADMIN_GUIDE.md`.
6. Manual walkthrough of each payment method + guest flow via the running servers.
