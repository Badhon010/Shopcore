# 2. Missing features

Everything below does **not** exist anywhere in the codebase (backend or frontend).

## Payment methods

- **No `PaymentMethod` / gateway-configuration model.** There is nothing an admin
  can enable/disable or configure (no model, no admin UI, no API). Only the
  `PaymentProvider` enum (`apps/payments/constants.py:5-10`).
- **No Cash-on-Delivery** as a distinct flow. `MANUAL` immediately marks the payment
  succeeded (`apps/payments/gateways/manual.py:25`) — that is an
  "admin-confirmed / already-paid" semantics, not "collect on delivery".
- **No Manual bank transfer / bKash / Nagad / Rocket** payment methods with:
  instructions, account number, account name, QR image, payment notes, verification
  status, reference number, receipt upload, automatic admin notification.
- **No Stripe** — enum value + `NotImplementedError` stub
  (`apps/payments/gateways/stripe_gateway.py:29-55`); `stripe` is not in
  `requirements.txt`.
- **No SSLCommerz / PayPal / Nagad / Rocket** — not even enum values for the last two.

## Guest checkout (entire flow)

- Guest cart — frontend sends `X-Cart-Token` but the backend requires
  `IsAuthenticated` on every cart view (`apps/cart/views.py:16-18`).
- Guest address — `Address` is `user`-FK owned (`apps/accounts/models.py:60`); no
  guest address storage.
- Guest checkout endpoint — `CheckoutView` inherits the global authenticated default
  (`apps/orders/views.py:43`).
- Guest order lookup / tracking — no `POST /orders/track/` endpoint on the backend
  (frontend calls it, see §3).
- Guest order cancellation / history via order-number + email/phone — nothing.
- Guest wishlist policy — wishlist is auth-only (`apps/wishlist/views.py:15-17`).
- Guest cart merge endpoint — `merge_guest_cart_into_user_cart` exists as a service
  (`apps/cart/services.py:150-185`) but **no URL/view calls it**; the storefront
  explicitly discards the guest token on login
  (`frontend-store/src/contexts/AuthContext.tsx:116-120`).
- Guest phone verification — `User.phone_number` exists
  (`apps/accounts/models.py:29-37`) but there is no phone verification anywhere.

## Admin payment management

- Payment dashboard / payment list page in `frontend-admin` (navigation has no
  payments section — `frontend-admin/src/constants/navigation.ts`).
- Manual payment verification (approve / reject) API or UI.
- Refund endpoint / refund UI / refund records (amount, reason, gateway result).
- Payment timeline / payment logs / payment search & filters.
- Receipt upload viewer; transaction viewer.
- Payments export (exports app covers orders but not payments —
  `apps/exports/views.py`).
- Payment gateway configuration UI (keys, sandbox/live toggles).

## Orders / fulfilment

- Invoice generation — no endpoint, no template, no model. The storefront
  OrderDetailsPage "Invoice" button is `window.print()` only
  (`frontend-store/src/pages/OrderDetailsPage.tsx:48`).
- Packing step — no `PACKING`/`READY_TO_SHIP` status; `ALLOWED_TRANSITIONS`
  jumps `PROCESSING → SHIPPED` (`apps/orders/constants.py:23-31`).
- Auto-cancellation / reservation expiry — a `PENDING_PAYMENT` order holds stock
  indefinitely; there is no background job to expire it (no Celery tasks, no
  management command).
- Refund → stock restock (`RETURN` movement type exists but is never written:
  `apps/inventory/constants.py:12`).
- Shipping carrier / tracking-number field on orders.

## Infrastructure / docs

- `.env.example` — referenced by `base.py` and `stripe_gateway.py`, does not exist.
- `docs/PRODUCTION_READINESS_AUDIT_1.md … _4.md` — referenced by README, CHANGELOG,
  ARCHITECTURE.md, and code comments; the files are not in `docs/`.
- Celery is intentionally inactive (`config/celery.py` is a stub) — emails are
  synchronous with a timeout; acceptable at v1 scale but noted as a design limit.
- Webhook **event processing** — the webhook view + signature hook exist, but no
  gateway actually consumes events or updates `Payment` from them.

## Storefront gaps (features the spec lists that the UI lacks)

- Payment method **selection** UI — `PaymentPage` hardcodes "Cash on delivery"
  (`frontend-store/src/pages/PaymentPage.tsx:96-101`).
- No UI for manual-payment instructions / receipt upload / reference number.
- No order-history for guests; no "create account after checkout" step.
