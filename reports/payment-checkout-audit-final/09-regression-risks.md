# Final Audit — 09: Regression Risks

## Mitigated (tested)

| Risk | Mitigation |
|------|-----------|
| Transition-map tightening breaks staff flows | `test_services.py`, `test_admin_views.py`, `test_inventory_rollback.py` still pass; `ALLOWED_TRANSITIONS` includes `PROCESSING → REFUNDED` so refunds work from the most common state |
| Existing tests assumed cancelling paid orders | None found — all existing cancel tests used unpaid orders (verified before editing) |
| `ManualGateway` refactor to `record_successful_payment` changes COD behavior | `test_gateways.py` passes; behavior identical (SUCCEEDED payment + PAID transition), now deduplicated |
| Receipt upload path change | Fixed to preserve extension; `test_customer_submits_with_receipt_upload` passes |
| Provider enum expansion breaks validation | `test_provider_validation.py` updated to use a truly-unknown provider string |
| Ruff auto-fix re-sorting imports breaks function-local imports | Full suite passes after fix |
| New models without migrations | 0003/0004 generated, applied, `manage.py check` clean |

## Residual risks (accepted / documented)

| Risk | Notes |
|------|-------|
| Frontend stale status enums (admin dropdown) | Pre-existing drift; flagged in 12-additional-audit-frontend-integration.md. Backend now rejects illegal transitions with clear errors, so a wrong UI action cannot corrupt state |
| `order_track` throttle scope | Registered in `base.py` + `test.py`; verify production throttle DB/backend is configured when deployed |
| Notification email failure path | Deliberately non-fatal (logged); admins may miss a submission email if mail backend fails — visible in the admin queue |
| Full-refund-only policy | Explicit product decision; a future sum-of-refunds model is required for partial refunds |
| Real gateway integration | Entirely gated on H-3 (credentials + pattern); no code to regress |

## Compatibility

- Storefront & admin frontends: no backend contract was **removed** or
  renamed; only additions (track, refund, methods, submissions) and stricter
  enforcement of the cancel policy (which the old UI could not legally invoke
  on paid orders anyway).
- API compatibility: `initiate`, `webhook`, checkout, transition endpoints
  unchanged in shape.

## Verdict

**Regression risk is low and covered by 458 passing tests.** The only
behavioral tightening (no cancelling paid orders, full-refund-only) matches
the audit's own C-1/C-2 policy and cannot be triggered by the current
frontends in a way that corrupts data.
