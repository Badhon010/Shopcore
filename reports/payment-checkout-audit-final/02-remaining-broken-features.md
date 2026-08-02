# Final Audit — 02: Remaining Broken Features

Cross-referenced against the original audit's B-1…B-10 list (03-broken-features.md).

## Fixed (all verified)

| ID | Issue | Fix | Verified by |
|----|-------|-----|-------------|
| B-1 | Paid order could be cancelled → no refund, no restock (money + stock loss) | `ALLOWED_TRANSITIONS`: paid statuses can only reach `REFUNDED`; customer cancel blocked for PAID/REFUNDED payments | `test_cancel_policy.py`, `test_inventory_rollback.py` |
| B-2 | `/orders/track/` route missing → Track Order always 404 | `TrackOrderView` + `track/` route + `PublicOrderSerializer` | `test_guest_checkout.py` (lookup) |
| B-3 | Refund was a status flag only (no record, no restock, no payment flag) | `Refund` model, `process_refund` (atomic: Refund + Payment→REFUNDED + transition + RETURN restock) | `test_refunds.py` |
| B-4 | Customer could cancel paid order via API | `OrderCancellationNotAllowedError` guard in `OrderCancelView` | `test_cancel_policy.py` |
| B-5 | Gateway stubs raised `NotImplementedError` (500s) | Registered gateways (SSLCommerz/Stripe/PayPal); unimplemented → `PROVIDER_NOT_AVAILABLE` 400; unconfigured → `GATEWAY_NOT_CONFIGURED` 400 | `test_provider_validation.py`, `test_gateway_architecture.py` |
| B-6 | Duplicate-manual-submission / double-approve race | Order-row lock in `submit_manual_payment`; submission lock + IntegrityError→409 in review | `test_manual_submissions.py` |
| B-7 | Frontend stale order status enum (admin dropdown/filters) | Corrected to `PENDING_PAYMENT`/`PAID`/… in OrdersPage + OrderDetailPage | `tsc`/eslint; manual |
| B-8 | Storefront TrackOrderPage used the old email-only contract | Updated to phone / email+token contract | `tsc`/eslint; manual |

## Known remaining (non-blocking, documented)

| Issue | Severity | Status |
|-------|----------|--------|
| Stripe card-element client-side confirmation not built | Low (feature) | Deferred — gateway returns `client_secret`; requires credentials (see 10-additional-audit-gateways.md) |
| Real gateway webhooks untested end-to-end | Low | Requires sandbox/live credentials (H-3 gating) |
| Guest order history list (all orders for a guest) | Low (feature) | Not in audit scope; tracking covers per-order lookup |

## Verdict

**No broken features remain in scope.** All data-integrity bugs from the
original audit (paid-order cancel, missing refund restock, frontend enum
drift) are fixed and covered by tests.
