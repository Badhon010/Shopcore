# Additional Audit — H-3: Real Payment Gateways (SSLCommerz / Stripe / PayPal)

**Status:** Information requested — implementation **stopped** for this feature.

## Why implementation cannot safely continue

The Phase 2 brief lists SSLCommerz, Stripe, and PayPal as target payment
methods, and `PaymentProvider` now includes `STRIPE`, `SSLCOMMERZ`, `PAYPAL`,
`BKASH`, `NAGAD`, `ROCKET`, `BANK_TRANSFER` enum members. However, the audit
reports contain **no verified information about how any gateway should
integrate**. Per the implementation rules ("If anything required is missing
from the audit, STOP and produce another audit"), the gateway work is gated.

## What is already decided (verified in code)

| Item | State |
|------|-------|
| `Payment` model | Stores `order`, `amount`, `currency`, `provider`, `status` (PENDING/SUCCEEDED/FAILED/REFUNDED), `raw_response` |
| `PaymentProvider` enum | `MANUAL`, `BANK_TRANSFER`, `BKASH`, `NAGAD`, `ROCKET`, `STRIPE`, `SSLCOMMERZ`, `PAYPAL` |
| Gateway abstraction | `apps/payments/gateways/base.py` — `initiate()`, `verify_signature()`, `handle_webhook()` |
| `get_gateway()` | Registry; only `MANUAL` (and manual-method providers via submissions) registered |
| Order↔payment link | `Payment.payment_reference` + DB unique constraint on `(order, status=SUCCEEDED)` |
| Webhook endpoint | `POST /api/payments/webhook/<provider>/` — signature-verified, idempotency via duplicate-payment constraint |
| Manual methods | Fully wired (H-1/H-2): `PaymentMethod` config + `ManualPaymentSubmission` + staff review |

## Missing information required to integrate each gateway

### SSLCommerz (Bangladesh, likely primary for this store)

1. **Account/test credentials** — sandbox merchant id, store password, whether
   we have access to `https://sandbox.sslcommerz.com`. (Where do these live? No
   env vars documented for SSLCommerz in `.env.example`.)
2. **API version** — SSLCommerz v3 (JSON) vs v4; endpoint bases.
3. **Session flow** — confirm the intended flow: `POST /api/payments/initiate/`
   creates an SSLCommerz session (server-side) and returns a `GatewayPageURL`
   for the storefront to redirect to; webhook = `POST /api/payments/webhook/sslcommerz/`.
4. **Success/fail/cancel URLs** — which storefront routes receive the customer
   after payment; how the `tran_id` (payment_reference) is correlated.
5. **Signature** — verify signature format (`verify_signature` with store
   password), the `val_id` verification API (`/validator/api/validationserverAPI.php`).
6. **IPN payload fields** — `tran_id`, `val_id`, `status`, `amount`,
   `bank_txn_id`, `card_type`, `error`, `verify_sign`, `store_amount`, etc.
7. **Refund** — SSLCommerz refund API (`/validator/api/merchantTransIDvalidationAPI.php`
   + refund endpoint) — requires which credentials/whitelisted IPs?
8. **Currency** — BDT handling; `DEFAULT_CURRENCY` is `USD` — confirm which is
   correct for this store (Bangladesh-based methods suggest BDT).

### Stripe

1. **Existing keys** — `STRIPE_PUBLISHABLE_KEY` / `STRIPE_SECRET_KEY` documented
   in FRONTEND_ADMIN_GUIDE as "v2 stub" — are real keys available?
2. **Integration pattern** — PaymentIntent + client_secret (frontend confirms)
   vs Checkout Session (redirect). The existing `PaymentIntent` dataclass shape
   suggests PaymentIntent + client_secret.
3. **Webhook secret** — `whsec_...` for signature verification (env var name?).
4. **Refund** — Stripe Refund API; currency support (USD).
5. **3DS handling** — requires redirect / SCA flows.

### PayPal

1. **Pattern** — Orders v2 API (create → approve → capture) vs classic Express
   Checkout. `PayPal-Request-Id` idempotency header.
2. **Credentials** — client id/secret env vars (`.env.example` has none).
3. **Webhook** — `PAYMENT.CAPTURE.COMPLETED` events; webhook id for
   verification; `paypal-transmission-*` headers.
4. **Refund** — `POST /v2/payments/captures/{id}/refund`.

## Files that need investigation / changes for H-3

| File | What's needed |
|------|---------------|
| `apps/payments/gateways/sslcommerz_gateway.py` | Full implementation (currently absent) |
| `apps/payments/gateways/stripe_gateway.py` | Replace `NotImplementedError` stubs |
| `apps/payments/gateways/paypal_gateway.py` | Full implementation (currently absent) |
| `apps/payments/services.py` `get_gateway()` | Register the three gateways |
| `.env.example` | Add `SSLCOMMERZ_*`, `STRIPE_WEBHOOK_SECRET`, `PAYPAL_*` vars |
| `config/settings/*.py` | Read new env vars |
| `apps/payments/tests/test_gateways.py` | Provider-specific signature + webhook tests |
| `frontend-store` | PaymentPage flow per gateway (redirect vs client_secret confirm) |

## Verdict

Implementing gateways without answers to the above would require guessing API
contracts, credentials, and business flows — explicitly forbidden. **Recommend
a follow-up Q&A with the store owner for credentials and the SSLCommerz/Stripe/
PayPal integration pattern, then implement H-3 as a separate phase.**
