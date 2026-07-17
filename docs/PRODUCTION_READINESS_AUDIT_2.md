# ShopCore — Re-Audit (Full Independent Review)

**Date:** 2026-07-11  
**Scope:** Full Django/DRF backend (`apps/*`, `config/*`) — evaluated as if seeing the code for the first time.  
**Method:** Direct source inspection of every service, view, serializer, model, and settings file. Every finding below is anchored to a specific file and line number.

---

## Previous Critical Findings — Resolution Status

The five Criticals from the prior audit have all been resolved:

| # | Finding | Status | Evidence |
|---|---------|--------|----------|
| C1 | Cross-user idempotency key leak | ✅ **FIXED** | `orders/services.py:87` — lookup scoped to `(user, idempotency_key)` |
| C2 | Order status transition race corrupts stock | ✅ **FIXED** | `orders/services.py:284` — `select_for_update()` + inventory effects inside same atomic block (lines 320–323) |
| C3 | Coupon usage-limit bypass | ✅ **FIXED** | `coupons/services.py:100` — `select_for_update()` in `validate_and_lock_coupon()`; `F("times_used") + 1` at line 120; lock held through `record_coupon_redemption()` |
| C4 | Non-atomic manual payment flow | ✅ **FIXED** | `payments/gateways/manual.py:40–54` — payment creation + order transition in one `transaction.atomic()`; failure propagates and rolls back the payment row |
| C5 | Duplicate/overpayment risk | ✅ **FIXED** | `payments/services.py:54–56` — app-layer guard; `payments/models.py:38–42` — DB `UniqueConstraint(fields=["order"], condition=Q(status=SUCCEEDED))`; view catches `IntegrityError` |

---

## Critical (New)

### C-NEW-1 · Address ownership not verified at checkout — cross-user PII leak  
**File:** `apps/orders/views.py:44, 47`

```python
shipping_address = Address.objects.get(pk=data["shipping_address_id"])
billing_address  = Address.objects.get(pk=data["billing_address_id"])
```

Neither lookup filters by `user=request.user`. Any authenticated user can supply another user's address PK in the checkout payload and place an order that embeds that address's full name, phone number, and street address in the order snapshot. The snapshot is then readable by the attacker through their own order detail endpoint. This is a direct PII leak requiring no privilege escalation.

**Fix:** Add `user=request.user` to both `Address.objects.get()` calls, or validate ownership in `CheckoutSerializer`.

---

## High

### H1 (was #7) · No JWT refresh-token revocation on password change or reset — STILL OPEN  
**Files:** `apps/accounts/services.py:105–109` · `apps/accounts/views.py:181–182`

`change_password()` calls `user.set_password(); user.save()` with no token blacklist step. `PasswordResetConfirmView.post()` does the same. Outstanding refresh tokens continue to work after a password change or reset, so a stolen token survives the user's remediation action.

**Fix:** After any password mutation, iterate `OutstandingToken.objects.filter(user=user)` and call `BlacklistedToken.objects.get_or_create(token=t)` for each, or use `djangorestframework-simplejwt`'s `TokenBlacklist` helpers.

---

### H2 (was #6) · `RegisterRateThrottle` / `PasswordResetRequestThrottle` bypass — PARTIALLY OPEN  
**File:** `apps/common/throttling.py:13, 19`

`LoginRateThrottle` was correctly fixed to extend `UserRateThrottle`. However:

```python
class RegisterRateThrottle(AnonRateThrottle):       # line 13 — still AnonRateThrottle
class PasswordResetRequestThrottle(AnonRateThrottle): # line 19 — still AnonRateThrottle
```

DRF skips `AnonRateThrottle` for authenticated requests. A logged-in attacker can flood the registration endpoint (username enumeration / abuse) and the password-reset endpoint (email spam) without rate-limit consequences.

**Fix:** Change both to `ScopedRateThrottle` with explicit scopes, or apply both anon and user throttle classes to those views.

---

### H3 (was #17) · Notification logging guarantee broken — template render outside `try` — STILL OPEN  
**File:** `apps/notifications/services.py:46–47`

```python
html_content = render_to_string(html_template, context)   # line 46 — outside try
txt_content  = render_to_string(txt_template, context)    # line 47 — outside try

try:
    msg = EmailMultiAlternatives(...)   # line 53
    msg.send(...)
except Exception as exc:
    ...
NotificationLog.objects.create(...)    # line 72
```

