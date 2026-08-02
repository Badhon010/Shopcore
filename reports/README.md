# ShopCore — Audit Reports

This folder contains audit reports produced from a full read of the ShopCore
codebase (backend `apps/`, `config/`, `frontend-store/`, `frontend-admin/`,
`docs/`). No code was changed to produce these reports.

## Current report

| Report | Folder |
| ------ | ------ |
| Payment System, Complete Order Workflow & Guest Checkout — Phase 1 Audit | [`payment-checkout-audit/`](payment-checkout-audit/README.md) |

## Report format

Each report follows the same contract:

1. **Executive summary** — verdict per area (production-ready / partial / missing / fake / broken).
2. **Existing features** — what actually works, with file references.
3. **Missing features** — what does not exist yet.
4. **Broken features** — present but does not function end-to-end.
5. **Fake features** — mocked, stubbed, or placeholder.
6. **Duplicate logic** — the same logic implemented in more than one place.
7. **Security issues** — payment, guest, webhook, inventory, order, coupon, price, session, CSRF, permission findings.
8. **Data flow** — the complete checkout flow as it currently works.
9. **API & config inventory** — every endpoint, env var, model, migration, test.
10. **Implementation plan (Phase 2)** — grouped Critical / High / Medium / Low with affected-file estimates.

Nothing in a report should be treated as "already implemented" unless a code
reference is given. References are `path:line` relative to the project root.
