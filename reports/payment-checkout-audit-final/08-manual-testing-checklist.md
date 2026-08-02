# Final Audit — 08: Manual Testing Checklist

Automated coverage exists for every item below (`pytest`); this checklist is
for an end-to-end smoke test against a running dev server.

## Setup

```bash
.venv/Scripts/python.exe manage.py migrate
.venv/Scripts/python.exe manage.py runserver
# Swagger UI:  /api/schema/swagger-ui/
```

## 1. Payment methods

- [ ] `GET /api/payments/methods/` (public) returns only enabled methods,
      sorted by `sort_order`, with instructions/account/QR for manual methods.
- [ ] As staff: create a disabled method → it disappears from the public list.
- [ ] As staff: update instructions, toggle enabled, delete a method.

## 2. Manual payment submission (customer)

1. Register/login, add an item to the cart.
2. `POST /api/orders/checkout/` (note `idempotency_key`; order starts
   `PENDING_PAYMENT`).
3. `POST /api/payments/submit/` with `method_id` (e.g. bKash), reference,
   optional receipt (multipart) → 201, status `PENDING`.
4. Repeat the same submit → 400 `PAYMENT_SUBMISSION_ERROR` (one pending only).
5. Check admin inbox: `payment_submission` email was sent.

## 3. Staff verification queue

1. As staff: `GET /api/payments/admin/submissions/` → submission with receipt
   URL.
2. `POST .../review/` `{approve:false}` → 200, order still `PENDING_PAYMENT`,
   no `Payment` row.
3. Resubmit as customer → 201. Then `POST .../review/` `{approve:true}` →
   order `PAID`, `Payment` SUCCEEDED, stock committed (QOH decreased).
4. Review the same submission again → 409 `SUBMISSION_ALREADY_REVIEWED`.

## 4. Order status machine

- [ ] Unpaid order: customer cancel → `CANCELLED`, reservation released
      (QOH unchanged, reserved decreased).
- [ ] Paid order: customer cancel → 400 `ORDER_CANCELLATION_NOT_ALLOWED`.
- [ ] Staff transition `PAID → PROCESSING → SHIPPED → DELIVERED` works;
      `SHIPPED → REFUNDED` rejected; `DELIVERED → REFUNDED` works.

## 5. Refund

1. Deliver a paid order, then `POST /api/orders/<num>/refund/` → 201.
2. Verify: order `REFUNDED`, payment `REFUNDED`, stock restocked (QOH +2 for a
   qty-2 item), `Refund` row with amount == grand_total.
3. Repeat refund → 400 `ALREADY_REFUNDED`.
4. Try refunding with `amount: 20.00` → 400 `REFUND_ERROR` (full only).
5. Non-staff refund → 403.

## 6. Guest tracking

- [ ] `POST /api/orders/track/` with correct number+email → 200, public order.
- [ ] Wrong email → 404 (same envelope as unknown number).
- [ ] With phone: correct phone → 200; wrong phone → 404.
- [ ] Hit it >10×/min → 429.

## 7. Idempotency & races (optional, covered by tests)

- [ ] Same `idempotency_key` at checkout twice → same order, no duplicate.
- [ ] Double `initiate` on a paid order → 400 `DUPLICATE_PAYMENT`.
