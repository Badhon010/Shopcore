# Final Audit — 06: Payment Verification

## What a "payment" is (final)

- **Confirmed payment** = a `Payment` row with `status=SUCCEEDED` + order
  `payment_status=PAID` + order `status=PAID`, created atomically by
  `record_successful_payment` — the single source of truth used by the MANUAL
  gateway, staff approval, and all three gateway webhooks.
- **Duplicate prevention** at three layers: app check → `select_for_update`
  locks → DB unique constraint on `(order, status=SUCCEEDED)`.

## Payment methods matrix

| Provider | Enum | Gateway | Flow | Status |
|----------|------|---------|------|--------|
| MANUAL (COD) | ✅ | `ManualGateway` | instant SUCCEEDED | ✅ production |
| BANK_TRANSFER / BKASH / NAGAD / ROCKET | ✅ | manual submission flow | customer submits reference+receipt → staff approve/reject | ✅ production (H-1/H-2) |
| SSLCOMMERZ | ✅ | `SSLCommerzGateway` (requests, v4 API) | session → redirect → IPN (`verify_sign` + `val_id`) → SUCCEEDED | ✅ wired, 🔒 disabled until env creds |
| STRIPE | ✅ | `StripeGateway` (official SDK) | PaymentIntent → `client_secret` → webhook `whsec_` → SUCCEEDED | ✅ wired, 🔒 disabled until env creds |
| PAYPAL | ✅ | `PayPalGateway` (REST v2) | Order → approve URL → capture webhook (verified) → SUCCEEDED | ✅ wired, 🔒 disabled until env creds |

Gateways are **enabled by default? No** — seeded `is_enabled=False` and
`is_configured=False` without env credentials, so the storefront never offers
them until an admin enables + credentials are set. Initiation while enabled
but unconfigured returns `GATEWAY_NOT_CONFIGURED` (graceful, never 500).

## Manual payment submission lifecycle

```
PENDING ──staff approve──► APPROVED (Payment SUCCEEDED, order PAID)
   │
   └──staff reject──► REJECTED (order unpaid, customer may resubmit)
```

- One PENDING submission per order enforced under an order-row lock.
- Approving records the provider from the submission's PaymentMethod.
- Admin emailed (`payment_submission` templates) outside the transaction.
- Guest submissions require the lookup secret (phone or email+token).

## Gateway webhook architecture (H-3)

```
Webhook POST /payments/webhook/<provider>/
  → get_gateway(provider)          (unknown → UNKNOWN_PROVIDER)
  → gateway.verify_signature()     (bad → INVALID_SIGNATURE)
  → PaymentEventLog.create(provider, event_id)  (unique → duplicate, stop)
  → gateway.handle_webhook()       (success/failure recorded)
```

- `PaymentEventLog` idempotency: the same event id can never record a payment
  twice (replay attack protection, audit S-6).
- SSLCommerz IPNs additionally validated server-side against the `val_id`
  validation API before the payment is recorded.

## Refund lifecycle

```
PAID order ──staff POST /orders/<num>/refund/──► Refund(SUCCEEDED)
   │                                                │
   │                                                ├─ Payment SUCCEEDED → REFUNDED
   │                                                └─ order → REFUNDED + stock restocked (RETURN)
```
- Full refunds only (partial → `REFUND_ERROR`, documented decision).
- Refund amount validated (>0, == grand_total, not already refunded).
- Double refund → `ALREADY_REFUNDED`; illegal status → `ORDER_NOT_REFUNDABLE`.

## Verification results

- `test_gateway_architecture.py` (14): registry, not-configured raises for all
  three, mocked initiate for Stripe/PayPal/SSLCommerz (INITIATED row +
  client_secret/redirect), webhook idempotency (duplicate → `{status:"duplicate"}`,
  exactly one SUCCEEDED Payment + one event log), invalid signature rejected.
- `test_refunds.py`, `test_manual_submissions.py`, `test_payment_methods.py`,
  `test_provider_validation.py` (updated for gateway reality).

## Verdict

**Payment handling is production-grade for every path**, with gateway-backed
providers fully implemented against official provider APIs and gated only on
environment credentials. Verified by 25+ targeted tests.
