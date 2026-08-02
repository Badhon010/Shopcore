# Final Audit — 07: Guest Checkout Verification

## DONE (all H-4 features implemented + tested)

### Guest cart
- `X-Cart-Token` header keys a guest cart (`Cart.session_key`, `user=NULL`).
- `GuestCartPermission` rejects anonymous requests without a token (401).
- Anonymous add/update/remove/clear all work with the token.
- **Merge on login**: `CustomTokenObtainPairSerializer` reads the header and
  calls `merge_guest_cart_on_login` — quantities summed, guest cart
  deactivated, idempotent no-op when absent.

### Guest checkout
- `POST /orders/checkout/` accepts a guest variant (no auth): `guest_name`,
  `guest_email`, `guest_phone`, `shipping_address` snapshot, coupon, notes,
  `idempotency_key` (scoped to `guest_session_id + key`).
- `Order.user` is **nullable**; guest identity + `guest_session_id` persisted.
- `guest_lookup_token` (≥32-char secure random) returned **once** at checkout;
  only its SHA-256 hash is stored.

### Guest lookup & tracking
- `POST /orders/track/` — **order number + phone** (matches `guest_phone` or
  shipping snapshot) **OR order number + email + lookup token**.
- Mismatch → same 404 envelope as a missing order (anti-probing, S-5).
- Throttled 10/min/IP. Returns `PublicOrderSerializer` (never exposes
  email/phone/token).

### Guest cancellation
- `POST /orders/<num>/cancel/` accepts the same secret (phone, or email +
  token) — guest cancel is allowed for unpaid orders, releases reservations.

### Guest payments
- `POST /payments/submit/` accepts guest identity; ownership verified via the
  lookup secret before a PENDING submission is created.
- A registered user cannot act on a guest order until it is claimed.

### Claim on registration/login
- Verified email (registration verification or login) triggers
  `claim_guest_orders` — past guest orders with the same email attach to the
  account (never duplicates, never overwrites an owner).
- Unverified identities never claim.

## Tests (`apps/orders/tests/test_guest_checkout.py`, 16)

Guest cart requires token / works with token / add item / authenticated still
works · guest checkout creates guest order with identity + hashed token /
requires token (CART_TOKEN_REQUIRED) / idempotent / empty cart rejected /
invalid country rejected · lookup by phone / by email+token / wrong phone 404 /
wrong token 404 / no internals leaked · guest cancel with phone / without
secret 404 · claim on login / unverified no-claim / verify-email claim · cart
merge on login.

## Verdict

**Full guest checkout is complete, secure, and tested.** The guest identity
model follows the audit decision (H-4): identity stored on the order, lookup
gated by bearer secret, claim gated by verified email.