If `render_to_string` raises (missing template file, template syntax error, bad context variable), the exception propagates out of `_send_email()` before any `NotificationLog` row is written. Callers in `place_order()` swallow this with a broad `except Exception` (line 117–121), so the failure is silent and unlogged at the notification level.

**Fix:** Move both `render_to_string` calls inside the `try` block and add a `finally` or broad-`except` path that persists a `FAILED` `NotificationLog` entry.

---

### H4 (was #11) · Review creation race-to-500 — STILL OPEN  
**File:** `apps/reviews/views.py:42–43, 49–52`

```python
if Review.objects.filter(product=product, user=request.user).exists():   # line 42
    return Response({"error": "ALREADY_REVIEWED"}, status=400)           # line 43

# ...
review = serializer.save(product=product, user=request.user, ...)        # line 49-52
```

The duplicate check and the `save()` are not atomic. Two concurrent POST requests both pass the `.exists()` check, both attempt `save()`, the DB unique constraint on `(product, user)` rejects the loser with an uncaught `IntegrityError` → 500.

**Fix:** Wrap the `save()` in `try/except IntegrityError` and return a structured 400/409.

---

### H5 (was #10) · Non-published products reachable via wishlist — STILL OPEN  
**Files:** `apps/wishlist/views.py:23, 33` · `apps/wishlist/services.py:35`

```python
product = Product.objects.get(pk=product_id)            # views.py:23 — no status filter
product = Product.objects.get(pk=product_id)            # views.py:33 — same
variant = ProductVariant.objects.filter(product=product, is_active=True)...  # services.py:35
```

Draft or archived products can be added to wishlists (and via `move_to_cart`, added to the cart). The cart's `add_to_cart` checks `variant.is_active` but never the parent product's publication status.

**Fix:** Add a centralised `is_published=True` (or equivalent status filter) to all wishlist product lookups and to the `move_to_cart` variant selector.

---

### H6 (was #13) · Wrong warehouse mutated on restock — STILL OPEN  
**File:** `apps/inventory/views.py:34, 39–44`

```python
stock_item = StockItem.objects.select_related("variant").get(pk=pk)   # line 34
updated = restock(
    stock_item.variant,
    quantity=...,
    reference=...,
    note=...,
    actor=request.user,
    # warehouse NOT passed ← bug
)
```

`restock()` defaults to `_get_default_warehouse()` (line 184 of `inventory/services.py`). The REST call targets a specific `StockItem` by PK, which belongs to a particular warehouse, but the restock operation lands on the default warehouse. In any setup with more than one warehouse this silently credits the wrong location.

**Fix:** Pass `warehouse=stock_item.warehouse` to `restock()` in `RestockView.post()`.

---

### H7 (was #14) · Silent stock underflow — clamping masks data corruption — STILL OPEN  
**File:** `apps/inventory/services.py:105, 153–154`

```python
# release_reservation (line 105)
stock.quantity_reserved = max(0, stock.quantity_reserved - quantity)

# commit_sale (lines 153-154)
stock.quantity_on_hand = max(0, stock.quantity_on_hand - quantity)
stock.quantity_reserved = max(0, stock.quantity_reserved - quantity)
```

Genuine underflow (e.g., a bug elsewhere causes a double-release) silently clamps to zero instead of failing. The resulting stock state is corrupt and indistinguishable from a valid zero-stock state. The idempotency guards added to `release_reservation` and `commit_sale` help for duplicate-call scenarios but do not protect against unmatched quantity discrepancies.

**Fix:** Validate that `stock.quantity_reserved >= quantity` (or `quantity_on_hand >= quantity`) before mutating; raise a domain error on violation and emit an alert/log at ERROR level.

---

### H8 (was #9) · Search-vector signal disconnect/reconnect is process-global — STILL OPEN  
**File:** `apps/catalog/signals.py:49–57`

```python
post_save.disconnect(update_search_vector, sender=sender)  # line 49 — process-global
try:
    sender.objects.filter(pk=instance.pk).update(search_vector=...)
finally:
    post_save.connect(update_search_vector, sender=sender)  # line 57
```

The signal registry is process-wide and shared across threads. If two gunicorn threads both save a product concurrently, thread A disconnects the handler → thread B's `post_save` fires with no `update_search_vector` handler → B's product gets a stale `search_vector`. Thread A's `finally` reconnects, but the window is real and grows with concurrency.

