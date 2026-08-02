# 3. Broken features

Present in the codebase but broken end-to-end today.

## B-1. Storefront "Track your order" is a guaranteed 404

The storefront Track Order page (`frontend-store/src/pages/TrackOrderPage.tsx`) posts
to `POST /orders/track/` (`frontend-store/src/services/api/endpoints.ts:44`,
`frontend-store/src/services/api/orders.service.ts:28`). **No such route exists on
the backend** — `apps/orders/urls.py` has no `track` path. Every submission fails
with a network/404 error and the "Order not found" message is shown even for valid
orders.

## B-2. Guest cart token is dead code (frontend only)

`cart.service.ts` stores a localStorage token and sends an `X-Cart-Token` header on
every cart call (`frontend-store/src/services/api/cart.service.ts:27-55`). The
backend cart views require `IsAuthenticated` (`apps/cart/views.py:16-18`) and never
read that header. A guest's "cart" silently returns 401; after login the token is
discarded (`frontend-store/src/contexts/AuthContext.tsx:116-120`). The unique
`(session_key, is_active)` cart constraint (`apps/cart/models.py:15-17`) is
unreachable through the API.

## B-3. Guest checkout is advertised but unusable

`/checkout` and `/checkout/payment` are marked `requiresAuth: false`
(`frontend-store/src/routes/routeConfig.ts:15`), but `CheckoutPage` loads
`useAddresses()`/`useCreateAddress()` and `PaymentPage` calls `POST /orders/checkout/`
— all require authentication. A guest landing on checkout gets 401s. There is no
guest address capture anywhere.

## B-4. Cancelling a PAID order loses stock and issues no refund (data integrity)

- `PAID → CANCELLED` is an allowed transition (`apps/orders/constants.py:25`) and is
  customer-triggerable (`apps/orders/views.py:110-118`, `OrderCancelView`).
- On payment, `commit_sale` already decremented `quantity_on_hand` and
  `quantity_reserved` (`apps/inventory/services.py:124-150`).
- On cancel, `_release_reservations_for_order` runs `release_reservation`
  (`apps/orders/services.py:323, 354-365`), which only touches `quantity_reserved`
  (`apps/inventory/services.py:78-110`). `quantity_on_hand` is **not** restored.
- Net effect: stock is gone from available inventory, no refund is issued, and no
  `RETURN`/`SALE_REVERSAL` movement is written. Only `DELIVERED → REFUNDED` is
  handled by the transition map, and even that doesn't restock.

## B-5. Refund flow is a status flag with no money movement

`DELIVERED → REFUNDED` (`apps/orders/constants.py:28`) just sets
`order.payment_status = REFUNDED` (`apps/orders/services.py:304-305`). No gateway
refund call, no `Payment.status = REFUNDED` update (the `Payment` row stays
`SUCCEEDED`), no refund amount/reason record, no stock restock, no admin UI.

## B-6. `STRIPE` provider returns 400, docs claim it may work

Selecting `STRIPE` in `POST /payments/initiate/` passes serializer validation but
`get_gateway()` raises `ValueError` → `PROVIDER_NOT_AVAILABLE` 400
(`apps/payments/services.py:24-31`, `apps/payments/views.py:44-55`). Tests assert
exactly this (`apps/payments/tests/test_provider_validation.py:57-99`), so it is
"working as designed" but is still a broken promise relative to
`docs/API.md:559` which lists STRIPE as a valid provider.

## B-7. Documentation references to missing files

`docs/PRODUCTION_READINESS_AUDIT_1..4.md` are cited by
`README.md:240`, `CHANGELOG.md:211`, `DEPLOYMENT.md:354,381`, `docs/ARCHITECTURE.md:275`,
and code comments (`apps/cart/views.py:18`, `apps/wishlist/views.py:42`,
`apps/wishlist/services.py:32`). The files are absent from `docs/`. This breaks the
audit trail the codebase claims to have.

## B-8. API docs drift from implementation

- `docs/API.md:465` says `idempotency_key` is "required" for checkout, but the
  serializer makes it optional with `allow_blank=True` (`apps/orders/serializers.py:73`).
- `docs/API.md:493` says cancellation is allowed in "PENDING or AWAITING_PAYMENT",
  but the implementation allows `PENDING_PAYMENT → CANCELLED`, `PAID → CANCELLED`,
  and `PROCESSING → CANCELLED` (`apps/orders/constants.py:24-26`).
- `docs/ARCHITECTURE.md` state diagrams (`:133-148`) use statuses
  (`AWAITING_PAYMENT`, `CONFIRMED`) that do not match the real enum
  (`PENDING_PAYMENT`, `PAID`) (`apps/orders/constants.py:6-13`).

## B-9. Unused frontend endpoint definitions

`frontend-store/src/services/api/endpoints.ts:46` defines
`/orders/{orderNumber}/invoice/` which has no backend route and is not called by any
frontend code (the detail page uses `window.print()` instead). Dead definition that
implies a capability that doesn't exist.

## B-10. Storefront coupon flow can silently diverge from checkout

Coupon preview (`POST /coupons/apply/`) returns a discount that `place_order` can
silently drop: `_place_order_atomic` catches **all** exceptions from
`validate_and_lock_coupon` and proceeds without the coupon
(`apps/orders/services.py:186-193`). So a user can be shown a discounted total on the
cart, then be charged the full amount with no notice if the coupon expired or hit a
limit between preview and checkout. This is a deliberate design choice ("non-fatal"),
but it is a broken UX contract between preview and order.
