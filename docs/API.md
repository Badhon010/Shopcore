# ShopCore REST API Reference

**Base URL:** `/api/`  
**Authentication:** JWT Bearer token — `Authorization: Bearer <access_token>`  
**Content-Type:** `application/json`  
**Default currency:** BDT (Bangladeshi Taka) — `DEFAULT_CURRENCY`  
**Schema:** `GET /api/schema/` (OpenAPI 3)  
**Swagger UI:** `GET /api/schema/swagger-ui/`

### Guest carts (X-Cart-Token header)

Anonymous users get a guest cart by sending a client-generated token in the
`X-Cart-Token` header. The backend keys the cart off this token
(`Cart.session_key`) and requires it for all guest cart operations. On login,
the guest cart is merged into the authenticated user's cart and prior guest
orders placed with the verified email are claimed automatically (audit H-4).

---

## Authentication

All protected endpoints require the `Authorization: Bearer <access_token>` header.
Access tokens expire in 15 minutes (configurable). Use the refresh endpoint to
obtain a new access token without re-authenticating.

### Error envelope

All error responses follow this shape:

```json
{
  "error": {
    "code": "ERROR_CODE_SNAKE_UPPER",
    "message": "Human-readable description.",
    "details": {}
  }
}
```

---

## Accounts `/api/accounts/`

### `POST /api/accounts/register/`

Create a new user account. Sends a welcome + email verification email.

**Auth:** None · **Throttle:** 10/hour per IP