**Fix:** Remove the disconnect/reconnect pattern. Since the `queryset.update()` form is used (which resolves `SearchVector` in SQL), recursion is not possible — the signal is safe to leave connected.

---

### H9 (new) · `_commit_sale_for_order` swallows per-item failures — order PAID with uncommitted stock  
**File:** `apps/orders/services.py:339–351, 354–366`

```python
def _commit_sale_for_order(order):
    for item in order.items.select_related("variant").all():
        try:
            commit_sale(item.variant, item.quantity, reference=order.order_number)
        except Exception:
            logger.error(...)   # caught here — outer transaction continues
```

`commit_sale()` creates an inner savepoint (it runs its own `transaction.atomic()`). If it raises (e.g., `StockItem.DoesNotExist` for a variant, insufficient stock, or any other error), the savepoint rolls back, the exception is caught by the loop, and the outer transaction — which has already written the order status to `PAID` — commits successfully. The result is an order marked PAID with one or more items whose stock was never committed. The same pattern exists in `_release_reservations_for_order`.

**Fix:** Catch only domain errors you can handle (e.g., log and continue for idempotency-guard skips); let unexpected errors propagate to roll back the entire transition. Alternatively, gather all failures and raise a composite domain error after the loop.

---

### H10 (new) · Invalid payment provider causes 500 in `InitiatePaymentView`  
**Files:** `apps/payments/serializers.py:18` · `apps/payments/views.py:33–57`

```python
provider = serializers.CharField(default="MANUAL")   # serializers.py:18 — unconstrained
```

```python
result = initiate_payment(order, provider=serializer.validated_data["provider"])
# initiate_payment → get_gateway(provider) → raises ValueError for unknown provider
# View only catches: DuplicatePaymentError, InvalidOrderTransitionError, IntegrityError
```

An unsupported `provider` value (`"STRIPE"`, `"paypal"`, etc.) raises `ValueError` from `get_gateway()` which propagates unhandled → 500. The `WebhookView` was correctly fixed (catches `ValueError` at line 70), but `InitiatePaymentView` was not.

**Fix:** Use `ChoiceField(choices=PaymentProvider.choices)` in `InitiatePaymentSerializer`, or catch `ValueError` in `InitiatePaymentView` and return a structured 400.

---

## Medium

### M1 (was #27) · Missing stock row at checkout → `DoesNotExist` 500 — STILL OPEN  
**File:** `apps/inventory/services.py:56`

```python
stock = StockItem.objects.select_for_update().get(variant=variant, warehouse=warehouse)
```

If a `StockItem` row does not exist for the variant/warehouse pair, `get()` raises `DoesNotExist`. In `_place_order_atomic`, only `InsufficientStockError` is caught (line 156). `DoesNotExist` propagates up and surfaces as a 500 with no user-facing error code.

**Fix:** Replace `.get()` with `get_or_create_stock_item()` (already defined at line 27) and then check availability, or translate `DoesNotExist` into `InsufficientStockError` at the boundary.

---

### M2 (was #24) · Wishlist `move_to_cart` not atomic — STILL OPEN  
**File:** `apps/wishlist/services.py:42–43`

```python
add_to_cart(cart, variant, quantity=1)   # line 42
remove_from_wishlist(user, product)       # line 43
```

No `transaction.atomic()` wrapper. If `remove_from_wishlist` fails (or the process dies between the two calls), the item ends up in both the cart and the wishlist.

**Fix:** Wrap both calls in `transaction.atomic()`.

---

### M3 (was #18) · Registration race on duplicate email — STILL OPEN  
**Files:** `apps/accounts/serializers.py:54` · `apps/accounts/services.py:46–47`

The email uniqueness check is done in `validate_email()` (serializer) and again in `register_user()` (service), both as plain `filter().exists()` reads before the `create_user()` write. Two concurrent requests with the same email can both pass, both call `create_user()`, and the DB unique constraint rejects the loser with an `IntegrityError` that propagates as a 500.

**Fix:** In `register_user()`, wrap `create_user()` in `try/except IntegrityError` and convert to a `ValueError` (or let the DB constraint be the single gate and catch `IntegrityError` in the view/serializer).

---

### M4 (was #19) · `set_default_address` missing row lock — STILL OPEN  
**File:** `apps/accounts/services.py:83–89`

