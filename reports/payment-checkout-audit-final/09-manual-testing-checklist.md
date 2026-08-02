# Final Audit — 09: Manual Testing Checklist

Automated coverage exists for every item below (`pytest`); this checklist is
for an end-to-end smoke test against a running dev server.

## Setup

```bash
.venv/Scripts/python.exe manage.py migrate
.venv/Scripts/python.exe manage.py runserver
# Storefront: cd frontend-store && pnpm dev   (proxy /api → /api/v1)
# Admin:      cd frontend-admin && pnpm dev
# Swagger UI: /api/schema/swagger-ui/
```

## 1. Payment methods

- [ ] `GET /api/payments/methods/` (public) returns only enabled methods with
      instructions/account/QR for manual methods.
- [ ] Admin: create a disabled method → it disappears from the public list.
- [ ] Admin: toggle enabled, edit instructions/account, delete.

## 2. Guest cart (H-4)

- [ ] Anonymous: add to cart → `X-Cart-Token` created; cart page shows items.
- [ ] Anonymous without token → cart requests 401.
- [ ] Login with the token → guest cart items appear in the user's cart.

## 3. Guest checkout (H-4)

1. Anonymous: add item, go to checkout → guest form (name/email/phone +
   address) → continue to payment.
2. Choose a manual method → Place order → submit reference (+ receipt) →
   success page shows "payment pending verification".
3. Save the one-time guest tracking code shown on the success page.
4. Track page: order number + phone → order visible. Order number + email +
   wrong token → 404.

## 4. Manual payment submission (registered customer)

1. Login, add item, checkout, `POST /api/payments/submit/` (method, reference,
   optional receipt) → 201 PENDING.
2. Repeat → 400 `PAYMENT_SUBMISSION_ERROR`.
3. Admin inbox receives `payment_submission` email.

## 5. Staff verification queue

1. Admin: `/payments/submissions` → submission with receipt link.
2. Reject → order stays `PENDING_PAYMENT`, no Payment row.
3. Resubmit → Approve → order `PAID`, `Payment` SUCCEEDED, stock committed.
4. Re-review → 409 `SUBMISSION_ALREADY_REVIEWED`.

## 6. Order status machine

- [ ] Unpaid: customer cancel → `CANCELLED`, reservation released.
- [ ] Paid: customer cancel → 400 `ORDER_CANCELLATION_NOT_ALLOWED`.
- [ ] Staff: `PAID → PROCESSING → SHIPPED → DELIVERED`; `SHIPPED → REFUNDED`
      rejected; `DELIVERED → REFUNDED` works.

## 7. Refund (admin UI + API)

1. Deliver a paid order → Refund modal → confirm → order `REFUNDED`, payment
   `REFUNDED`, stock restocked, `Refund` row = grand_total.
2. Repeat → 400 `ALREADY_REFUNDED`. Partial amount → 400 `REFUND_ERROR`.

## 8. Gateway providers (when credentials are configured)

1. Add env vars (`.env`): `SSLCOMMERZ_STORE_ID/PASSWORD`, `STRIPE_SECRET_KEY`,
   `PAYPAL_CLIENT_ID/SECRET` (+ webhook ids). Restart server.
2. Admin: enable SSLCommerz → `is_configured=true`, appears at checkout.
3. Checkout with SSLCommerz → redirect to gateway sandbox → return → webhook
   marks order PAID (sandbox IPN configured to `POST /api/payments/webhook/sslcommerz/`).
4. Without credentials: enabled-but-unconfigured → `GATEWAY_NOT_CONFIGURED`.

## 9. Idempotency & races

- [ ] Same `idempotency_key` twice → same order, no duplicate.
- [ ] Double `initiate` on a paid order → 400 `DUPLICATE_PAYMENT`.
- [ ] Duplicate webhook delivery → 200 `{status:"duplicate"}` (PaymentEventLog).

## 10. Claim on registration

- [ ] Place a guest order with email X → register X → verify email → the guest
      order appears in the account's order history (claimed, not duplicated).
