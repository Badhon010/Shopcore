# 5. Duplicate logic

Where the same logic exists in more than one place.

## D-1. Cart line totals & subtotal — 3 implementations

- `apps/cart/serializers.py:63` — `CartItemSerializer.get_line_total`:
  `variant.effective_price * quantity`
- `apps/cart/serializers.py:92-95` — `CartSerializer.get_subtotal`:
  `sum(item.variant.effective_price * item.quantity ...)`
- `apps/cart/services.py:199-224` — `get_cart_summary()` recomputes the same
  subtotal and item count.

**Impact:** medium. Risk of divergence if pricing rules change (e.g. quantity
discounts). `get_cart_summary` is used by the coupon preview while the serializer
is used by the cart API — they can disagree.

## D-2. Price-change detection — 3 implementations

- `apps/cart/serializers.py:69-71` — `CartItemSerializer.get_price_changed`
- `apps/cart/serializers.py:97-108` — `CartSerializer.get_price_changed_items`
- `apps/cart/services.py:206-213` — `get_cart_summary` `price_changed_items`

Same "`effective_price != unit_price_snapshot`" check in three places.

## D-3. Address ownership validation — duplicated across layers

- `CheckoutSerializer.validate_shipping_address_id` / `validate_billing_address_id`
  (`apps/orders/serializers.py:75-88`) checks `user=request.user`.
- `CheckoutView.post` re-fetches with the same ownership filter
  (`apps/orders/views.py:50-63`).

Belt-and-suspenders (defensible for a payment path), but it's the same rule written
twice and the two layers can drift.

## D-4. Order fetching — four slightly different query shapes

- `OrderDetailView.get_object` — `get_order_by_number(user, order_number)`
  (`apps/orders/selectors.py:22-33`)
- `OrderCancelView` — bare `Order.objects.get(order_number=..., user=...)`
  (`apps/orders/views.py:108`)
- `AdminOrderDetailView.get_object` — `select_related("user")`, no prefetch
  (`apps/orders/views.py:143-149`)
- `AdminOrderListView.get_queryset` — `select_related("user")`
  (`apps/orders/views.py:155`)

Minor; could be consolidated into selectors.

## D-5. "Order already paid" checks

- `initiate_payment` checks `order.payment_status == PAID` **and**
  `Payment.objects.filter(order=..., status=SUCCEEDED)` (`apps/payments/services.py:48-52`).
- The DB constraint `unique_succeeded_payment_per_order` enforces the same invariant
  (`apps/payments/models.py:31-42`).

Again layered defense (app + DB), intentional per comments, but noted.

## D-6. Status-transition side-effect lists

`transition_order_status` re-declares what happens on `PAID` / `CANCELLED` /
`REFUNDED` (`apps/orders/services.py:315-324`) while `ALLOWED_TRANSITIONS`
(`apps/orders/constants.py:23-31`) declares what *can* happen. Adding a new status
requires editing two files in sync; a mismatch silently produces wrong behavior
(see B-4 for the live example).

## Areas checked and found clean

- Coupon validation has a single shared helper
  (`_check_constraints_and_compute_discount`, `apps/coupons/services.py:136-183`)
  used by both preview and locked checkout — good.
- Stock mutation lives only in `apps/inventory/services.py` — good.
- Order-number generation only in `apps/common/utils.py:37-47` — good.
- Email sending only in `apps/notifications/services.py` via `_send_email` — good.
- Error envelope only in `apps/common/exception_handler.py` — good.
