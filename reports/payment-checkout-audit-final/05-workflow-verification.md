# Final Audit — 05: Workflow Verification

## The order lifecycle (final)

```
PENDING_PAYMENT ──payment confirmed──► PAID ──► PROCESSING ──► SHIPPED ──► DELIVERED ──► (terminal)
      │                                     │            │                            │
      │[cancel, unpaid only]                └──[refund]──┘                            └──[refund]──► REFUNDED
      ▼
  CANCELLED (releases reservation, no restock)
```

## Verification matrix (status → allowed actions)

| Order status | Payment status | Customer cancel | Staff refund | Notes |
|--------------|----------------|-----------------|--------------|-------|
| PENDING_PAYMENT | PENDING / FAILED | ✅ allowed (releases reservation) | ❌ `ORDER_NOT_REFUNDABLE` | — |
| PAID | PAID | ❌ `ORDER_CANCELLATION_NOT_ALLOWED` | ✅ full refund (restock + payment flag) | — |
| PROCESSING | PAID | ❌ | ✅ (map allows REFUNDED) | — |
| SHIPPED | PAID | ❌ | ❌ must deliver first (`ORDER_NOT_REFUNDABLE` with status detail) | — |
| DELIVERED | PAID | ❌ | ✅ (map allows REFUNDED) | — |
| CANCELLED | — | ❌ (terminal) | ❌ | — |
| REFUNDED | REFUNDED | ❌ (terminal) | ❌ `ALREADY_REFUNDED` | — |

## Guest checkout workflow (H-4, verified)

```
Guest browses → add-to-cart (X-Cart-Token generated, Cart.session_key)
  → checkout (inline guest identity + address snapshot, token header)
  → POST /orders/checkout/ → Order(user=NULL, guest_*, lookup_token hashed,
    plain token returned once) → PENDING_PAYMENT
  → payment: manual method → submit reference+receipt (guest secret in body)
  → track: order number + phone  OR  number + email + token
  → cancel: same secret rules
  → register/login later with verified email → claim_guest_orders() attaches
    past guest orders; merge_guest_cart_on_login() merges the cart
```

## Atomicity guarantees

| Operation | Transaction |
|-----------|-------------|
| Checkout (order + items + reservation + coupon) | `place_order` atomic (unchanged) |
| Guest checkout | same atomic path, `guest_data` + snapshot; idempotency scoped to `(guest_session_id, key)` |
| Payment confirmation | `record_successful_payment`: Payment + order→PAID atomic; DB constraint backstops |
| Manual approval | submission lock → `record_successful_payment` atomic |
| Refund | Refund row + Payment→REFUNDED + order→REFUNDED + RETURN restock in one transaction |
| Manual submit dedupe | order-row `select_for_update` — one PENDING per order |
| Webhook events | `PaymentEventLog` unique `(provider, event_id)` — replays short-circuit |
| Restock idempotency | per-reference guard — repeated REFUNDED cannot double-restock |

## Invariants preserved

- An order is paid **exactly once**.
- A paid order is **never** silently cancelled; money exits only via refund.
- Stock is conserved: reserve → commit on payment → restock on refund/cancel.
- Guest orders are **never exposed publicly**: tracking/cancel require the
  bearer secret; mismatches return the same 404 as a missing order.
- Invalid transitions raise typed errors handled by the global exception handler.

## Verdict

**Workflow is consistent end-to-end for registered AND guest orders.** No
state can be reached that violates money- or stock-conservation. Verified by
83 new tests + the existing inventory/order suites.
