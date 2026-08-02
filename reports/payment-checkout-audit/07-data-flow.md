# 7. Data flow — the complete checkout flow as it actually works today

## 7.1 Authenticated checkout (the only working path)

```
User logs in (JWT)
   │  POST /accounts/login/  →  access + refresh tokens
   ▼
Add to cart
   │  POST /cart/items/ {variant_id, quantity}
   │  → CartItem created, unit_price_snapshot frozen; stock NOT reserved
   ▼
(optional) Coupon preview
   │  POST /coupons/apply/ {code}   [throttled 20/min]
   │  → stateless discount preview (no state persisted)
   ▼
Checkout step 1 — shipping address (frontend)
   │  Saved address from GET /accounts/addresses/
   │  or new address via POST /accounts/addresses/
   │  address_id carried via React Router navigation state (no server session)
   ▼
Checkout step 2 — review & pay (PaymentPage)
   │  POST /orders/checkout/ {
   │     shipping_address_id, billing_address_id?, coupon_code?, notes?, idempotency_key?
   │  }
   │
   │  place_order() — ONE transaction.atomic():
   │    1. Idempotency: pre-check (user, key); DB unique constraint backstop
   │    2. Lock cart items (select_for_update); EmptyCartError if none
   │    3. Reserve stock per line (reserve_stock; InsufficientStockError → rollback, release partial)
   │    4. Recompute subtotal from live variant.effective_price
   │    5. Lock coupon row; validate limits; compute discount (non-fatal on error)
   │    6. Shipping = flat rate (settings.FLAT_SHIPPING_RATE)
   │       Tax = flat % of (subtotal − discount) (settings.DEFAULT_TAX_RATE_PERCENT)
   │    7. Create Order (status=PENDING_PAYMENT, payment_status=PENDING)
   │       + OrderItems (snapshots) + OrderStatusHistory entry
   │    8. Deactivate cart (items kept for history)
   │    9. Record coupon redemption (F() increment)
   │
   │  After commit (outside transaction):
   │    → send_order_confirmation_email(order)  [sync; failure logged, not fatal]
   ▼
POST /payments/initiate/ {order_number, provider: "MANUAL"}   ← hardcoded MANUAL in storefront
   │  initiate_payment():
   │    • Duplicate guard: order.payment_status==PAID or existing SUCCEEDED payment → 409
   │    • ManualGateway.initiate() — ONE transaction:
   │        Payment(SUCCEEDED, raw_response={"note": "Manual payment…"})
   │        transition_order_status(order, PAID):
   │          → select_for_update on order; validate PAID ∈ allowed
   │          → order.status=PAID, payment_status=PAID
   │          → commit_sale per item: on_hand −= qty, reserved −= qty, StockMovement(SALE)
   │          → OrderStatusHistory(PAID)
   │        (any failure rolls back the Payment row too)
   │  After commit: (no email for PAID; only shipped/delivered get emails)
   ▼
Order confirmed → navigate to /checkout/success/:orderNumber
```

## 7.2 Post-purchase lifecycle (admin-driven)

```
PAID ──► PROCESSING ──► SHIPPED ──► DELIVERED
          (admin)        (email)      (email)
                             │            │
                             ▼            ▼
                        OrderTracker UI   DELIVERED ──► REFUNDED (status flag only, B-5)
                             │
                        Customer cancel (allowed from PENDING_PAYMENT / PAID / PROCESSING)
                             ▼
                        CANCELLED → release_reservation (only touches reserved; B-4)
```

- Transitions happen via `POST /orders/<number>/transition/` (staff), the customer
  cancel endpoint, or Django-admin bulk actions
  (`apps/orders/admin.py:57-75`).
- Every transition writes an `OrderStatusHistory` row
  (`apps/orders/models.py:60-81`).
- Shipped/Delivered send `ORDER_SHIPPED` / `ORDER_DELIVERED` emails
  (`apps/notifications/services.py:139-169`).

## 7.3 Inventory movement ledger (what StockMovement records)

| Event | Movement type | Delta | Ref |
| ----- | ------------- | ----- | --- |
| Checkout reservation | `RESERVATION` | `−qty` (reserved) | order number |
| Payment confirmed | `SALE` | `−qty` (on_hand & reserved) | order number |
| Order cancelled | `RESERVATION_RELEASE` | `+qty` (reserved only) | order number |
| Admin restock | `RESTOCK` | `+qty` (on_hand) | reference |
| Staff adjustment | `ADJUSTMENT` | ±qty | reference |
| Refund restock | `RETURN` | never written | — |

## 7.4 What a guest experiences today (broken)

```
Guest browses products ✓
   ▼
Add to cart → X-Cart-Token header sent, backend requires auth → 401 ✗
   ▼
Checkout → /orders/checkout/ requires auth → 401 ✗
   ▼
Track order → POST /orders/track/ → 404 (no route) ✗
```

## 7.5 Desired flow (spec) vs current

| Spec step | Current state |
| --------- | ------------- |
| Guest adds products | ✗ auth-only |
| Guest/login checkout | ✗ auth-only |
| Address | ✓ (authenticated, saved addresses) |
| Shipping | ✓ flat-rate only |
| Coupon | ✓ preview + locked checkout |
| Payment selection | ✗ hardcoded MANUAL |
| Payment validation | ✗ n/a (MANUAL succeeds instantly) |
| Order creation | ✓ |
| Inventory reservation | ✓ (at checkout) |
| Payment processing | ✗ MANUAL only |
| Confirmation | ✓ page + email |
| Emails | ✓ confirmation/shipped/delivered |
| Notifications | ✓ (in-app Notification exists, not wired to orders) |
| Invoice | ✗ print-only |
| Admin processing → packing → shipping → delivered | ◐ processing/shipped/delivered exist; no packing step |
| Refund | ✗ flag only |
| Archive | ✗ no archive state |
