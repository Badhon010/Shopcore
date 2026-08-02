# 1. Existing features (verified working)

Everything below exists and is wired end-to-end. References are `path:line`.

## Authentication

- JWT login/refresh/logout with `simplejwt`, refresh-token rotation and blacklisting
  (`config/settings/base.py:157-175`).
- Login is blocked until email verification:
  `CustomTokenObtainPairSerializer` returns `EMAIL_NOT_VERIFIED`
  (`apps/accounts/serializers.py:14-29`).
- Registration, email verification, resend-verification, password reset/change.
  Password change and password reset revoke all outstanding refresh tokens
  (`apps/accounts/services.py:96-129`, `apps/accounts/views.py:183-208`).
- Rate limiting on login (5/min), register (10/hr), password-reset request (5/hr),
  resend-verification (5/hr), coupon apply (20/min)
  (`apps/common/throttling.py`, `config/settings/base.py:140-146`).
- Password validators incl. a custom letter-and-digit validator
  (`apps/accounts/validators.py:29`, `config/settings/base.py:86-101`).
- Admin endpoints gated by `IsStaffUser` / `IsAdminUser`
  (`apps/common/permissions.py:38-45`).

## Cart (authenticated only)

- `Cart` / `CartItem` models with `unit_price_snapshot`
  (`apps/cart/models.py`). Stock is explicitly NOT reserved at add-to-cart
  (`apps/cart/models.py:9-12`).
- Full CRUD API: get cart, add item, update quantity, remove item, clear
  (`apps/cart/views.py:20-79`).
- Concurrency-safe add: cart-row lock + `F()` quantity increment
  (`apps/cart/services.py:66-96`).
- Guest cart *service* layer exists (`session_key` support, `merge_guest_cart_into_user_cart`
  at `apps/cart/services.py:150-185`) but is **not reachable from the API**
  (see §2 and §3).

## Coupons

- `Coupon` + `CouponRedemption` models (`apps/coupons/models.py`), percentage/fixed,
  min order, max discount cap, validity window, per-total and per-user limits,
  category applicability.
- Stateless preview endpoint `POST /coupons/apply/` (throttled)
  (`apps/coupons/views.py:16-47`).
- **Locked** validation for checkout: `validate_and_lock_coupon()` holds the coupon
  row with `select_for_update()` for the whole order transaction, so concurrent
  checkouts cannot jointly exceed limits (`apps/coupons/services.py:74-121`).
- Redemption recording uses an atomic `F()` increment inside the same transaction
  (`apps/coupons/services.py:123-137`).

## Inventory / stock movement

- `Warehouse` / `StockItem` / `StockMovement` (append-only audit log)
  (`apps/inventory/models.py`). Available stock = `on_hand − reserved`
  (`apps/inventory/models.py:65`).
- All stock mutations go through one service module with the same pattern:
  `transaction.atomic()` → `select_for_update()` → validate → mutate → write
  `StockMovement` (`apps/inventory/services.py:1-8`).
- `reserve_stock` (checkout), `release_reservation` (cancel), `commit_sale`
  (payment confirmation), `restock` (admin). Each has a **per-reference idempotency
  guard** against duplicate application (`apps/inventory/services.py:88-110, 124-150`).
- Staff stock adjustment with negative-stock and below-reserved guards
  (`apps/inventory/views.py:139-216`).

## Orders

- `Order` / `OrderItem` / `OrderStatusHistory` models with frozen financial and
  address snapshots (`apps/orders/models.py`).
- **Checkout** `POST /orders/checkout/` (`apps/orders/views.py:43`) →
  `place_order()` (`apps/orders/services.py:41-135`), all inside one atomic
  transaction (`apps/orders/services.py:169-262`):
  1. idempotency-key check scoped to `(user, key)` + DB unique constraint
     (`apps/orders/models.py:70-78`);
  2. cart items locked (`select_for_update`);
  3. stock reserved with rollback of already-reserved lines on failure
     (`apps/orders/services.py:145-164`);
  4. server-side price recomputation from live `variant.effective_price`
     (client never controls amounts);
  5. locked coupon validation;
  6. pluggable flat-rate shipping / flat-% tax calculators
     (`apps/orders/services.py:29-39`);
  7. Order + OrderItems created with snapshots; cart deactivated; coupon
     redemption recorded; confirmation email sent outside the transaction.
