# ShopCore Production Readiness Audit

Date: 2026-07-11
Scope: full Django/DRF backend (`apps/*`, `config/*`)
Method: senior-architect review per domain slice (accounts/common, catalog/cart/wishlist/reviews, orders/inventory/coupons, payments/notifications/config)

**Overall verdict: Fail — not production-ready.** Every slice has at least one Critical or High finding involving data integrity, authorization, or concurrency safety. None require a rewrite; all are targeted fixes.

---

## Critical

1. **Cross-user idempotency key leak (Orders).** `place_order` looks up existing orders by `idempotency_key` alone; a reused/guessed key returns another user's order (addresses, totals). Scope the lookup/uniqueness to `(user, idempotency_key)` and verify ownership before returning a cached order.
2. **Race condition in order status transitions corrupts stock (Orders/Inventory).** `transition_order_status` validates state without row locking, then runs inventory side effects after commit. Concurrent `PAID`/`CANCELLED` transitions can both succeed and run conflicting `commit_sale`/`release_reservation`. Lock the order row (`select_for_update`), revalidate inside one atomic block, make inventory effects transactional/idempotent.
3. **Coupon usage-limit bypass under concurrency (Coupons).** Validity is checked, then `times_used` is incremented later as `old + 1` — concurrent checkouts can exceed total/per-user limits. Lock the coupon row, use atomic `F('times_used') + 1`, and enforce limits inside the same transaction as redemption.
4. **Non-atomic manual payment flow creates permanent financial inconsistency (Payments).** `ManualGateway.initiate()` writes `Payment(status=SUCCEEDED)` before the order transition and swallows transition errors — a payment can be marked successful while the order stays unpaid. Wrap payment creation + order transition in one `transaction.atomic()`; roll back or explicitly fail the payment on transition error.
5. **Duplicate/overpayment risk (Payments).** Nothing enforces idempotency or an "already paid" check on `initiate_payment()` — repeated calls can create multiple successful payments for one order. Add a service guard plus a DB-level constraint (e.g. conditional unique constraint) rejecting re-initiation on an already-paid order.

## High

6. **Password reset/registration throttles are bypassable (Accounts).** `RegisterRateThrottle`/`PasswordResetRequestThrottle` inherit `AnonRateThrottle`, which DRF skips for authenticated requests — a logged-in attacker can flood registration/reset traffic. Use `ScopedRateThrottle` (or anon+user combined) with explicit per-scope rates.
7. **No token/session revocation on password change or reset (Accounts).** `ChangePasswordView`/`PasswordResetConfirmView` update the password but never invalidate outstanding JWT refresh tokens, so a stolen token survives a password change. Blacklist/delete outstanding refresh tokens on any password mutation.
8. **Default-address write path can 500 (Accounts).** New/updated addresses are saved with `is_default=True` before unsetting the prior default, risking an `IntegrityError` against the partial unique constraint. Persist as non-default first, then call `set_default_address` inside one transaction (with locking).
9. **Catalog search index updates are race-prone (Catalog).** The signal disconnect/reconnect pattern in `apps/catalog/signals.py` is process-global, so concurrent product saves can skip `search_vector` updates, leaving stale/incorrect search results. Drop the disconnect pattern; use a guarded `update()` or move indexing to a Celery task/DB trigger, keeping it idempotent.
10. **Cart/Wishlist can expose non-published products (Catalog/Cart/Wishlist).** Validation checks `variant.is_active` but never the parent product's publish status; wishlist add uses a plain `Product.objects.get(pk=...)`. Draft/archived items can reach customers. Centralize a visibility/publication check in the selectors/services used by cart and wishlist mutations.
11. **Review creation has a race-to-500 path (Reviews).** The duplicate-review precheck is non-atomic; concurrent submissions can violate the unique constraint and raise an uncaught `IntegrityError`. Wrap creation in a transaction and translate `IntegrityError` into a deterministic 400/409.
12. **Guest cart architecture is inconsistent (Cart).** Services imply guest-cart support, but views inherit global `IsAuthenticated`, so unauthenticated guests can't use the cart, while missing-session-key paths can create stray anonymous carts. Decide the policy explicitly and align permissions + session handling with it.
13. **Wrong warehouse mutated on restock (Inventory).** `RestockView` loads a specific stock item but calls `restock()` without passing its warehouse, so it silently defaults to the default warehouse — a real bug in multi-warehouse setups. Pass `warehouse=stock_item.warehouse` explicitly.
14. **Silent stock underflow (Inventory).** `commit_sale`/`release_reservation` clamp with `max(0, ...)`, masking underflow instead of failing fast. Validate sufficient reserved/on-hand quantity and raise a domain error; alert on mismatch instead of silently clamping.
15. **Unhandled idempotency race can 500 (Orders).** Two concurrent checkouts with the same idempotency key can hit the unique constraint on create with no handling. Catch `IntegrityError`, then fetch and return the existing order for that user/key.
16. **Invalid payment provider hits a 500 (Payments).** `InitiatePaymentSerializer.provider` is unconstrained; an unsupported provider raises a `ValueError` from `get_gateway()` that the view never catches. Use `ChoiceField(PaymentProvider.choices)` and return a structured 400 for unsupported providers.
17. **Notification logging guarantee is broken (Notifications).** `_send_email()` renders templates before entering the `try` block, so template/render errors skip `NotificationLog` creation entirely — violating the stated "always logs" design. Move rendering inside the guarded block and persist a failed log entry in a `finally`/broad-except path.

