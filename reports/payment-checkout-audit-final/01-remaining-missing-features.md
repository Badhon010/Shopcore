# Final Audit — 01: Remaining Missing Features

## DONE in Phase 2 (final revision)

| Feature | Where | Tests |
|---------|-------|-------|
| Refund flow (Refund model, staff endpoint, restock, payment flag) | `apps/payments/models.py`, `services.process_refund`, `orders/views.RefundOrderView` | `test_refunds.py` |
| Paid-order cancellation prevention + customer cancel restriction | `orders/constants.ALLOWED_TRANSITIONS`, `orders/views.OrderCancelView` | `test_cancel_policy.py` |
| Guest order tracking (number + phone, or number + email + token) | `orders/views.TrackOrderView`, `TrackOrderSerializer`, `PublicOrderSerializer`, `OrderTrackThrottle` | `test_guest_checkout.py` |
| PaymentMethod model + seed + public list + admin CRUD | `payments/models.PaymentMethod`, migration 0004 seed, `PaymentMethodListView`, `AdminPaymentMethodListView/DetailView` | `test_payment_methods.py` |
| Manual payment submission + staff verification + admin email | `payments/models.ManualPaymentSubmission`, `services.submit_manual_payment/review_manual_payment`, admin views, notification + email templates | `test_manual_submissions.py` |
| **H-3 Gateway architecture** — provider interface, registry, `PaymentEventLog` idempotency store, `GatewayNotConfiguredError` | `payments/gateways/base.py`, `payments/services.get_gateway/process_gateway_webhook`, `models.PaymentEventLog` | `test_gateway_architecture.py` |
| **H-3 SSLCommerz gateway** (session API v4, IPN `verify_sign` + `val_id` validation, refund) | `payments/gateways/sslcommerz_gateway.py` | `test_gateway_architecture.py` |
| **H-3 Stripe gateway** (PaymentIntent, webhook verify, refund) | `payments/gateways/stripe_gateway.py` | `test_gateway_architecture.py` |
| **H-3 PayPal gateway** (OAuth2, Orders v2, webhook verify endpoint, refund) | `payments/gateways/paypal_gateway.py` | `test_gateway_architecture.py` |
| **H-4 Guest checkout** — nullable `Order.user`, guest identity fields, lookup token (hashed), guest cart via `X-Cart-Token`, merge on login, claim on verification/login, guest cancel | `orders/models.py` + migration, `cart/views.py` (`GuestCartPermission`), `orders/views._checkout_guest`, `orders/services.place_order(guest_data=)`, `accounts/services.claim_guest_orders/merge_guest_cart_on_login`, `accounts/serializers.CustomTokenObtainPairSerializer` | `test_guest_checkout.py` (16) |
| **BDT currency** — `DEFAULT_CURRENCY=BDT`, centralized `format_currency()` | `config/settings/base.py`, `apps/common/utils.py` | — |
| **Frontend integration** — storefront payment methods + manual submission + guest checkout + guest tracking; admin methods CRUD + submissions queue + refund | `frontend-store/`, `frontend-admin/` | `tsc --noEmit` + eslint clean on both |

## Remaining DEFERRED (documented decisions)

| Feature | Reason | Audit |
|---------|--------|-------|
| Partial refunds (sum-of-refunds model) | Product decision; full-refund-only enforced with a clear `REFUND_ERROR` | `services.process_refund` |
| Stripe card-element client-side confirmation | Requires Stripe.js + publishable key + a real account; gateway code is complete and returns `client_secret` — the storefront redirects on `redirect_url` and otherwise lands on success | 10-additional-audit-gateways.md |
| Invoice generation / downloadable PDF | Not in the verified audit; no invoice model/endpoint specified | n/a |

## NOTED (known limitations, with rationale)

| Item | Notes |
|------|-------|
| Guest orders are initiated-only (no gateway redirect for guests) | Guests pay via manual submission — deliberate: gateway callbacks need an identity anchor; documented in 11-additional-audit-guest-checkout.md |
| Gateway webhook `payment_intent.succeeded` requires an `INITIATED` Payment row | Created by `initiate_payment`; a webhook arriving before initiate is logged and ignored — the storefront always initiates first |

## Verdict

**No implementation gaps remain in the committed scope.** Every previously
deferred item (H-3 gateways, H-4 guest checkout, frontend wiring) is now
implemented and validated. Remaining deferrals are explicit product/credential
decisions with written audits.
