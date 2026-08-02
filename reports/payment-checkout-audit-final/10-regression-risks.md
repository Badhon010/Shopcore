# Final Audit — 10: Regression Risks

## Mitigated (tested)

| Risk | Mitigation |
|------|-----------|
| Transition-map tightening breaks staff flows | `test_services.py`, `test_admin_views.py`, `test_inventory_rollback.py` pass; `ALLOWED_TRANSITIONS` includes `PROCESSING → REFUNDED` |
| Existing tests assumed cancelling paid orders | None found — all existing cancel tests used unpaid orders |
| `ManualGateway` refactor to `record_successful_payment` changes COD behavior | `test_gateways.py` passes; behavior identical, now deduplicated |
| Guest checkout with nullable `Order.user` breaks registered flows | `test_checkout_address_ownership.py` updated to the new guest semantics; 495 tests pass |
| Provider enum expansion breaks validation | `test_provider_validation.py` updated for gateway reality |
| Frontend stale order status enum (admin) | **Fixed**: `PENDING`/`CONFIRMED` → `PENDING_PAYMENT`/`PAID` in OrdersPage + OrderDetailPage (transitions, badges, filters) |
| Frontend method selection compared number id to string → always COD | **Fixed** (review): numeric comparison + auto-select first method |
| SSLCommerz webhook validation outage silently acknowledged a payment | **Fixed** (review): raises `ValueError` → event log FAILED, gateway retries |
| Currency fallback inconsistency (`USD` vs `BDT` in services) | **Fixed** (review): unified to BDT |
| Receipt upload path change | Preserves extension; `test_customer_submits_with_receipt_upload` passes |
| Ruff auto-fix re-sorting imports | Full suite passes after fix |
| New models without migrations | payments 0003/0004/0005, orders guest migration, cart migration generated + applied; `manage.py check` clean |

## Residual risks (accepted / documented)

| Risk | Notes |
|------|-------|
| Gateway credentials absent in dev | Gateways disabled by default; `GATEWAY_NOT_CONFIGURED` is graceful. Requires real provider accounts to test end-to-end (documented in 10-additional-audit-gateways.md) |
| Stripe client-side card form not built | Storefront handles `redirect_url` and `client_secret`; building the Stripe.js card element is deferred until credentials exist |
| `order_track` throttle scope | Registered in `base.py` + `test.py`; verify production throttle backend at deploy |
| Notification email failure path | Non-fatal (logged); visible in admin queue |
| Full-refund-only policy | Explicit product decision; sum-of-refunds model needed for partials |
| Guest orders have no email-verified identity until claim | By design (audit H-4): lookup is bearer-secret gated; claim requires verified email |
| sessionStorage guest token | Survives reloads, not tabs; acceptable per audit scope |

## Compatibility

- No backend contract was **removed** or renamed — only additions and stricter
  enforcement (cancel policy, full-refund-only) which the old UIs could not
  legally trigger.
- `initiate`, `webhook`, checkout, transition endpoints unchanged in shape.
- Storefront guest-cart enablement (`useCart`) cannot break authenticated flows
  (auth always wins over the header).

## Verdict

**Regression risk is low and covered by 495 passing tests + clean typechecks
and lints on both frontends.** The only behavioral tightenings match the
audit's own C-1/C-2 policy.