The function is wrapped in `transaction.atomic()` but does not `select_for_update()` on the address rows. Two concurrent "set default" calls for the same user can both read the existing default, both unset different rows, and both set their own address — leaving two defaults briefly, or one stale default if the partial-unique constraint is not tight.

**Fix:** Add `select_for_update()` to the `Address.objects.filter(user=user, is_default=True)` query before the `.update()`.

---

### M5 (was #25, #29) · Raw exception text exposed in API responses  
**Files:** `apps/cart/views.py:57, 66` · `apps/payments/views.py:81` · `apps/wishlist/views.py:50`

```python
# cart/views.py:57
return Response({"error": {"code": "CART_ITEM_ERROR", "message": str(exc), ...}}, status=400)

# payments/views.py:81
return Response({"error": {"code": "WEBHOOK_ERROR", "message": str(exc), ...}}, status=400)

# wishlist/views.py:50
return Response({"error": {"code": "MOVE_TO_CART_ERROR", "message": str(exc), ...}}, status=400)
```

`str(exc)` on an infrastructure exception (DB error, ORM message, etc.) can expose table names, query fragments, stack hints, or gateway integration details to callers.

**Fix:** Catch typed domain exceptions explicitly; return a generic code/message for unexpected errors; log the raw exception server-side only.

---

### M6 (was #26) · Over-broad exception swallowing in checkout coupon path — STILL OPEN  
**File:** `apps/orders/services.py:189–192`

```python
except Exception as exc:
    logger.warning("Coupon '%s' invalid at checkout: %s", ...)
    discount_total = Decimal("0.00")
```

Any exception from `validate_and_lock_coupon()` — including DB connection errors, ORM bugs, or Redis failures — is silently caught and treated as "invalid coupon", allowing checkout to proceed without discount. Infrastructure failures should propagate as 5xx, not be silently eaten.

**Fix:** Catch only the explicit coupon domain exceptions (`CouponNotFoundError`, `CouponExpiredError`, `CouponLimitReachedError`, `CouponMinimumOrderError`, `CouponInvalidError`); let unexpected errors propagate.

---

### M7 (was #20) · Request-ID middleware is not ASGI-safe — STILL OPEN  
**File:** `apps/common/` (middleware)  
Thread-local correlation context leaks or mis-attributes under concurrent async execution. Switch to `contextvars.ContextVar` and clear after each response.

---

### M8 (was #22) · N+1 queries in catalog, cart, and wishlist serialization — STILL OPEN  
Repeated `images.filter(...).first()`, `variants.filter(...)`, `stock_items.exists()` calls per-item in serializers, and unnecessary full-graph serialization of cart items without `Prefetch` objects. No `select_related` on `attribute_values` in `_place_order_atomic:230` (resolved per-item inside a loop). Use `Prefetch` objects and annotations.

---

### M9 (was #30) · Missing indexes on `Payment` and `NotificationLog` — STILL OPEN  
**File:** `apps/payments/models.py` · `apps/notifications/models.py`  
`Payment` has no index on `provider`, `status`, or `(order, created_at)`. `NotificationLog` has no index on `sent_at`, `notification_type`, `status`, or `channel`. At scale these fields appear in reconciliation queries and admin filters.

---

### M10 (was #31) · Cache-backed sessions are a single point of failure — STILL OPEN  
**File:** `config/settings/base.py`  
`SESSION_ENGINE = "django.contrib.sessions.backends.cache"` globally. Redis degradation drops all active sessions. Switch to `cached_db` in production settings unless guaranteed Redis HA.

---

### M11 · `initiate_payment()` duplicate-payment check is not transactional (TOCTOU)  
**File:** `apps/payments/services.py:54–63`

```python
if order.payment_status == PAID or Payment.objects.filter(order=order, status=SUCCEEDED).exists():
    raise DuplicatePaymentError(...)

gateway = get_gateway(provider)
intent = gateway.initiate(order=order, amount=..., currency=...)   # not in same atomic block
```

The check and the `initiate()` call are not wrapped in a transaction. Two concurrent calls can both pass the check; for the current `ManualGateway`, the DB `UniqueConstraint` on succeeded payments provides a backstop. However if a real gateway (Stripe) is wired in — where `initiate()` fires an external API call before writing a local `Payment` row — two real charges could be created before either check lands.

