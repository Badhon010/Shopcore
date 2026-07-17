# ShopCore REST API Reference

**Base URL:** `/api/`  
**Authentication:** JWT Bearer token — `Authorization: Bearer <access_token>`  
**Content-Type:** `application/json`  
**Schema:** `GET /api/schema/` (OpenAPI 3)  
**Swagger UI:** `GET /api/schema/swagger-ui/`

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

**Response `200`**
```json
{
  "access": "<access_token>",
  "refresh": "<refresh_token>",
  "user": { "id": 1, "email": "user@example.com", "first_name": "Alice", "last_name": "Smith" }
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

**Auth:** None

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

All cart endpoints require authentication.

### `GET /api/cart/`

Return the authenticated user's active cart.

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

Create a new order from the authenticated user's cart.

**Auth:** Required

**Request**
```json
{
  "shipping_address_id": 1,
  "billing_address_id": 1,
  "coupon_code": "SAVE10",
  "payment_method": "MANUAL",
  "idempotency_key": "unique-client-generated-uuid"
}
```

`idempotency_key` is required and must be unique per checkout attempt. Retrying
with the same key returns the original order without creating a duplicate.

**Response `201`** — Created order object.

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

Cancel an order. Only allowed in `PENDING` or `AWAITING_PAYMENT` status.

**Auth:** Required (owner only) · **Response `200`** — Updated order object.

---

### `POST /api/orders/<order_number>/transition/`

Advance an order through its status machine (staff only).

**Auth:** Required (staff only)

**Request** `{ "new_status": "SHIPPED", "note": "Tracking #12345" }`

Valid transitions: `PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED`  
Staff can also set `REFUNDED` from `DELIVERED`.

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

### `POST /api/payments/initiate/`

Initiate a payment for an order.

**Auth:** Required

**Request**
```json
{
  "order_number": "ORD-20260711-0001",
  "provider": "MANUAL"
}
```

Valid providers: `MANUAL` (production-ready), `STRIPE`, `SSLCOMMERZ`, `BKASH`
(stubs — return `PROVIDER_NOT_AVAILABLE` until implemented).

**Response `200`**
```json
{
  "payment_id": 1,
  "status": "PENDING",
  "provider": "MANUAL",
  "amount": "99.98",
  "currency": "USD"
}
```

**Error codes**

| Code | Meaning |
|------|---------|
| `ORDER_NOT_FOUND` | Order does not exist or does not belong to the user |
| `INVALID_PROVIDER` | Provider string not in allowed values |
| `PROVIDER_NOT_AVAILABLE` | Provider is valid but not yet implemented |

---

### `POST /api/payments/webhook/<provider>/`

Receive payment provider webhooks. Provider-specific signature verification is
performed inside the gateway handler.

**Auth:** None (signature-verified by the provider)  
**Response `200`** — `{ "status": "ok" }`

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

| Scope | Limit | Applied to |
|-------|-------|-----------|
| `anon` | 100/day | All unauthenticated requests |
| `user` | 1000/day | All authenticated requests |
| `login` | 5/min | `POST /api/accounts/login/` |
| `register` | 10/hour | `POST /api/accounts/register/` |
| `password_reset_request` | 5/hour | `POST /api/accounts/password-reset/` |
| `coupon_apply` | 20/min | `POST /api/coupons/apply/` |

---

## Order Status Machine

```
PENDING
  │
  ├──[staff confirm]──► CONFIRMED
  │                         │
  │                    [staff process]──► PROCESSING
  │                                           │
  │                                      [staff ship]──► SHIPPED
  │                                                          │
  │                                                    [staff deliver]──► DELIVERED
  │                                                                           │
  │                                                                    [staff refund]──► REFUNDED
  │
  └──[user cancel / timeout]──► CANCELLED
```

Only staff can advance status beyond `PENDING`. Users may cancel while in
`PENDING` or `AWAITING_PAYMENT`.
