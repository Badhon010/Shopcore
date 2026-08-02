# Additional Audit — H-4: Full Guest Checkout

**Status:** Partially implemented. Guest **tracking** (C-3) is done. Full guest
**checkout** is gated on product decisions below.

## What is done

- `POST /api/orders/track/` — order number + email (+ optional phone) lookup,
  throttled, anti-probing (same 404 envelope), returns `PublicOrderSerializer`.
- `PublicOrderSerializer` — guest-safe projection (no payment internals).

## What blocks full guest checkout

The Phase 2 brief requires: guest cart, guest address capture, guest checkout,
guest payment, guest order history (order# + phone/email), guest cancellation,
and optional account creation after checkout. The audit reports describe these
as **missing** but do not specify HOW they should behave. The following are
open product decisions, not code gaps — guessing them violates the rules.

### 1. Guest identity & the User model

`Order.user` is a required FK to `apps.accounts.User`. There is no anonymous/
guest user concept, and `Order` has no `guest_email`/`guest_phone` fields.

- **Decision A:** Create a real (anonymous) `User` per guest checkout?
- **Decision B:** Add nullable `guest_email` / `guest_phone` snapshot fields to
  `Order` (migration needed)?
- **Decision C:** Reuse the `shipping_address_snapshot` (check whether it
  actually stores phone — see code) for tracking without schema change?

### 2. Guest cart

`Cart` requires a `user` FK (no token-based cart in the audit). The storefront
sends an `X-Cart-Token` header, but the backend has no such concept.

- **Decision A:** Implement a `cart_token` field + guest cart endpoints?
- **Decision B:** Skip backend guest cart and require login to add items?
- **Decision C:** Merge guest cart into a registered user's cart at checkout?

### 3. Guest address capture

Addresses live under `apps.accounts.Address` keyed to `user`. A guest has no
user row. Need: inline address capture at checkout, or an `Address`-like
snapshot on the order (the order already has `shipping_address_snapshot` —
verify what it stores).

### 4. Guest payment

Guest + manual submission requires the order owner to be the submitter. With no
guest identity, `submit_manual_payment`'s `order.user_id != user.pk` check
breaks. Guest payment needs its own authorization model (email+phone as bearer
secret, like tracking).

### 5. Guest order history

A list endpoint equivalent to `GET /api/orders/` but authenticated by
order-number+email/phone instead of a token. Decision needed on the envelope
(one order vs list, pagination).

### 6. Guest cancellation

Extend the cancel flow to guests (same secret-based auth as tracking) and
decide whether the same paid-order restriction applies.

### 7. Account creation after checkout

Convert guest order to a registered account: link `Order.user`, merge cart,
verify email ownership, prevent email-enumeration (order already exists under
that email?).

## Files that need investigation / changes for H-4

| File | What's needed |
|------|---------------|
| `apps/accounts/models.py` | `User` guest handling / nullable order-owner |
| `apps/orders/models.py` | `guest_email` / `guest_phone` snapshot fields (migration) |
| `apps/cart/models.py` | Guest cart (`cart_token`) or merge logic |
| `apps/orders/views.py` | Guest checkout view, guest history, guest cancel |
| `apps/orders/serializers.py` | Guest checkout/cancel serializers |
| `frontend-store` | GuestCart, guest checkout forms, guest order history UI |

## Verdict

Guest **tracking** is production-ready and tested (46 new tests cover C-3).
Full guest **checkout** needs the product decisions above (identity model
first). **Recommend a follow-up decision session with the owner, then implement
H-4 as a separate phase.**