**Request**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "first_name": "Alice",
  "last_name": "Smith"
}
```

**Response `201`**
```json
{
  "id": 1,
  "email": "user@example.com",
  "first_name": "Alice",
  "last_name": "Smith",
  "is_email_verified": false
}
```

---

### `POST /api/accounts/login/`

Authenticate and receive JWT tokens.

**Auth:** None · **Throttle:** 5/min per IP

**Request**
```json
{ "email": "user@example.com", "password": "securepassword" }
```

If an `X-Cart-Token` header is present, the guest cart is merged into the
user's cart and any prior guest orders with this verified email are claimed
(attached to the account) in the same step.

**Response `200`**
```json
{
  "access": "<access_token>",
  "refresh": "<refresh_token>",
  "user": { "id": 1, "email": "user@example.com", "first_name": "Alice", "last_name": "Smith" },
  "guest_orders_claimed": 0
}
```

---

### `POST /api/accounts/logout/`

Blacklist the refresh token. The access token continues to work until it expires (15 min).

**Auth:** None

**Request**
```json
{ "refresh": "<refresh_token>" }
```

**Response `204`** — No content.

---

### `POST /api/accounts/token/refresh/`

Obtain a new access + refresh token pair. The old refresh token is blacklisted
(`ROTATE_REFRESH_TOKENS = True`).

**Auth:** None · **Throttle:** 60/min per IP (`token_refresh` — dedicated scope,
so token refresh is never starved by catalog/cart traffic)

**Request**
```json
{ "refresh": "<refresh_token>" }
```

**Response `200`**
```json
{ "access": "<new_access_token>", "refresh": "<new_refresh_token>" }
```

---

### `GET /api/accounts/me/`

Return the authenticated user's profile.

**Auth:** Required · **Response `200`** — same shape as register response.

---

### `PATCH /api/accounts/me/`

Update the authenticated user's first/last name.

**Auth:** Required

**Request** (all fields optional)
```json
{ "first_name": "Alicia", "last_name": "Jones" }
```

---

### `POST /api/accounts/me/change-password/`

Change password. **Blacklists all outstanding refresh tokens** — all other devices
are signed out.

**Auth:** Required

**Request**
```json
{
  "current_password": "oldpassword",
  "new_password": "newpassword"
}
```

**Response `200`** — `{ "detail": "Password changed successfully." }`

---

### `POST /api/accounts/password-reset/`

Send a password-reset link to the given email address. Always returns 200 to
prevent account enumeration.

**Auth:** None · **Throttle:** 5/hour per IP

**Request** `{ "email": "user@example.com" }`  
**Response `200`** — `{ "detail": "Password reset email sent." }`

---

### `POST /api/accounts/password-reset/confirm/`

Set a new password using the token from the reset email. Blacklists all outstanding
refresh tokens on success.

**Auth:** None

**Request**
```json
{
  "uid": "<base64-encoded-user-pk>",
  "token": "<reset-token>",
  "new_password": "newpassword"
}
```

**Response `200`** — `{ "detail": "Password reset successful." }`

---

### `POST /api/accounts/verify-email/`

Verify an email address using the token from the welcome email.

**Auth:** None

**Request** `{ "uid": "...", "token": "..." }`  
**Response `200`** — `{ "detail": "Email verified successfully." }`

---

### `POST /api/accounts/resend-verification/`

Resend the email verification link.

**Auth:** Required  
**Response `200`** — `{ "detail": "Verification email sent." }`

---

### `GET /api/accounts/addresses/`

List all saved addresses for the authenticated user.

**Auth:** Required · **Response `200`** — Array of address objects.

---

### `POST /api/accounts/addresses/`

Add a new address.

**Auth:** Required

**Request**
```json
{
  "full_name": "Alice Smith",
  "phone": "+1-555-0100",
  "address_line_1": "123 Main St",
  "address_line_2": "Apt 4B",
  "city": "Springfield",
  "state": "IL",
  "postal_code": "62701",
  "country": "US",
  "is_default": false
}
```

**Response `201`** — Created address object.

---

### `GET /api/accounts/addresses/<pk>/`

Retrieve a specific address. Must belong to the authenticated user.

**Auth:** Required (owner only) · **Response `200`** — Address object.

---

### `PUT /PATCH /api/accounts/addresses/<pk>/`

Update an address. Must belong to the authenticated user.

**Auth:** Required (owner only) · **Response `200`** — Updated address object.

---

### `DELETE /api/accounts/addresses/<pk>/`

Delete an address. Must belong to the authenticated user.

**Auth:** Required (owner only) · **Response `204`** — No content.

---

### `POST /api/accounts/addresses/<pk>/set-default/`

Mark this address as the default shipping address.

**Auth:** Required (owner only) · **Response `200`** — Updated address object.

---

## Catalog `/api/catalog/`

All catalog endpoints are public (no auth required).

### `GET /api/catalog/categories/tree/`

Return the full category tree. Cached for 5 minutes.

**Response `200`**
```json
[
  {
    "id": 1, "name": "Electronics", "slug": "electronics",
    "children": [
      { "id": 2, "name": "Phones", "slug": "phones", "children": [] }
    ]
  }
]
```

---

### `GET /api/catalog/categories/`

Flat list of all active categories.

**Response `200`** — Array of `{ id, name, slug, description, display_order, image }`.

---

### `GET /api/catalog/categories/<slug>/`

Category detail including parent and children.

**Response `200`** — Full category object.

---

### `GET /api/catalog/brands/`

List all active brands. **Response `200`** — Array of brand objects.

---

### `GET /api/catalog/brands/<slug>/`

Brand detail. **Response `200`** — Brand object.

---

### `GET /api/catalog/products/`

Paginated product list with filtering and search.

**Query parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Full-text search (PostgreSQL websearch syntax) |
| `category` | slug | Filter by category slug |
| `brand` | slug | Filter by brand slug |
| `min_price` | decimal | Minimum base_price |
| `max_price` | decimal | Maximum base_price |
| `is_featured` | boolean | Filter featured products |
| `ordering` | string | `price`, `-price`, `name`, `-name`, `-created_at` |
| `page` | integer | Page number |
| `page_size` | integer | Results per page (max 100) |

**Response `200`**
```json
{
  "count": 42,
  "next": "/api/catalog/products/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1, "name": "Wireless Headphones", "slug": "wireless-headphones",
      "category": { "id": 3, "name": "Audio", "slug": "audio" },
      "brand": { "id": 1, "name": "SoundCo", "slug": "soundco" },
      "base_price": "49.99", "compare_at_price": "79.99",
      "min_price": "49.99",
      "primary_image": { "id": 1, "image": "/media/...", "alt_text": "...", "is_primary": true },
      "average_rating": "4.30", "review_count": 12,
      "status": "ACTIVE", "is_featured": true
    }
  ]
}
```

---

### `GET /api/catalog/products/<slug>/`

Full product detail including all variants with stock quantities and attribute values.

**Response `200`** — Full product object with `variants` array.

---

## Cart `/api/cart/`

Authenticated users use their account cart. Anonymous users supply an
`X-Cart-Token` header to get/merge a guest cart (`GuestCartPermission` — an
anonymous request without the header is rejected).

### `GET /api/cart/`

Return the authenticated user's (or guest's) active cart.

**Response `200`**
```json
{
  "id": 1,
  "items": [
    {
      "id": 1,
      "variant": { "id": 5, "sku": "WH-BLK-L", "effective_price": "49.99" },
      "quantity": 2,
      "unit_price_snapshot": "49.99",
      "subtotal": "99.98"
    }
  ],
  "subtotal": "99.98",
  "item_count": 2
}
```

---

### `POST /api/cart/items/`

Add a variant to the cart. Increments quantity if already present.

**Request** `{ "variant_id": 5, "quantity": 2 }`  
**Response `201`** — Updated full cart object.

---

### `PATCH /api/cart/items/<item_id>/`

Update item quantity.

**Request** `{ "quantity": 3 }`  
**Response `200`** — Updated full cart object.

---

### `DELETE /api/cart/items/<item_id>/`

Remove an item from the cart.

**Response `200`** — Updated full cart object.

---

### `POST /api/cart/clear/`

Remove all items from the cart.

**Response `200`** — `{ "message": "Cart cleared." }`

---

## Orders `/api/orders/`

### `GET /api/orders/`

List orders for the authenticated user, newest first.

**Auth:** Required · **Response `200`** — Paginated order list.

---

### `POST /api/orders/checkout/`

Create a new order. Two request shapes:

**1. Registered user** — saved-address FKs.

**Auth:** Required

```json
{
  "shipping_address_id": 1,
  "billing_address_id": 1,
  "coupon_code": "SAVE10",
  "idempotency_key": "unique-client-generated-uuid"
}
```

`idempotency_key` must be unique per checkout attempt. Retrying with the same
key returns the original order without creating a duplicate.

**2. Guest** — inline identity + shipping-address snapshot; requires the
`X-Cart-Token` header (audit H-4). No auth required.

```json
{
  "guest_name": "Alice Smith",
  "guest_email": "alice@example.com",
  "guest_phone": "+8801711111111",
  "shipping_address": {
    "full_name": "Alice Smith",
    "phone_number": "+8801711111111",
    "address_line_1": "12 Dhanmondi",
    "address_line_2": "",
    "city": "Dhaka",
    "state_province": "Dhaka",
    "postal_code": "1205",
    "country": "BD"
  },
  "coupon_code": "SAVE10",
  "idempotency_key": "guest-idem-1"
}
```

**Response `201`** — Created order object. For guest orders the response
includes a **one-time** `guest_lookup_token` (the DB stores only its SHA-256
hash) used with the order number for tracking/cancelling.

**Error codes**

| Code | Meaning |
|------|---------|
| `CART_EMPTY` | Cart has no items |
| `INSUFFICIENT_STOCK` | One or more items are out of stock |
| `ADDRESS_NOT_FOUND` | Shipping/billing address does not belong to the user (registered) |
| `CART_TOKEN_REQUIRED` | Guest checkout without an `X-Cart-Token` header |

**Error codes**

| Code | Meaning |
|------|---------|
| `CART_EMPTY` | Cart has no items |
| `INSUFFICIENT_STOCK` | One or more items are out of stock |
| `ADDRESS_NOT_FOUND` | Shipping or billing address does not belong to the user |
| `COUPON_INVALID` | Coupon code does not exist or has expired |
| `COUPON_EXHAUSTED` | Coupon has hit its per-user or global redemption limit |
| `DUPLICATE_ORDER` | A completed order with this idempotency_key already exists |

---

### `GET /api/orders/<order_number>/`

Retrieve a specific order. Must belong to the authenticated user.

**Auth:** Required (owner only) · **Response `200`** — Full order object with items and status history.

---

### `POST /api/orders/<order_number>/cancel/`

Cancel an order. Only allowed for **unpaid** orders (`payment_status` `PENDING` or
`FAILED`). Customers may NOT cancel a paid order — the only termination path
for paid money is the staff refund endpoint (below), which restocks inventory.

**Auth:** Registered orders — required (owner only). Guest orders — none, but
the request body must carry the lookup secret: `phone_number` (must match
`guest_phone` or the shipping snapshot) **or** `email` + `lookup_token`.

**Request (guest)**
```json
{ "phone_number": "+8801711111111" }
```

**Response `200`** — Updated order object.

**Error codes**

| Code | Meaning |
|------|---------|
| `ORDER_NOT_FOUND` | Order does not exist or does not belong to the user |
| `ORDER_CANCELLATION_NOT_ALLOWED` | Order is already paid/refunded; use the refund flow |
| `INVALID_ORDER_TRANSITION` | Order cannot be cancelled from its current status |

---

### `POST /api/orders/track/`

Guest order tracking — look up an order by its number plus the bearer secret
used at checkout. A mismatch returns the same `404` envelope as a missing
order so order numbers cannot be probed.

**Auth:** None · **Throttle:** 20/min per IP (`order_track`)

**Request (registered order — email, plus optional phone)**
```json
{ "order_number": "ORD-20260711-0001", "email": "alice@example.com", "phone_number": "+1-555-0100" }
```

**Request (guest order — phone alone, OR email + lookup token)**
```json
{ "order_number": "ORD-20260711-0001", "phone_number": "+8801711111111" }
```

```json
{ "order_number": "ORD-20260711-0001", "email": "alice@example.com", "lookup_token": "<one-time-token-from-checkout>" }
```

Rules:
- Registered orders: `email` must match the account email (the lookup token
  is never used for registered orders); `phone_number` when given must match
  the account phone or shipping snapshot.
- Guest orders: `phone_number` matching `guest_phone`/snapshot is sufficient;
  otherwise `email` + `lookup_token` must both match.

The response is the `PublicOrderSerializer` (no email/phone/token exposed).

**Response `200`** — Public order object with items and status history.

**Error codes**

| Code | Meaning |
|------|---------|
| `ORDER_NOT_FOUND` | Order does not exist **or** email/phone does not match |

---

### `POST /api/orders/<order_number>/refund/`

Process a refund for a paid order (staff only). Records a `Refund`, marks the
order's successful `Payment` `REFUNDED`, transitions the order to `REFUNDED`,
and restocks the committed sale back to inventory — all atomically.

**Auth:** Required (staff only)

**Request** (both fields optional — defaults to a full refund)
```json
{ "amount": "99.98", "reason": "Defective item" }
```

**Response `201`** — Created refund object.

**Error codes**

| Code | Meaning |
|------|---------|
| `ORDER_NOT_FOUND` | Order does not exist |
| `ORDER_NOT_REFUNDABLE` | Order is not paid, or cannot reach `REFUNDED` from its current status (e.g. `SHIPPED` must be delivered first) |
| `ALREADY_REFUNDED` | Order already has a refund |
| `REFUND_ERROR` | Amount invalid or partial (only full refunds in this version) |

---

### `POST /api/orders/<order_number>/transition/`

Advance an order through its status machine (staff only).

**Auth:** Required (staff only)

**Request** `{ "status": "SHIPPED", "note": "Tracking #12345" }`

Valid transitions — a paid order can never be cancelled:

```
PENDING_PAYMENT → PAID | CANCELLED
PAID           → PROCESSING | REFUNDED
PROCESSING     → SHIPPED | REFUNDED
SHIPPED        → DELIVERED
DELIVERED      → REFUNDED
CANCELLED / REFUNDED → (terminal)
```

Transitions to `REFUNDED` restock inventory; cancellation of an unpaid order
releases its stock reservations.

---

## Inventory `/api/inventory/`

All inventory endpoints require staff authentication.

### `GET /api/inventory/stock/`

List all stock items with current quantities.

**Auth:** Staff required · **Response `200`** — Paginated stock item list.

---

### `GET /api/inventory/stock/<pk>/`

Stock item detail including movement history.

**Auth:** Staff required · **Response `200`** — Stock item with movements.

---

### `POST /api/inventory/stock/<pk>/restock/`

Add stock units.

**Auth:** Staff required

**Request** `{ "quantity": 50, "note": "Supplier delivery #PO-2026-001" }`  
**Response `200`** — Updated stock item.

---

## Payments `/api/payments/`

### `GET /api/payments/methods/`

Public list of **enabled** payment methods for the storefront checkout, ordered
by `sort_order`. Manual methods include their `instructions`, `account_number`,
`account_name`, and `qr_image` for display.

**Auth:** None · **Response `200`** — Array of payment method objects.

---

### `POST /api/payments/initiate/`

Initiate a payment for an order.

**Auth:** Required (registered orders). Gateway-backed initiation for a guest
order is not supported — guests pay via the manual submission flow
(`POST /api/payments/submit/`).

**Request**
```json
{
  "order_number": "ORD-20260711-0001",
  "provider": "MANUAL"
}
```

Valid providers: `MANUAL` (COD — confirms immediately), `SSLCOMMERZ`, `STRIPE`,
`PAYPAL` (gateway-backed, disabled until env credentials are configured).
`BANK_TRANSFER`, `BKASH`, `NAGAD`, `ROCKET` are manual methods — they have no
initiate flow; customers use the submission endpoint instead.

**Response `200`** — varies by provider:
- `MANUAL`: `{ payment_id, provider }` (payment confirmed immediately)
- `SSLCOMMERZ`/`PAYPAL`: `{ payment_id, provider, redirect_url }` — redirect
the browser to the gateway
- `STRIPE`: `{ payment_id, provider, client_secret }` — confirm client-side

**Error codes**

| Code | Meaning |
|------|---------|
| `ORDER_NOT_FOUND` | Order does not exist or does not belong to the user |
| `INVALID_PROVIDER` | Provider string not in allowed values (serializer, `400`) |
| `PROVIDER_NOT_AVAILABLE` | Provider is valid but has no registered gateway (e.g. `BKASH`) |
| `PAYMENT_METHOD_NOT_AVAILABLE` | Method exists but is disabled |
| `GATEWAY_NOT_CONFIGURED` | Gateway credentials are absent (graceful — see below) |
| `GATEWAY_ERROR` | The provider rejected initiation |
| `DUPLICATE_PAYMENT` | Order already has a successful payment (also `409` on a DB-level race) |
| `INVALID_ORDER_TRANSITION` | Order is already paid/refunded |

**Gateway configuration** — credentials come from environment variables only
(`SSLCOMMERZ_STORE_ID`/`SSLCOMMERZ_STORE_PASSWORD`, `STRIPE_SECRET_KEY`,
`PAYPAL_CLIENT_ID`/`PAYPAL_CLIENT_SECRET`). When a gateway is enabled but not
configured, initiation returns `GATEWAY_NOT_CONFIGURED` instead of failing —
and the storefront only lists methods that are enabled <em>and</em> configured.

---

### `POST /api/payments/submit/`

Customer submits an offline payment (bank transfer, bKash, Nagad, Rocket) with
a reference number and optional receipt for staff verification.

**Auth:** Required (order owner)

**Request** (multipart/form-data for the receipt, else JSON)
```json
{
  "order_number": "ORD-20260711-0001",
  "method_id": 1,
  "reference_number": "TX-20260711-0001",
  "notes": "Paid from bKash",
  "receipt": "<file>"
}
```

`order_number` and `reference_number` are required; `method_id` must reference an
enabled payment method. Only one `PENDING` submission per order is allowed.

**Response `201`** — Created submission object (`status: PENDING`).

**Error codes**

| Code | Meaning |
|------|---------|
| `ORDER_NOT_FOUND` | Order does not exist or does not belong to the user |
| `PAYMENT_SUBMISSION_ERROR` | Order paid / already has pending or approved submission / method disabled |

---

### `POST /api/payments/webhook/<provider>/`

Receive payment provider webhooks. Provider-specific signature verification is
performed inside the gateway handler.

**Auth:** None (signature-verified by the provider)  
**Response `200`** — `{ "status": "ok" }`

---

### Admin payment endpoints (staff only)

#### `GET | POST /api/payments/admin/methods/`

List all payment methods, or create one (enable/disable, configure
instructions/account details/QR, sort order).

**Auth:** Staff required · **Response `200`** — Paginated list. **Response `201`** — Created method.

#### `GET | PUT | PATCH | DELETE /api/payments/admin/methods/<pk>/`

Retrieve, update, or delete a payment method.

**Auth:** Staff required · **Response `200`** — Method object.

#### `GET /api/payments/admin/submissions/`

Staff payment-verification queue. Query params: `status` (`PENDING`/`APPROVED`/`REJECTED`) and `order_number`.

**Auth:** Staff required · **Response `200`** — Paginated submission list (with receipt URL).

#### `POST /api/payments/admin/submissions/<pk>/review/`

Approve or reject a pending manual payment submission.

**Auth:** Staff required

**Request**
```json
{ "approve": true, "admin_note": "Verified from bank statement." }
```

Approving records a `SUCCEEDED` `Payment` (provider from the submission's
method) and transitions the order to `PAID` atomically; rejecting leaves the
order unpaid so the customer can resubmit.

**Response `200`** — Updated submission object.

**Error codes**

| Code | Meaning |
|------|---------|
| `NOT_FOUND` | Submission does not exist |
| `SUBMISSION_ALREADY_REVIEWED` | Submission was already reviewed (`409`) |
| `INVALID_ORDER_TRANSITION` | Order can no longer be paid (rolled back) |
| `DUPLICATE_PAYMENT` | Concurrent approve race — order already paid (`409`) |

---

## Coupons `/api/coupons/`

### `POST /api/coupons/apply/`

Validate a coupon code against the current cart. Does not redeem the coupon —
redemption happens at checkout.

**Auth:** Required · **Throttle:** 20/min

**Request** `{ "code": "SAVE10" }`

**Response `200`**
```json
{
  "code": "SAVE10",
  "discount_type": "PERCENTAGE",
  "discount_value": "10.00",
  "minimum_order_amount": "0.00",
  "description": "10% off your entire order"
}
```

---

## Reviews `/api/reviews/`

### `GET /api/reviews/products/<product_slug>/reviews/`

List all approved reviews for a product.

**Auth:** None · **Response `200`** — Paginated review list.

---

### `POST /api/reviews/products/<product_slug>/reviews/create/`

Submit a review for a product.

**Auth:** Required

**Request**
```json
{
  "rating": 5,
  "title": "Excellent quality",
  "body": "Arrived quickly and works perfectly."
}
```

**Response `201`** — Created review object.

---

### `GET /api/reviews/my-reviews/<pk>/`

Retrieve one of the authenticated user's reviews.

**Auth:** Required (owner only) · **Response `200`** — Review object.

---

### `PATCH /api/reviews/my-reviews/<pk>/`

Update a review.

**Auth:** Required (owner only) · **Response `200`** — Updated review.

---

### `DELETE /api/reviews/my-reviews/<pk>/`

Delete a review.

**Auth:** Required (owner only) · **Response `204`** — No content.

---

## Wishlist `/api/wishlist/`

### `GET /api/wishlist/`

Return the authenticated user's wishlist.

**Auth:** Required · **Response `200`** — Wishlist with items.

---

### `POST /api/wishlist/add/`

Add a product to the wishlist.

**Auth:** Required

**Request** `{ "product_id": 1 }`  
**Response `200`** — Updated wishlist.

---

### `DELETE /api/wishlist/remove/<product_id>/`

Remove a product from the wishlist.

**Auth:** Required · **Response `200`** — Updated wishlist.

---

### `POST /api/wishlist/move-to-cart/`

Move a wishlist item to the cart and remove it from the wishlist.

**Auth:** Required

**Request** `{ "product_id": 1, "variant_id": 5, "quantity": 1 }`  
**Response `200`** — `{ "detail": "Moved to cart." }`

---

## Rate Limits (Production Defaults)

The global `anon`/`user` buckets are deliberately generous — a single
home-page load fires several anonymous GETs (banners, category tree, brands,
featured products, cart) plus one CORS preflight (`OPTIONS`) per cross-origin
request. Preflights never consume throttle budget (all throttles skip
`OPTIONS`), and the tight per-endpoint scopes below are the actual anti-abuse
controls.

| Scope | Limit | Applied to |
|-------|-------|-----------|
| `anon` | 1000/min per IP | All unauthenticated requests (public catalog reads, guest cart, …) |
| `user` | 5000/hour | All authenticated requests (anonymous requests also consume this bucket per IP) |
| `login` | 5/min | `POST /api/accounts/login/` |
| `register` | 10/hour | `POST /api/accounts/register/` |
| `password_reset_request` | 5/hour | `POST /api/accounts/password-reset/` |
| `resend_verification` | 5/hour | `POST /api/accounts/resend-verification/` |
| `coupon_apply` | 20/min | `POST /api/coupons/apply/` |
| `order_track` | 20/min per IP | `POST /api/orders/track/` |
| `token_refresh` | 60/min per IP | `POST /api/accounts/token/refresh/` |

---

## Order Status Machine

```
PENDING_PAYMENT
  │
  ├──[payment confirmed]──► PAID ──[staff process]──► PROCESSING ──[staff ship]──► SHIPPED ──[staff deliver]──► DELIVERED
  │                             │                        │                                                │
  │                             └──[staff refund]────────┘                                                └──[staff refund]──► REFUNDED
  │
  └──[user cancel / timeout]──► CANCELLED
```

Rules:
- Only staff can advance an order beyond `PAID`.
- Customers may cancel **unpaid** orders only (`PENDING_PAYMENT`).
- A paid order can **never** be cancelled — the only termination path is
  `REFUNDED` via `POST /api/orders/<order_number>/refund/`, which restocks
  inventory.
- `REFUNDED` and `CANCELLED` are terminal states.
