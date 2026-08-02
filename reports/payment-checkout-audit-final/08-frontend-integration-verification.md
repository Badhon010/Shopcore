# Final Audit — 08: Frontend Integration Verification

## Storefront (`frontend-store`)

### Checkout flow
- **CheckoutPage**: authenticated users pick a saved address or create one;
  guests see an inline guest form (identity + address snapshot) → navigates to
  PaymentPage with the guest payload (H-4). A guest cart token is ensured
  before proceeding.
- **PaymentPage**: fetches `GET /payments/methods/` and renders method cards
  (icon, name, description, account info). Manual methods expand with
  instructions + QR code. Flow branches:
  - `MANUAL` (COD) → place order → `POST /payments/initiate/` (MANUAL) → success.
  - `BANK_TRANSFER`/`BKASH`/`NAGAD`/`ROCKET` → place order → inline manual
    submission form (reference number, receipt upload, notes) →
    `POST /payments/submit/` → success with "payment pending verification".
  - `SSLCOMMERZ`/`PAYPAL` → place order → initiate → **redirect** to gateway URL.
  - `STRIPE` → initiate → `client_secret` path (card UI is deferred until
    credentials; storefront handles redirect_url and falls back to success).
- Guest payments attach `phone_number` to the submission (lookup secret).

### Guest support
- `X-Cart-Token` sent automatically by the cart/checkout/payments services.
- Guest order lookup token saved to sessionStorage at checkout and surfaced on
  the success page; TrackOrderPage auto-fills it.
- `useCart` enables for guests with a token; `useAddToCart` ensures a token.
- **AuthContext.login** now sends the guest cart token to the backend so the
  guest cart merges + guest orders claim on login.

### Track order
- TrackOrderPage supports order number + phone, or email + (optional) lookup
  token — matching the new `TrackOrderSerializer` contract.

### OrderSuccessPage
- Shows the one-time guest lookup token and/or the manual-payment pending
  notice based on navigation state (no fake data — real API responses).

## Admin (`frontend-admin`)

### New pages
- **Payment Methods** (`/payments/methods`): list, create, edit, enable/disable,
  delete; shows `is_configured` for gateways; manual methods edit
  instructions/account/QR fields.
- **Payment Submissions** (`/payments/submissions`): pending queue with status +
  order filters, receipt viewer link, approve/reject modal with admin note.
- Nav: Commerce → Payments + Payment Methods entries; routes registered.

### OrderDetailPage
- **Refund button + modal** for paid orders (full-refund with amount display,
  optional reason) wired to `POST /orders/<num>/refund/`.
- **Corrected status enum**: `PENDING_PAYMENT`/`PAID`/`PROCESSING`/… (was
  stale `PENDING`/`CONFIRMED`); transitions + badges + OrdersPage filter
  dropdown updated to the real backend values; REFUNDED payment badge added.

## Wire-up summary (no fake data)

| Screen | Backend endpoint(s) wired |
|--------|---------------------------|
| CheckoutPage guest form | `POST /orders/checkout/` (guest payload via PaymentPage) |
| PaymentPage methods | `GET /payments/methods/` |
| PaymentPage COD / gateway | `POST /payments/initiate/` |
| PaymentPage manual submit | `POST /payments/submit/` (multipart receipt) |
| TrackOrderPage | `POST /orders/track/` |
| Success page states | real order number + lookup token + submission status |
| Admin methods CRUD | `/payments/admin/methods/` |
| Admin submissions queue | `/payments/admin/submissions/` + review |
| Admin refund | `POST /orders/<num>/refund/` |

## Validation

- `tsc --noEmit` clean (store + admin).
- `eslint` clean on all changed/new files (store + admin).
- No `mock`, `fake`, `placeholder`, or `TODO` introduced in the new UI code;
  temporary implementations were replaced with real API calls.

## Post-review fixes incorporated

- **Critical**: `PaymentPage` method selection compared a runtime number id
  against a string (`m.id === String(selectedMethodId)`), so every manual
  method silently fell back to COD. Now compared numerically
  (`Number(m.id) === selectedMethodId`) and the first method is auto-selected
  once loaded.
- `TrackOrderPage` seeds the stored guest token via `setValue` (a raw
  `defaultValue` prop is not picked up by react-hook-form).
- Admin refund shortcut excludes `SHIPPED` (backend requires delivery first).
- Admin method-create hides providers that already exist (unique constraint).