- **Status transitions** `transition_order_status()` with:
  - `select_for_update` re-read so concurrent transitions serialize
    (`apps/orders/services.py:293`);
  - `ALLOWED_TRANSITIONS` map (`apps/orders/constants.py:23-31`);
  - inventory side effects in the **same** transaction: `PAID → commit_sale`,
    `CANCELLED → release_reservation` (`apps/orders/services.py:315-324`);
  - append-only `OrderStatusHistory` entries;
  - shipped/delivered email notifications sent outside the transaction.
- Customer order list / detail / cancel (`apps/orders/views.py:28-118`).
- Staff endpoints: admin list with search + status + payment_status + date filters
  (`apps/orders/views.py:144-198`), admin detail, stats
  (`apps/orders/views.py:202-260`), transition endpoint (`apps/orders/views.py:126-139`).
- Django-admin order management with inline items/history and bulk shipped/delivered
  actions (`apps/orders/admin.py`).

## Payments (the part that exists)

- `Payment` model — gateway-agnostic with `raw_response` audit JSON and a
  **DB-level unique constraint on one SUCCEEDED payment per order**
  (`apps/payments/models.py:31-42`).
- Gateway abstraction: `PaymentGateway` ABC + `PaymentIntent` dataclass
  (`apps/payments/gateways/base.py`).
- `ManualGateway` — the only wired gateway; creates `Payment(SUCCEEDED)` and
  transitions the order to `PAID` in **one** atomic block (rolls back together)
  (`apps/payments/gateways/manual.py:25-55`).
- `initiate_payment()` with an application-layer duplicate-payment guard
  (`apps/payments/services.py:32-70`), plus the DB backstop
  (`apps/payments/views.py:55-70`).
- `POST /payments/initiate/` (`apps/payments/views.py:13-73`) and
  `POST /payments/webhook/<provider>/` (`apps/payments/views.py:76-107`) with a
  signature-verification hook (`raw_body` captured before DRF parses the stream).
- Read-only `PaymentAdmin` in Django admin (`apps/payments/admin.py`).

## Notifications & email

- In-app `Notification` model + API (list/read/delete/clear/unread-count)
  (`apps/notifications/views.py`, `urls.py`).
- `NotificationLog` — every email attempt logged as SENT/FAILED, failures never
  propagate to callers (`apps/notifications/services.py:49-101`).
- Templates for welcome, email verification, password reset, order confirmation,
  shipped, delivered, newsletter, contact (`templates/emails/`).
- Order confirmation email includes itemized totals and shipping snapshot
  (`templates/emails/order_confirmation.html`).

## Admin dashboard / analytics / search / exports

- Dashboard overview + analytics endpoints including a payment-status breakdown
  (`apps/dashboard/views.py:411-413`).
- Staff global search across products/categories/brands/**orders**/customers/
  reviews/subscribers (`apps/search/views.py`).
- CSV/XLSX exports for products, **orders**, customers, subscribers, reviews,
  inventory (`apps/exports/views.py`).

## Frontends

- **Storefront:** cart page/drawer, checkout step 1 (address) + step 2 (review &
  pay), success/failure pages, order history/detail, Track Order page, wishlist,
  notifications, coupons input — all wired to the real endpoints where those
  endpoints exist (see §2/§3 for the exceptions).
- **Admin panel:** Orders page (search + status/payment filters + date range) and
  Order detail with status transitions and cancel (`frontend-admin/src/pages/orders/`),
  dashboard/analytics, exports page, customers, coupons, inventory, reviews.

## Tests (existing)

See [`08-api-config-inventory.md`](08-api-config-inventory.md) §Tests for the full
list. Notable: race-condition tests for concurrent idempotent checkouts, duplicate
webhook deliveries, coupon-limit races, inventory rollback on failure, payment
duplicate guards, and checkout address-ownership enforcement
(`apps/orders/tests/test_services.py:157`, `apps/inventory/tests/test_services.py:82`,
`apps/coupons/tests/test_services.py:101`, `apps/orders/tests/test_inventory_rollback.py`,
`apps/payments/tests/test_gateways.py:18`, `apps/orders/tests/test_checkout_address_ownership.py`).