## Medium

18. **Registration race on duplicate email (Accounts).** Existence is checked, then the user is created — concurrent requests can still collide on the unique constraint. Rely on DB uniqueness and catch `IntegrityError` for a deterministic validation error.
19. **`set_default_address` isn't concurrency-hardened (Accounts).** Concurrent default changes can raise unhandled integrity exceptions. Use `select_for_update()` on the user's address rows with clean error handling.
20. **Request-ID middleware isn't ASGI-safe (Common).** Thread-local request correlation can leak/mis-attribute under async/concurrent execution and is never cleared. Switch to `contextvars` and clear context after each response.
21. **Redundant index on `User.email` (Accounts).** The field is already `unique=True`; the extra index adds write overhead for no benefit. Remove the duplicate index.
22. **N+1s across catalog/cart/wishlist serialization (Catalog/Cart/Wishlist).** Repeated filtered-manager calls (`images.filter(...).first()`, `variants.filter(...)`, `stock_items.exists()/first()`, repeated `obj.items.all()`) and an unused prefetch in the cart view. Use `Prefetch` + annotations (primary image, min price, stock) and serialize from preloaded attributes.
23. **`Category.get_descendants()` is recursive with per-node queries (Catalog).** Large category trees trigger query storms and risk recursion depth issues. Use iterative traversal with bulk fetch, or a materialized-path/tree library.
24. **Wishlist `move_to_cart` isn't atomic (Wishlist).** Add-to-cart and wishlist removal can partially succeed on failure. Wrap in `transaction.atomic()` with normalized exception handling.
25. **Error handling leaks internals in cart/wishlist views (Cart/Wishlist).** Broad `except Exception` returns raw exception text and flattens domain errors into generic 400s. Catch typed domain exceptions and map to stable error codes.
26. **Over-broad exception swallowing in coupon/checkout paths (Orders/Coupons).** Generic `except Exception` turns infrastructure defects into "invalid coupon" business responses. Catch only coupon domain exceptions; let unexpected errors propagate/log as 5xx.
27. **Missing stock-row bootstrap path (Inventory).** `reserve_stock` assumes a stock row exists and can raise an unhandled `DoesNotExist` at checkout. Use `get_or_create_stock_item`, or translate the missing row into `InsufficientStockError`.
28. **Order list payload doesn't scale (Orders).** The list endpoint serializes full items + status history per order. Use a lightweight list serializer and reserve the full graph for the detail endpoint.
29. **Webhook endpoint leaks internal exception text (Payments).** `WebhookView` returns `str(exc)` to callers, exposing internals/integration hints to attackers. Return a generic error message/code; keep details in server logs only.
30. **Missing indexes on Payment/NotificationLog (Payments/Notifications).** No indexes on `Payment.provider`/`status`/`(order, created_at)` or on `NotificationLog.sent_at`/`notification_type`/`status`/`channel`, which will slow reconciliation and admin queries at scale. Add targeted `db_index=True`/`Meta.indexes` and migrate.
31. **Cache-backed sessions are a single point of failure in production (Config).** Base settings force cache-backed sessions; if Redis degrades, auth/session availability degrades system-wide. Prefer `cached_db` in production unless Redis HA is guaranteed.

## Low

32. **Redundant manual index duplicating a unique constraint** — see #21 (Accounts).

---

## Recommended fix order

1. **Data integrity & authorization (do first):** idempotency key scoping (#1), order-transition locking (#2), coupon redemption locking (#3), atomic manual payments (#4), payment idempotency guard (#5).
2. **Auth hardening:** throttle bypass (#6), token revocation on password change (#7).
3. **Correctness bugs with clear repro:** restock warehouse targeting (#13), silent stock underflow (#14), invalid provider 500 (#16), notification logging guarantee (#17), address-default write path (#8).
4. **Concurrency/robustness cleanup:** review creation race (#11), registration race (#18), idempotency IntegrityError handling (#15), address default locking (#19).
5. **Performance & scale:** N+1 fixes (#22), category tree traversal (#23), order list payload (#28), missing indexes (#30).
6. **Defense in depth / polish:** error handling consistency (#25, #26, #29), ASGI-safe request ID (#20), session backend choice (#31), redundant index (#21).

No architectural rewrite is warranted — the app/service/selector layering is sound. The issues are concentrated in transaction boundaries, locking, and a few unenforced invariants (visibility, idempotency scope, throttle inheritance).
