# Additional Audit — Frontend Integration of Phase 2 APIs

**Status:** Backend complete; storefront/admin frontends not yet wired to the
new endpoints (out of scope for the backend phase, documented here).

## New endpoints the frontends should consume

| Endpoint | Backend status | Frontend consumer |
|----------|----------------|-------------------|
| `GET /api/payments/methods/` | ✅ | storefront `PaymentPage` / checkout payment selection |
| `POST /api/payments/submit/` | ✅ | storefront manual payment form (reference + receipt upload) |
| `GET /api/orders/track/` | ✅ | storefront `TrackOrderPage` (currently 404s) |
| `POST /api/orders/<num>/refund/` | ✅ | admin `OrderDetailPage` refund action |
| `GET/POST /api/payments/admin/methods/` | ✅ | admin payments configuration page |
| `GET/POST /api/payments/admin/submissions/` + review | ✅ | admin payment verification queue |

## Confirmed storefront gaps (from audit 03/04)

1. **TrackOrderPage** calls `POST /orders/track/` — backend route now exists and
   matches (`api/orders/track/`). The page's request shape must be updated to
   `{ order_number, email, phone_number }` and to handle the 404-as-unknown
   envelope.
2. **PaymentPage** hardcodes `MANUAL`; it should fetch `GET /payments/methods/`
   and render manual-method instructions/account/QR plus the submission form.
3. **Guest cart** (`X-Cart-Token` in cart.service.ts) has no backend support —
   see additional audit 11 (H-4).

## Confirmed admin gaps

1. **OrderDetailPage** status dropdown uses stale statuses (`CONFIRMED`,
   `PENDING`) that don't match the backend enum (`PENDING_PAYMENT`, `PAID`, …).
   The transition endpoint now returns `INVALID_ORDER_TRANSITION` for illegal
   moves; the UI should offer only legal transitions (see `ALLOWED_TRANSITIONS`).
2. **No refund button** in OrderDetailPage — add one calling the refund
   endpoint, gated to `payment_status == PAID` orders in refundable states.
3. **No payments admin page** — methods CRUD + verification queue + receipt
   viewer need UI (design guide exists in docs/FRONTEND_ADMIN_DESIGN_GUIDE.md).

## Types/services that need updating

| File | Change |
|------|--------|
| `frontend-store/src/types/api.ts` / `models.ts` | Add PaymentMethod, ManualPaymentSubmission, PublicOrder types |
| `frontend-store/src/services/api/payments.service.ts` | Add methods list + submit |
| `frontend-store/src/services/api/orders.service.ts` | Add trackOrder |
| `frontend-admin/src/types/models.ts` | PaymentMethod, Refund, Submission types |
| `frontend-admin/src/services/api/payments.service.ts` | methods CRUD, submissions list/review |
| `frontend-admin/src/services/api/orders.service.ts` | refundOrder |

## Verdict

All new APIs are tested and documented (docs/API.md updated). The frontend
wiring is a discrete follow-up phase — the storefront Track Order page, manual
payment submission, and the admin payment/refund UI. No backend work is blocked
by this.
