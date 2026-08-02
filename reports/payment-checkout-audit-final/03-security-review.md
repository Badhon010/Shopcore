# Final Audit — 03: Security Review

Review of the Phase 2 changes against the original audit's S-1…S-13 list.

## Concurrency / race conditions — resolved

| Threat | Defense | Layer |
|--------|---------|-------|
| Double payment on one order (duplicate SUCCEEDED) | Unique DB constraint on `Payment(order, status=SUCCEEDED)` + app-level check + IntegrityError→409 in views | DB + service + view |
| Double manual submission for one order | `Order.objects.select_for_update()` inside `submit_manual_payment` atomic block | Service |
| Concurrent approve of same submission | `select_for_update` on the submission row + `SUBMISSION_ALREADY_REVIEWED` | Service |
| Two submissions racing to approve the same order | IntegrityError on the unique payment constraint → 409 | DB + view |
| Double refund | `AlreadyRefundedError` check inside atomic; REFUNDED is terminal | Service |
| Double restock on repeated REFUNDED | Idempotency guard on `restock()` (per-reference, RETURN movement) | Inventory |
| Webhook replay attacks (same event twice) | `PaymentEventLog` unique `(provider, event_id)` — replays short-circuit to `{status:"duplicate"}` and can never record a payment twice | DB + service |

## Gateway webhook security (H-3)

| Provider | Verification |
|----------|--------------|
| SSLCommerz | IPN `verify_sign` (MD5 over `verify_key` fields + store password) + server-side `val_id` validation API call before recording payment |
| Stripe | HMAC signature with `STRIPE_WEBHOOK_SECRET` (official SDK `Webhook.construct_event`) |
| PayPal | Official `POST /v1/notifications/verify-webhook-signature` using `PAYPAL_WEBHOOK_ID` + transmission headers |
| Unknown provider | `UNKNOWN_PROVIDER` 400 (no handler reached) |
| Bad signature | `INVALID_SIGNATURE` 400 (verified in `test_gateway_architecture.py`) |

Credentials are read **only** from environment variables — never from the DB
or client input. `PaymentMethod.gateway_config` holds only non-secret config
(sandbox/live, per-method flags). No secrets are returned by any serializer.

## Access control

| Check | Status |
|-------|--------|
| Refund endpoint staff-only (`IsStaffUser`) | ✅ tested (non-staff → 403) |
| Admin payment methods CRUD staff-only | ✅ tested |
| Admin submission queue + review staff-only | ✅ tested |
| Manual submission restricted to order owner (404 for foreign orders, no existence leak) | ✅ tested |
| Guest tracking: mismatch → same 404 envelope as missing order (no order-number probing) | ✅ tested |
| Guest cancel/payment: lookup secret required (phone, or email + token); registered user cannot act on an unclaimed guest order | ✅ tested |
| Guest lookup token stored as SHA-256 hash; plain value returned once at checkout | ✅ tested |

## Confidentiality / tampering

- `PublicOrderSerializer` exposes no email/phone/lookup token/payment internals.
- Receipt uploads: filename preserved via sanitized upload path; served only to
  staff via the submission serializer (no public receipt endpoint).
- Guest identity never leaked through `OrderSerializer` to other users
  (owner-only list/detail; admin view is staff-only).
- Admin notifications carry order/summary data only (no credentials).

## Rate limiting

- `OrderTrackThrottle` (10/min per IP) on the public tracking endpoint — the
  primary unauthenticated surface (plus the public payment-methods list,
  which is read-only).
- Login 5/min, register 10/hour, coupon 20/min — unchanged.

## Verdict

**No new security issues introduced.** The highest-risk new surfaces (public
tracking, manual payment review, refunds, gateway webhooks) are
throttled/locked/owner-checked/signature-verified and covered by tests.