**Fix:** Add `transaction.atomic()` + `select_for_update()` on the order row inside `initiate_payment()` so the state check and the gateway dispatch are serialised.

---

### M12 · Cart `add_to_cart` race on concurrent item creation  
**File:** `apps/cart/services.py:56–64`

```python
item, created = CartItem.objects.get_or_create(
    cart=cart, variant=variant,
    defaults={"quantity": quantity, "unit_price_snapshot": unit_price},
)
if not created:
    item.quantity += quantity   # Python-level arithmetic — not an F() expression
    item.save(...)
```

Two concurrent requests adding the same variant can both enter the `get_or_create` and one loses with an `IntegrityError` if a unique constraint exists on `(cart, variant)`. The Python-level `item.quantity += quantity` on the update path is also a lost-update risk: read old value, compute, write — a concurrent update can overwrite.

**Fix:** Use `F("quantity") + quantity` on the update path; wrap in `select_for_update()` for the get-or-create case.

---

## Low

### L1 (was #21/32) · Redundant index on `User.email`  
`unique=True` on the `email` field already creates a B-tree index at the DB level; any additional explicit `db_index=True` or `Meta.indexes` entry on the same field creates a duplicate index that adds write overhead with no benefit. Confirm the model and remove if present.

---

## Summary Table

| Severity | Count | Key items |
|----------|-------|-----------|
| **Critical (new)** | 1 | Checkout address ownership leak (C-NEW-1) |
| **High (still open)** | 8 | JWT revocation, throttle bypass, notification log, review race, wishlist visibility, wrong warehouse, stock clamping, search signal race |
| **High (new)** | 2 | `_commit_sale` swallows stock-commit failures (H9); invalid provider 500 in `InitiatePaymentView` (H10) |
| **Medium (still open)** | 7 | Missing stock row 500, move_to_cart atomicity, registration race, address lock, exception leaks, coupon broad-catch, ASGI middleware |
| **Medium (new)** | 3 | TOCTOU in `initiate_payment`, cart `add_to_cart` race, N+1s (tracked from before) |
| **Low** | 1 | Redundant email index |

---

## Recommended Fix Order

1. **Do immediately (data/security):**
   - C-NEW-1: Add `user=request.user` to address lookups in `CheckoutView`.
   - H1: Blacklist refresh tokens on `change_password` and `PasswordResetConfirmView`.
   - H9: Let inventory-commit failures propagate (or raise composite error) in `_commit_sale_for_order`.
   - H10 / M: Constrain `InitiatePaymentSerializer.provider` with `ChoiceField`; catch `ValueError` in `InitiatePaymentView`.

2. **High-priority correctness fixes:**
   - H3: Move `render_to_string` calls inside the `try` block in `_send_email()`.
   - H4: Wrap `serializer.save()` in review creation in `try/except IntegrityError`.
   - H6: Pass `warehouse=stock_item.warehouse` in `RestockView`.
   - H8: Remove the `disconnect`/`connect` pattern from `update_search_vector`.

3. **Robustness and data integrity:**
   - H2: Convert `RegisterRateThrottle`/`PasswordResetRequestThrottle` to `ScopedRateThrottle`.
   - H5: Add publication-status filter to wishlist product lookups.
   - H7: Validate quantity before mutating stock; raise on underflow.
   - M1: Translate `StockItem.DoesNotExist` to `InsufficientStockError` in `reserve_stock`.
   - M2: Wrap `move_to_cart` in `transaction.atomic()`.
   - M6: Narrow the `except Exception` in the coupon path to typed domain errors.
   - M11: Wrap `initiate_payment` check + dispatch in `transaction.atomic()`.
   - M12: Use `F()` and `select_for_update()` in `add_to_cart`.

4. **Performance and polish:**
   - M8: Add `Prefetch` / `select_related` to catalog, cart, wishlist serializers.
   - M9: Add `db_index=True` / `Meta.indexes` on Payment and NotificationLog.
   - M7: Switch request-ID middleware to `contextvars`.
   - M10: Switch to `cached_db` sessions in production settings.
   - M3, M4: Handle registration race and address-lock with `select_for_update`.
   - M5: Replace `str(exc)` in error responses with typed codes.

No architectural rewrite is required. The app/service/selector layering is sound. The newly found critical issue (checkout address leak) is a one-line fix. The resolved Criticals from the prior audit are fully correct implementations.
