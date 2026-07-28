# ShopCore Frontend Admin — Complete AI Handoff Guide

> **Audience:** A future AI agent that will work on `frontend-admin`.
> **Purpose:** Read this file first. It replaces the need to explore the repo from scratch.
> **Status:** Grounded in the actual repository as of July 2026.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Frontend Stack](#2-frontend-stack)
3. [Folder Structure](#3-folder-structure)
4. [Design System and Tokens](#4-design-system-and-tokens)
5. [Environment Variables](#5-environment-variables)
6. [API Contract](#6-api-contract)
7. [Authentication](#7-authentication)
8. [UI and UX Conventions](#8-ui-and-ux-conventions)
9. [Page and Feature Map](#9-page-and-feature-map)
10. [Services and Data Flow](#10-services-and-data-flow)
11. [Backend Change Policy](#11-backend-change-policy)
12. [What Future AI Must Not Do](#12-what-future-ai-must-not-do)
13. [Known Good Files](#13-known-good-files)
14. [Production Readiness Notes](#14-production-readiness-notes)

---

## 1. Project Overview

**ShopCore** is a full-stack e-commerce platform consisting of three parts:

| Part | Directory | Purpose |
|---|---|---|
| Django backend | `apps/`, `config/` | REST API (DRF), PostgreSQL, Redis, JWT auth |
| Customer storefront | `frontend-store/` | React SPA for shoppers |
| Admin panel | `frontend-admin/` | React SPA for staff/managers |

The two frontends are **separate Vite projects** under the same repo. They share no source code, but both talk to the same Django backend at `/api/v1/`. Both use an identical technology stack and closely mirrored folder structures.

`frontend-store` is the **reference implementation**. `frontend-admin` must match its conventions in every way: same token vocabulary, same component patterns, same service layer structure, same authentication approach. When in doubt about how to do something, look at how the store does it first.

The Django admin UI (`/admin/`) is separate from `frontend-admin` and is not relevant to frontend work.

---

## 2. Frontend Stack

Both `frontend-store` and `frontend-admin` use this exact stack. Do not change it.

| Library | Version | Purpose |
|---|---|---|
| React | 19.x | UI framework |
| TypeScript | 5.5.x | Type safety |
| Vite | 6.x | Dev server + build |
| Tailwind CSS | 3.4.x | Utility-first CSS |
| React Router | 6.24.x | Client-side routing |
| TanStack Query | 5.45.x | Server state, caching, mutations |
| Axios | 1.7.x | HTTP client |
| React Hook Form | 7.52.x | Form state management |
| Zod | 3.23.x | Schema validation |
| Lucide React | 0.397.x | Icons (use icons, never emojis in UI) |
| Framer Motion | 11.3.x | Animations |
| Radix UI | Various | Accessible headless primitives (Dialog, Toast, Slot) |
| Recharts | 3.x | Charts (admin only) |
| class-variance-authority | 0.7.x | Component variant management |
| clsx + tailwind-merge | Latest | Conditional className merging via `cn()` util |
| @fontsource-variable/inter | 5.x | Inter variable font |

**Testing:** Vitest + jsdom (configured in `vitest.config.ts` inside `vite.config.ts`).

**Linting:** ESLint 9 with `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`. Prettier with `prettier-plugin-tailwindcss`.

There is **no Redux**, **no Zustand**, **no MobX**, and **no CSS-in-JS**. All server state is TanStack Query. Local UI state is `useState`/`useReducer`. Global state (auth, toast, theme) is plain React Context.

---

## 3. Folder Structure

### 3.1 Backend (`apps/` and `config/`)

```
apps/
  accounts/         # User model, JWT auth, addresses
  catalog/          # Products, categories, brands, banners
  cart/             # Session-based shopping cart
  orders/           # Orders, checkout, status transitions
  payments/         # Payment gateway abstraction (Stripe v2 stub)
  inventory/        # Stock items, warehouses, restock
  coupons/          # Discount coupons (admin CRUD + apply)
  reviews/          # Product reviews with approval flow
  wishlist/         # User wishlists
  notifications/    # In-app staff notifications
  newsletter/       # Subscribers + campaign management
  contact/          # Contact form submissions + admin inbox
  dashboard/        # Admin dashboard stats and KPIs
  exports/          # CSV / Excel export endpoints
  search/           # Global full-text search
  uploads/          # Centralised file upload infrastructure
  common/           # Shared base models, permissions, utilities

config/
  settings/
    base.py         # Shared settings (DB, auth, JWT, installed apps)
    development.py  # DEBUG=True, local DB, console email
    production.py   # Security headers, media storage backends
  urls.py           # Root URL config — all routes prefixed with api/v1/
  wsgi.py / asgi.py
```

### 3.2 `frontend-store/src/`

```
app/            # App.tsx, providers.tsx, router.tsx, queryClient.ts
assets/         # Static images
components/
  ui/           # Reusable primitives (Button, Input, Modal, Badge, …)
  layout/       # Navbar, Footer, PageContainer, ResponsiveImage
  feedback/     # Skeleton, Spinner, EmptyState, ErrorState, ErrorBoundary, ToastProvider
  forms/        # Shared form components
config/         # env.ts — typed wrapper over import.meta.env
constants/      # routes.ts, breakpoints.ts, config.ts
contexts/       # AuthContext, CartUIContext, ThemeContext, ToastContext
features/       # Feature-scoped bundles:
  auth/         #   LoginForm, RegisterForm, ForgotPasswordForm, ResetPasswordForm
  account/      #   AddressForm, useProfile hook
  cart/         #   CartDrawer, CartLineItem, CartSummary, CouponInput, useCart hook
hooks/          # Shared hooks (useDebounce is in utils/ in admin)
layouts/        # Page layout wrappers
pages/          # Route-level page components
routes/         # ProtectedRoute, PublicOnlyRoute
services/api/   # axiosClient.ts, endpoints.ts, *.service.ts
styles/         # tokens.css, globals.css
types/          # models.ts, api.ts
utils/          # cn.ts, format.ts, validators.ts
```

### 3.3 `frontend-admin/src/`

```
app/            # App.tsx, providers.tsx, router.tsx, queryClient.ts
components/
  ui/           # Admin UI primitives — see §9 for full list
  feedback/     # Skeleton, Spinner, EmptyState, ErrorState, ErrorBoundary, ToastProvider
config/         # env.ts
constants/      # routes.ts, navigation.ts
contexts/       # AuthContext, ThemeContext, ToastContext
layouts/        # AdminLayout.tsx (sidebar + topnav), AuthLayout.tsx
pages/          # Route-level admin pages, organised by domain
routes/         # AdminOnlyRoute.tsx, PublicOnlyRoute.tsx
services/api/   # axiosClient.ts, endpoints.ts, *.service.ts
styles/         # tokens.css, globals.css
types/          # models.ts, api.ts, global.d.ts
utils/          # cn.ts, format.ts, useDebounce.ts, validators.ts
```

Key difference: the admin has no `features/` directory. Domain logic lives directly in `pages/` and `services/`.

---

## 4. Design System and Tokens

### 4.1 Token file

**`frontend-admin/src/styles/tokens.css`** — the single source of truth for all visual variables. It is imported at the top of `globals.css`. Never hardcode colours, radii, or shadows in component files.

All tokens are **CSS custom properties** on `:root` (light) and `.dark, [data-theme="dark"]` (dark). Tailwind is configured to read them via `hsl(var(--token-name))`.

### 4.2 Colour tokens (light mode values)

```css
/* Primary — blue */
--primary:           224 76% 48%      /* hsl(224,76%,48%) */
--primary-hover:     224 76% 40%
--primary-active:    224 76% 34%
--primary-light:     224 82% 95%
--primary-foreground: 0 0% 100%

/* Accent — teal */
--accent:            173 72% 34%
--accent-hover:      173 72% 28%
--accent-subtle:     173 55% 93%
--accent-foreground: 173 60% 12%

/* Surfaces */
--background:        210 30% 98%      /* page background */
--background-subtle: 214 32% 95%
--surface:           0 0% 100%        /* cards, panels */
--surface-elevated:  0 0% 100%

/* Text */
--text-primary:      222 47% 11%
--text-secondary:    215 20% 35%
--text-muted:        215 16% 47%
--text-tertiary:     215 16% 47%
--text-inverse:      0 0% 100%
--text-on-primary:   0 0% 100%

/* Borders */
--border:            214 22% 88%
--border-light:      214 22% 94%
--border-strong:     214 22% 78%

/* Semantic */
--success: 152 60% 36%   --success-subtle: 152 50% 95%
--warning: 38 92% 50%    --warning-subtle: 38 92% 95%
--danger:  0 72% 51%     --danger-subtle:  0 100% 97%
--info:    217 91% 60%   --info-subtle:    217 91% 95%

/* State */
--disabled:          220 13% 91%
--disabled-foreground: 222 8% 56%
--skeleton:          220 13% 91%
--overlay:           0 0% 0%
```

### 4.3 Radius, shadows, and motion

```css
--radius-sm:   8px
--radius-md:   12px
--radius-lg:   20px
--radius-xl:   24px
--radius-2xl:  28px
--radius-full: 9999px

--shadow-xs: 0 1px 2px rgba(15, 23, 42, 0.035)
--shadow-sm: 0 6px 16px rgba(15, 23, 42, 0.055)
--shadow-md: 0 14px 34px rgba(15, 23, 42, 0.09)
--shadow-lg: 0 24px 60px rgba(15, 23, 42, 0.14)
--shadow-focus-ring: 0 0 0 4px hsl(var(--primary) / 0.22)

--duration-fast: 120ms
--duration-base: 200ms
--duration-slow: 320ms
```

### 4.4 Dark mode

Dark mode is toggled by adding the `.dark` class (or `data-theme="dark"`) to the `<html>` element. `ThemeContext.tsx` manages this. The dark palette replaces `--primary` with a lighter indigo (`245 75% 68%`) and shifts all surface/border/text tokens accordingly. **Do not use `@media (prefers-color-scheme)`** directly — use the token system.

### 4.5 Typography

Font family: `InterVariable` (variable font, loaded from `@fontsource-variable/inter`), falling back to `Inter`, `system-ui`, `sans-serif`. Set on `body` in `globals.css`. Base font size: `1rem`, line-height: `1.6`. No custom font scale is defined — use Tailwind's default type scale (`text-sm`, `text-base`, `text-lg`, etc.).

### 4.6 Scrollbar styling

Both `globals.css` files define a 5px premium scrollbar:

```css
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: hsl(var(--border-strong) / 0.7);
  border-radius: 9999px;
}
/* Firefox */
* { scrollbar-width: thin; scrollbar-color: hsl(var(--border-strong) / 0.7) transparent; }
```

This is already applied globally. Do not add per-component scrollbar overrides.

### 4.7 Global utility classes

```css
.container-page   /* mx-auto w-full max-w-8xl px-4 sm:px-8 lg:px-10 */
.admin-surface    /* rounded-2xl border border-border bg-surface shadow-xs */
```

Use `admin-surface` for cards and panels rather than repeating the class list.

### 4.8 How admin and store tokens differ

The store uses `--primary: 222 84% 56%` (slightly brighter blue). The admin uses `--primary: 224 76% 48%` (slightly deeper). Both use the same token **names**, which means a future unified design system is possible. Never cross-import tokens between the two apps.

---

## 5. Environment Variables

### 5.1 Backend `.env` (applies to Django only)

Copy `.env.example` to `.env` in the project root for local development.

| Variable | Required in prod | Default (dev) | Purpose |
|---|---|---|---|
| `SECRET_KEY` | ✅ Yes | insecure placeholder | Django secret key |
| `ALLOWED_HOSTS` | ✅ Yes | `localhost,127.0.0.1` | Comma-separated allowed hostnames |
| `DATABASE_URL` | ✅ Yes | `postgres://shopcore:shopcore@localhost:5432/shopcore` | PostgreSQL DSN — SQLite is not supported |
| `REDIS_URL` | No | `redis://localhost:6379/0` | Used for cache (category tree, Django cache framework) |
| `FRONTEND_URL` | ✅ Yes | `http://localhost:5000` | Used in email links (password reset, verification) |
| `CORS_ALLOWED_ORIGINS` | ✅ Yes | `http://localhost:3000` | Must include the admin and store origins |
| `EMAIL_URL` | No | `console://` | SMTP DSN or `console://` to print emails to stdout |
| `EMAIL_BACKEND` | No | — | If set, overrides `EMAIL_URL` (use for Gmail SMTP) |
| `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_HOST_USER` / `EMAIL_HOST_PASSWORD` | No | — | Only when `EMAIL_BACKEND` is smtp |
| `DEFAULT_FROM_EMAIL` | No | `no-reply@shopcore.example` | From address for outgoing email |
| `ADMIN_EMAIL` | No | _(blank)_ | Receives contact form notifications |
| `JWT_ACCESS_TOKEN_LIFETIME_MINUTES` | No | `15` | Access token TTL |
| `JWT_REFRESH_TOKEN_LIFETIME_DAYS` | No | `7` | Refresh token TTL |
| `MEDIA_STORAGE` | No | `local` | One of: `local`, `s3`, `gcs`, `r2` |
| `MEDIA_ROOT` | No | `<project>/media` | Filesystem path for uploads (local only) |
| `MEDIA_URL` | No | `/media/` | URL prefix for uploaded files |
| `STRIPE_PUBLISHABLE_KEY` / `STRIPE_SECRET_KEY` | No | — | Stripe keys (payment gateway is a v2 stub) |
| `SECURE_SSL_REDIRECT` | No | `True` in prod | HTTP → HTTPS redirect |
| `SESSION_COOKIE_SECURE` / `CSRF_COOKIE_SECURE` | No | `True` in prod | Secure cookie flags |

> **IMPORTANT for Replit:** `MEDIA_STORAGE=local` writes to the local filesystem which is ephemeral in Replit deployments. Use `s3`, `gcs`, or `r2` for production deployments on Replit.

### 5.2 Frontend environment variables (`VITE_*`)

Both `frontend-store` and `frontend-admin` read from a `.env` file in their respective directory (or from system env). Variables must be prefixed with `VITE_` to be exposed to client code.

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `/api` | Axios base URL. In dev, Vite proxies `/api` to `http://localhost:8000/api/v1`. In production, set to the absolute API origin if the admin is on a different domain. |
| `VITE_APP_NAME` | `ShopCore Admin` | Application name shown in the title bar |

The `env.ts` config file (`src/config/env.ts`) wraps these:

```ts
export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
  appName:    import.meta.env.VITE_APP_NAME ?? 'ShopCore Admin',
}
```

**Local dev:** Leave `VITE_API_BASE_URL` unset. The Vite dev server proxy rewrites `/api/anything` → `http://localhost:8000/api/v1/anything`.

**Production:** If the admin SPA is served from a different origin than the API, set `VITE_API_BASE_URL=https://api.yourdomain.com/api/v1`. If they share an origin, the relative `/api` default works if the reverse proxy rewrites paths correctly.

---

## 6. API Contract

### 6.1 Versioning and base path

All API routes are prefixed with `/api/v1/`. The Vite proxy rewrites `/api` → `/api/v1` so frontend code uses paths like `/accounts/login/` (not `/api/v1/accounts/login/`).

The `endpoints.ts` file is the **single source of truth** for all endpoint paths in the admin. Never construct URL strings inline in service files or components. Add new paths to `endpoints.ts` first.

OpenAPI schema is available at `/api/schema/`. Swagger UI at `/api/docs/`. Redoc at `/api/redoc/`.

### 6.2 Endpoint groups

#### `accounts` — `apps/accounts/`

| Endpoint | Method | Auth | Access | Notes |
|---|---|---|---|---|
| `/accounts/register/` | POST | None | Public | Creates user, sends verification email |
| `/accounts/login/` | POST | None | Public | Returns `access`, `refresh`, `user` |
| `/accounts/logout/` | POST | Bearer | Authenticated | Blacklists refresh token |
| `/accounts/token/refresh/` | POST | None | Public | Returns new `access` (and rotated `refresh`) |
| `/accounts/me/` | GET / PATCH | Bearer | Authenticated | Current user profile |
| `/accounts/me/change-password/` | POST | Bearer | Authenticated | Change password |
| `/accounts/password-reset/` | POST | None | Public | Sends reset email |
| `/accounts/password-reset/confirm/` | POST | None | Public | Confirm with token |
| `/accounts/verify-email/` | POST | None | Public | Verify email with token |
| `/accounts/resend-verification/` | POST | None | Public | Re-send verification email |
| `/accounts/addresses/` | GET / POST | Bearer | Authenticated | User address list |
| `/accounts/addresses/<pk>/` | GET / PATCH / DELETE | Bearer | Authenticated | Single address |
| `/accounts/addresses/<pk>/set-default/` | POST | Bearer | Authenticated | Mark as default |
| `/accounts/admin/users/` | GET | Bearer | **Staff only** | Paginated user list |
| `/accounts/admin/users/<pk>/` | GET / PATCH | Bearer | **Staff only** | Single user detail |

#### `catalog` — `apps/catalog/`

| Endpoint | Method | Auth | Access | Notes |
|---|---|---|---|---|
| `/catalog/products/` | GET | None | Public | Published products only, filterable |
| `/catalog/products/<slug>/` | GET | None | Public | Published products only |
| `/catalog/categories/` | GET | None | Public | Root categories only |
| `/catalog/categories/tree/` | GET | None | Public | Full nested tree, cached in Redis |
| `/catalog/categories/<slug>/` | GET | None | Public | Single category by slug |
| `/catalog/brands/` | GET | None | Public | All brands |
| `/catalog/brands/<slug>/` | GET | None | Public | Single brand by slug |
| `/catalog/banners/` | GET | None | Public | Active banners |
| `/catalog/admin/products/` | GET / POST | Bearer | **Staff only** | All products (DRAFT+PUBLISHED+ARCHIVED) |
| `/catalog/admin/products/<slug>/` | GET / PATCH / PUT / DELETE | Bearer | **Staff only** | Single product, all statuses |
| `/catalog/admin/categories/` | GET / POST | Bearer | **Staff only** | All categories, ID-based |
| `/catalog/admin/categories/<pk>/` | GET / PATCH / PUT / DELETE | Bearer | **Staff only** | Single category by integer PK |
| `/catalog/admin/brands/` | GET / POST | Bearer | **Staff only** | All brands |
| `/catalog/admin/brands/<pk>/` | GET / PATCH / PUT / DELETE | Bearer | **Staff only** | Single brand by integer PK |
| `/catalog/admin/products/<slug>/variants/` | GET / POST | Bearer | **Staff only** | List / create variants for a product |
| `/catalog/admin/products/<slug>/variants/<pk>/` | GET / PATCH / PUT / DELETE | Bearer | **Staff only** | Single product variant |
| `/catalog/admin/products/<slug>/images/` | GET / POST | Bearer | **Staff only** | List / upload images for a product |
| `/catalog/admin/products/<slug>/images/<pk>/` | GET / PATCH / DELETE | Bearer | **Staff only** | Single product image |
| `/catalog/admin/banners/` | GET / POST | Bearer | **Staff only** | List / create banners |
| `/catalog/admin/banners/<pk>/` | GET / PUT / PATCH / DELETE | Bearer | **Staff only** | Single banner |

> **Image uploads:** `POST /catalog/admin/products/<slug>/images/` accepts `multipart/form-data` with `image` (file, max 5 MB, JPEG/PNG/WebP only) or `external_url` (string). Exactly one must be provided. Setting `is_primary: true` automatically clears the flag on other images for the same product.

> **Banner uploads:** `POST /catalog/admin/banners/` accepts `multipart/form-data` with `image` (file, max 10 MB, JPEG/PNG/WebP only). GIF is rejected.

> **Variant auto-creation:** a default variant (`<sku>-DEFAULT`) is auto-created by a signal when a product is created. Account for this when listing variants — a new product always has count ≥ 1.

> **Critical:** Public category/brand endpoints use **slug** (`/categories/<slug>/`). Admin endpoints use **integer PK** (`/admin/categories/<pk>/`). Never mix them. The storefront should never call admin endpoints.

> **Product status values:** `DRAFT`, `PUBLISHED`, `ARCHIVED`. The value `ACTIVE` does not exist on the backend. This was a bug in the original frontend code that has been corrected everywhere.

#### `orders` — `apps/orders/`

| Endpoint | Method | Auth | Access | Notes |
|---|---|---|---|---|
| `/orders/` | GET | Bearer | Authenticated | Current user's orders |
| `/orders/checkout/` | POST | Bearer | Authenticated | Create order from cart |
| `/orders/<order_number>/` | GET | Bearer | Authenticated | Order detail (owner or staff) |
| `/orders/<order_number>/cancel/` | POST | Bearer | Authenticated | Customer cancel |
| `/orders/<order_number>/transition/` | POST | Bearer | **Staff only** | Change order status |
| `/orders/admin/` | GET | Bearer | **Staff only** | All orders, filterable |
| `/orders/admin/stats/` | GET | Bearer | **Staff only** | Aggregate order stats |

#### `inventory` — `apps/inventory/`

| Endpoint | Method | Auth | Access | Notes |
|---|---|---|---|---|
| `/inventory/stock/` | GET | Bearer | **Staff only** | Stock items list, filterable |
| `/inventory/stock/<pk>/` | GET / PATCH | Bearer | **Staff only** | Single stock item |
| `/inventory/stock/<pk>/restock/` | POST | Bearer | **Staff only** | Add stock quantity (legacy restock) |
| `/inventory/stock/<pk>/threshold/` | PATCH | Bearer | **Staff only** | Update low-stock threshold |
| `/inventory/stock/<pk>/adjust/` | POST | Bearer | **Staff only** | Manual delta adjustment with reason; prevents negative stock |
| `/inventory/stock/<pk>/movements/` | GET | Bearer | **Staff only** | Paginated movement history for a stock item |
| `/inventory/warehouses/` | GET | Bearer | **Staff only** | List all warehouses |

> **Adjustment rules:** `quantity_delta` may be positive or negative. Zero is rejected. The backend prevents adjustments that would make `quantity_on_hand` negative or drive `quantity_available` below zero (i.e. below `quantity_reserved`). Error codes: `NEGATIVE_STOCK`, `INSUFFICIENT_AVAILABLE`.

#### `cart` — `apps/cart/`

| Endpoint | Method | Auth | Access | Notes |
|---|---|---|---|---|
| `/cart/` | GET | None | Public (session) | Current cart |
| `/cart/items/` | POST | None | Public (session) | Add item |
| `/cart/items/<item_id>/` | PATCH / DELETE | None | Public (session) | Update or remove item |
| `/cart/clear/` | POST | None | Public (session) | Empty cart |

> Cart is not used by the admin panel. Guest-cart merging on login is **not implemented** on the backend (v1 limitation).

#### `coupons` — `apps/coupons/`

| Endpoint | Method | Auth | Access | Notes |
|---|---|---|---|---|
| `/coupons/apply/` | POST | None | Public | Apply coupon to cart |
| `/coupons/` | GET / POST | Bearer | **Staff only** | List/create coupons |
| `/coupons/<pk>/` | GET / PATCH / DELETE | Bearer | **Staff only** | Single coupon |

> **Field note:** The `Coupon` model uses `usage_limit_per_user` (not `per_customer`). The `models.ts` type has both `usage_limit_per_user` and `usage_limit_per_customer` for legacy compatibility. When writing coupon forms, use `usage_limit_per_user`.

#### `reviews` — `apps/reviews/`

| Endpoint | Method | Auth | Access | Notes |
|---|---|---|---|---|
| `/reviews/products/<slug>/reviews/` | GET | None | Public | Published reviews for a product |
| `/reviews/products/<slug>/reviews/create/` | POST | Bearer | Authenticated | Submit a review |
| `/reviews/my-reviews/<pk>/` | GET / PATCH / DELETE | Bearer | Owner only | Edit own review |
| `/reviews/admin/` | GET | Bearer | **Staff only** | All reviews with approval status |
| `/reviews/admin/<pk>/` | GET / PATCH / DELETE | Bearer | **Staff only** | Approve/reject/delete review |

#### `newsletter` — `apps/newsletter/`

| Endpoint | Method | Auth | Access | Notes |
|---|---|---|---|---|
| `/newsletter/subscribe/` | POST | None | Public | Add email to subscriber list |
| `/newsletter/admin/subscribers/` | GET | Bearer | **Staff only** | Subscriber list |
| `/newsletter/admin/subscribers/<pk>/` | GET / PATCH / DELETE | Bearer | **Staff only** | Single subscriber |
| `/newsletter/admin/stats/` | GET | Bearer | **Staff only** | Subscriber and campaign stats |
| `/newsletter/admin/campaigns/` | GET / POST | Bearer | **Staff only** | Campaign list/create (ViewSet) |
| `/newsletter/admin/campaigns/<pk>/` | GET / PUT / PATCH / DELETE | Bearer | **Staff only** | Single campaign |
| `/newsletter/admin/campaigns/<pk>/send/` | POST | Bearer | **Staff only** | Send campaign to subscribers |
| `/newsletter/admin/campaigns/<pk>/duplicate/` | POST | Bearer | **Staff only** | Clone a campaign |

#### `notifications` — `apps/notifications/`

| Endpoint | Method | Auth | Access | Notes |
|---|---|---|---|---|
| `/notifications/` | GET | Bearer | Authenticated | Paginated notification list |
| `/notifications/<pk>/read/` | POST | Bearer | Authenticated | Mark one as read |
| `/notifications/read-all/` | POST | Bearer | Authenticated | Mark all as read |

#### `payments` — `apps/payments/`

| Endpoint | Method | Auth | Access | Notes |
|---|---|---|---|---|
| `/payments/initiate/` | POST | Bearer | Authenticated | Initiate payment for an order |
| `/payments/webhook/<provider>/` | POST | None | Public (webhook) | Receive gateway callbacks |

> **Important:** The Stripe gateway (`apps/payments/gateways/stripe_gateway.py`) contains `NotImplementedError` placeholders. Payment processing is a v2 feature. Do not build admin UI that depends on real payment processing.

#### `dashboard` — `apps/dashboard/`

All endpoints are staff-only (`IsStaffUser`).

| Endpoint | Method | Notes |
|---|---|---|
| `/dashboard/` | GET | Top-level KPIs: revenue, order counts, customer counts, low-stock alerts |
| `/dashboard/analytics/revenue/` | GET | Revenue over time; accepts `?period=` (day/week/month/year) |
| `/dashboard/analytics/orders/` | GET | Order volume over time |
| `/dashboard/analytics/best-sellers/` | GET | Top-selling products by revenue |
| `/dashboard/analytics/customers/` | GET | New customer registrations over time |
| `/dashboard/analytics/inventory/` | GET | Inventory health: total SKUs, low-stock count, out-of-stock count |
| `/dashboard/analytics/coupons/` | GET | Coupon redemption stats |
| `/dashboard/analytics/newsletter/` | GET | Subscriber growth and campaign stats |

#### `exports` — `apps/exports/`

All endpoints are staff-only. Responses are `StreamingHttpResponse` (CSV) or `HttpResponse` (XLSX). Accept `?format=csv` (default) or `?format=xlsx`. The `format` query param is consumed by the view itself — **not** by DRF's content negotiation (`URL_FORMAT_OVERRIDE = None` in test settings).

| Endpoint | Method | Filters | Notes |
|---|---|---|---|
| `/exports/products/` | GET | `status`, `category`, `brand` | CSV/XLSX product catalog |
| `/exports/orders/` | GET | `status`, `payment_status`, `date_from`, `date_to` | CSV/XLSX order list |
| `/exports/customers/` | GET | `is_active`, `is_staff` | CSV/XLSX customer accounts |
| `/exports/subscribers/` | GET | `active` | CSV/XLSX newsletter subscribers |
| `/exports/reviews/` | GET | `is_approved`, `min_rating`, `max_rating` | CSV/XLSX product reviews |
| `/exports/inventory/` | GET | `low_stock_only`, `out_of_stock_only` | CSV/XLSX stock items |

> XLSX export requires `openpyxl`. If not installed, the server returns HTTP 501 with a plain-text message.

#### `search` — `apps/search/`

| Endpoint | Method | Auth | Notes |
|---|---|---|---|
| `/search/` | GET | Public | Global full-text search; `?q=` query param; returns matched products, categories, brands |

#### `uploads` — `apps/uploads/`

| Endpoint | Method | Auth | Notes |
|---|---|---|---|
| `/uploads/` | POST | **Staff only** | Centralised `multipart/form-data` file upload; returns `{ url, filename }` |

#### `wishlist` — `apps/wishlist/`

Wishlist is storefront-only. Not used by the admin panel.

#### `contact` — `apps/contact/`

| Endpoint | Method | Auth | Access | Notes |
|---|---|---|---|---|
| `/contact/` | POST | None | Public | Submit a contact message |
| `/contact/admin/messages/` | GET | Bearer | **Staff only** | Paginated list of all contact messages |
| `/contact/admin/messages/<pk>/` | GET / PATCH / DELETE | Bearer | **Staff only** | Single message detail / update / delete |
| `/contact/admin/messages/<pk>/resolve/` | POST | Bearer | **Staff only** | Mark message as resolved |
| `/contact/admin/messages/<pk>/mark-new/` | POST | Bearer | **Staff only** | Reopen a resolved message |

### 6.3 Missing or incomplete admin endpoints

The following functionality still has no admin REST endpoint. Do not build admin UI for these without first adding backend support:

- **Warehouse CRUD** — `GET /inventory/warehouses/` lists warehouses; there is no create/update/delete endpoint.
- **Order refund processing** — no refund endpoint exists.
- **Customer address management by staff** — staff cannot view or edit customer address books via the REST API.
- **Newsletter campaign send-log / delivery receipts** — campaigns can be sent but delivery tracking has no endpoint.

Previously listed gaps that are now resolved (endpoints exist):
- ✅ Contact admin inbox — `GET/PATCH/DELETE /contact/admin/messages/<pk>/`, resolve/mark-new actions
- ✅ Product variant CRUD — `GET/POST/PATCH/DELETE /catalog/admin/products/<slug>/variants/`
- ✅ Product image management — `GET/POST/PATCH/DELETE /catalog/admin/products/<slug>/images/`
- ✅ Banner CRUD — `GET/POST/PATCH/DELETE /catalog/admin/banners/<pk>/`
- ✅ Dashboard analytics — full suite under `/dashboard/analytics/*`
- ✅ Data exports — CSV/XLSX for all major entities under `/exports/`
- ✅ Global search — `GET /search/?q=`
- ✅ File uploads — `POST /uploads/`
- ✅ Stock threshold management — `PATCH /inventory/stock/<pk>/threshold/`
- ✅ Manual stock adjustments — `POST /inventory/stock/<pk>/adjust/`
- ✅ Stock movement history — `GET /inventory/stock/<pk>/movements/`

---

## 7. Authentication

### 7.1 Token storage

| Token | Storage | Key |
|---|---|---|
| Access token | **JavaScript memory only** (`let accessToken`) | n/a |
| Refresh token | `localStorage` | `shopcore-refresh-token` |

The access token is never written to storage. It lives in the closure variable `accessToken` inside `axiosClient.ts`. On page load, `AuthContext` reads the refresh token from `localStorage`, calls `/accounts/token/refresh/` to get a fresh access token, then calls `/accounts/me/` to hydrate the user.

### 7.2 Login flow

```
User submits email + password
  → POST /accounts/login/
  → Response: { access, refresh, user }
  → setAccessToken(access)          // in-memory only
  → localStorage.setItem('shopcore-refresh-token', refresh)
  → setUser(user)
```

### 7.3 Token refresh flow

Refresh happens in two places:

1. **On page load** (`AuthContext.bootstrap`): reads refresh token from localStorage, calls `/accounts/token/refresh/`, gets new access token. If this fails, user is considered logged out.

2. **On 401 response** (`axiosClient.ts` interceptor): when any API call returns 401, the interceptor calls `attemptRefresh()`. Multiple simultaneous 401s share a single refresh promise (`refreshPromise` deduplication) to avoid race conditions. If refresh fails with 400/401, `RefreshTokenExpiredError` is thrown, access token and localStorage are cleared, and `auth:session-expired` custom event is dispatched.

JWT settings (backend): access token lifetime 15 minutes, refresh 7 days, `ROTATE_REFRESH_TOKENS=True`, `BLACKLIST_AFTER_ROTATION=True`. Rotating means every successful refresh invalidates the old refresh token and issues a new one. The new refresh token is written back to localStorage when present in the response.

### 7.4 Logout flow

```
AuthContext.logout()
  → setAccessToken(null)
  → localStorage.removeItem('shopcore-refresh-token')
  → setUser(null)
  → queryClient.removeQueries(['auth'], ['current-user'])
  → POST /accounts/logout/ { refresh }  // blacklists the token server-side
```

### 7.5 Route guards

**`AdminOnlyRoute`** (`src/routes/AdminOnlyRoute.tsx`):
- Shows a full-screen spinner while `isLoading` is true
- Redirects to `/login` if `!isAuthenticated`
- Redirects to `/unauthorized` if `!user?.is_staff`

**`PublicOnlyRoute`** (`src/routes/PublicOnlyRoute.tsx`):
- Redirects authenticated users away from `/login`

All protected admin routes are wrapped in `AdminOnlyRoute` inside `router.tsx`. The auth guard checks `user.is_staff` — regular customers can log in but are redirected to `/unauthorized`.

### 7.6 Session expiry

When `auth:session-expired` fires (dispatched by the axios interceptor), `AuthContext` clears the user and access token but does **not** navigate. The next route guard check will redirect to `/login`. The login page passes `state.from` so users are redirected back after re-login.

### 7.7 `useAuth` hook

```ts
const { user, isAuthenticated, isLoading, login, logout } = useAuth()
```

Must be called inside `AuthProvider`. Throws if called outside context.

---

## 8. UI and UX Conventions

These are non-negotiable rules. Violating them creates inconsistency with the established design language.

### 8.1 Icons, never emojis

All icons in UI must come from **Lucide React** (`lucide-react`). Never use emoji characters (🏷️, 📦, ✅, etc.) in any rendered UI. This includes stat chips, badges, labels, empty states, and table cells. Import named icons:

```ts
import { Package, CheckCircle, AlertTriangle } from 'lucide-react'
```

### 8.2 Empty states

Use the `EmptyState` component (`src/components/feedback/EmptyState.tsx`) for all empty lists and zero-result searches. Do not render a blank area or a bare text message.

### 8.3 Loading states

Use the `Skeleton` component (`src/components/feedback/Skeleton.tsx`) for content areas while data is loading. Use `Spinner` only for full-page or modal loading indicators. Never show raw "Loading…" text.

### 8.4 Forms

All forms use **React Hook Form** + **Zod** via `zodResolver`. Form field wrappers use `FormField` + `Input`/`Select`/`Textarea` components. Do not use uncontrolled inputs or raw `<form>` elements.

Server-side field errors (from DRF) are applied using `applyServerErrors()` from `axiosClient.ts`:

```ts
import { applyServerErrors } from '@/services/api/axiosClient'
// In onError callback:
const err = error as ApiError
applyServerErrors(form.setError, err.fieldErrors)
```

Avoid placeholder values that could be accidentally submitted (e.g. `placeholder="0.00"` on a price field when the value defaults to `"0.00"`). Use `undefined` or `""` as defaults so validation catches empty submissions.

### 8.5 Spacing and radius

Use tokens for all spacing and radius decisions:
- Cards/panels: `rounded-2xl` (`--radius-xl: 24px`) with `border border-border bg-surface shadow-xs`
- Inputs, buttons: `rounded-xl` (`--radius-lg: 20px`) or `rounded-lg` (`--radius-md: 12px`)
- Badges, chips: `rounded-full`
- Never use arbitrary pixel values for border-radius

### 8.6 Search overlays

The `GlobalSearch` component (`src/components/ui/GlobalSearch.tsx`) opens as a modal overlay. It must:
- Close on `Escape`
- Trap focus while open
- Have a visible close button
- Support keyboard navigation (arrow keys, Enter)

These are already implemented. Do not remove them when modifying `GlobalSearch`.

### 8.7 Sidebar behaviour

`AdminLayout` has a collapsible sidebar:
- **Desktop:** collapses to icon-only rail via toggle button
- **Mobile:** slides in as a drawer, closes on Escape and on backdrop click

The Escape handler is wired in `AdminLayout` via `useEffect`. The mobile drawer state is `mobileOpen` (boolean).

### 8.8 Charts and data

All charts (Recharts) must use real data from the API. Never hard-code fake numbers. If data is loading, render a skeleton. If data is unavailable, render an `EmptyState`. Dashboard and analytics stat cards display live values or `'—'` as a fallback.

### 8.9 Toasts

Use `useToast()` from `ToastContext` for all user-facing feedback after mutations. Pattern:

```ts
const { toast } = useToast()
// On success:
toast({ title: 'Saved', description: 'Changes saved.', variant: 'success' })
// On error:
toast({ title: 'Error', description: err.message, variant: 'destructive' })
```

### 8.10 Confirmation dialogs

Use `ConfirmDialog` (`src/components/ui/ConfirmDialog.tsx`) for any destructive action (delete, status change, bulk operation). Never rely solely on browser `confirm()`.

### 8.11 Error normalisation

All API errors are normalised to `ApiError` by `axiosClient.ts`. Type:

```ts
interface ApiError {
  status: number
  message: string
  code?: string
  fieldErrors?: Record<string, string[]>
}
```

Catch errors as `error as ApiError` in mutation `onError` callbacks. Display `error.message` in toasts.

---

## 9. Page and Feature Map

### 9.1 Admin UI components

```
src/components/ui/
  Avatar.tsx           # User avatar (initials fallback)
  Badge.tsx            # Status badge — variants: secondary, success, danger, warning, info
  Breadcrumbs.tsx      # Breadcrumb nav
  Button.tsx           # Primary button — uses CVA variants
  Card.tsx             # Card + CardTitle wrapper
  ConfirmDialog.tsx    # Destructive action confirmation modal
  DataTable.tsx        # Generic sortable table with column definitions
  FormField.tsx        # Label + input wrapper with error display
  GlobalSearch.tsx     # Cmd+/ search overlay (local nav + API deep-links)
  IconButton.tsx       # Icon-only button
  Input.tsx            # Text input
  Modal.tsx            # Radix Dialog wrapper
  Pagination.tsx       # Page controls for paginated lists
  SearchBar.tsx        # Inline search input
  Select.tsx           # Native select with styled wrapper
  StatCard.tsx         # Dashboard metric card
  Tabs.tsx             # Tab bar
  Textarea.tsx         # Multi-line text input
```

### 9.2 Pages

| Route | Page Component | Backend endpoint(s) | Status |
|---|---|---|---|
| `/` | `DashboardPage` | `/orders/admin/stats/`, `/newsletter/admin/stats/`, `/inventory/stock/` | ✅ Real data |
| `/catalog/products` | `ProductsPage` | `GET /catalog/admin/products/` (list + filter by status) | ✅ Full CRUD |
| `/catalog/products/:slug` | `ProductDetailPage` | `GET/PATCH /catalog/admin/products/<slug>/` | ✅ Real data (fetches draft/archived) |
| `/catalog/categories` | `CategoriesPage` | `GET/POST/PATCH/DELETE /catalog/admin/categories/` | ✅ Full CRUD |
| `/catalog/brands` | `BrandsPage` | `GET/POST/PATCH/DELETE /catalog/admin/brands/` | ✅ Full CRUD |
| `/catalog/inventory` | `InventoryPage` | `GET /inventory/stock/`, `POST /inventory/stock/<pk>/restock/` | ✅ Real data |
| `/orders` | `OrdersPage` | `GET /orders/admin/` | ✅ Real data |
| `/orders/:orderNumber` | `OrderDetailPage` | `GET /orders/<order_number>/`, `POST /orders/<order_number>/transition/` | ✅ Real data |
| `/customers` | `CustomersPage` | `GET /accounts/admin/users/` | ✅ Real data |
| `/customers/:id` | `CustomerDetailPage` | `GET /accounts/admin/users/<id>/`, `GET /orders/admin/?search=email` | ✅ Real data |
| `/coupons` | `CouponsPage` | `GET/POST/PATCH/DELETE /coupons/` | ✅ Full CRUD |
| `/reviews` | `ReviewsPage` | `GET/PATCH/DELETE /reviews/admin/` | ✅ Real data |
| `/marketing` | `MarketingPage` | `/newsletter/admin/*` (campaigns, subscribers, stats) | ✅ Real data |
| `/analytics` | `AnalyticsPage` | `/orders/admin/stats/`, `/newsletter/admin/stats/` | ✅ Real data |
| `/notifications` | `NotificationsPage` | `/notifications/`, `/notifications/read-all/` | ✅ Real data |
| `/settings` | `SettingsPage` | `/accounts/me/change-password/` | ✅ Real data |
| `/login` | `LoginPage` | `/accounts/login/` | ✅ |

> **File encoding note:** `AnalyticsPage.tsx` was written with Windows CRLF (`\r\n`) line endings. If the Edit tool fails silently on this file, normalise line endings first: `python3 -c "p='frontend-admin/src/pages/analytics/AnalyticsPage.tsx'; open(p,'wb').write(open(p,'rb').read().replace(b'\r\n',b'\n'))"`.

### 9.3 `ProductStatus` values

```ts
type ProductStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
```

`ACTIVE` does not exist. Any code using `ACTIVE` is a bug. This appears in: Zod schemas, `statusConfig` records, `STATUS_TABS` arrays, and any switch/case over status.

---

## 10. Services and Data Flow

### 10.1 Axios client (`src/services/api/axiosClient.ts`)

- Base URL: `env.apiBaseUrl` (defaults to `/api`, which the Vite proxy translates to `/api/v1`)
- Timeout: 15 seconds
- Request interceptor: attaches `Authorization: Bearer <accessToken>` header
- Response interceptor: handles 401 → silent token refresh → retry, normalises all errors to `ApiError`
- Exports: `axiosClient`, `setAccessToken`, `getAccessToken`, `tokenStorage`, `applyServerErrors`

### 10.2 Endpoints registry (`src/services/api/endpoints.ts`)

All backend URL paths are defined here as functions. Groups: `auth`, `catalog`, `orders`, `inventory`, `customers`, `reviews`, `coupons`, `newsletter`, `notifications`, `dashboard`, `exports`, `search`, `uploads`, `contact`.

**Never** construct URL strings inline. Add to `endpoints.ts` first.

### 10.3 Service files

Each domain has a service file in `src/services/api/`. Services are plain objects with async methods that call `axiosClient` and return typed data. They do not use React hooks.

```ts
// Pattern for every service method:
async listSomething(params?: SomeParams): Promise<PaginatedResponse<Something>> {
  const res = await axiosClient.get<PaginatedResponse<Something>>(endpoints.something.list(), { params })
  return res.data
}
```

Existing service files:
- `auth.service.ts` — login, logout, me, changePassword
- `catalog.service.ts` — public + admin products, categories, brands, variants, images, banners
- `customers.service.ts` — admin user list/detail
- `inventory.service.ts` — stock list, restock, threshold, adjust, movements, warehouses
- `orders.service.ts` — admin order list, stats, detail, transition
- `reviews.service.ts` — admin review list/detail/approve
- `coupons.service.ts` — coupon CRUD
- `newsletter.service.ts` — campaigns, subscribers, stats
- `dashboard.service.ts` — KPI overview, all analytics sub-routes
- `exports.service.ts` — CSV/XLSX download helpers
- `search.service.ts` — global search
- `contact.service.ts` — admin message inbox

### 10.4 TanStack Query usage pattern

```ts
// Queries
const { data, isLoading, error } = useQuery({
  queryKey: ['unique-key', param],
  queryFn: () => someService.list(param),
  staleTime: 60_000,  // optional cache time in ms
})

// Mutations
const mutation = useMutation({
  mutationFn: (data: FormData) => someService.create(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['unique-key'] })
    toast({ title: 'Created', variant: 'success' })
  },
  onError: (error) => {
    const err = error as ApiError
    toast({ title: 'Error', description: err.message, variant: 'destructive' })
    applyServerErrors(form.setError, err.fieldErrors)
  },
})
```

`queryClient.ts` configures `retry: 1`, `staleTime: 30_000`.

### 10.5 Debounce

```ts
import { useDebounce } from '@/utils/useDebounce'

const [search, setSearch] = useState('')
const debouncedSearch = useDebounce(search, 400)  // 400ms debounce
```

`useDebounce` is in `src/utils/useDebounce.ts` (not `src/hooks/`).

### 10.6 Pagination

Backend uses DRF's `PageNumberPagination`. Response shape:

```ts
interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
```

Pass `{ page: currentPage, page_size: 20 }` as query params. Use the `Pagination` component from `src/components/ui/Pagination.tsx`.

### 10.7 Utility functions

- `cn(...classes)` — `src/utils/cn.ts` — merges Tailwind classes (wraps `clsx` + `tailwind-merge`)
- `formatCurrency(value, currency?)` — `src/utils/format.ts` — formats price strings
- `formatDate(isoString)` — `src/utils/format.ts` — human-readable dates

### 10.8 Data normalisation notes

- `Product.category` and `Product.brand` are **integer IDs** (not nested objects) when returned from admin endpoints. The `_name` suffix fields (`category_name`, `brand_name`) provide display strings.
- `Product.images` may be absent from admin list responses (only available on the detail endpoint). Always use optional chaining: `product.images?.[0]?.image`.
- Order amounts (`subtotal`, `grand_total`, etc.) are **strings** from the backend (Django `DecimalField`). Use `parseFloat()` before arithmetic or pass directly to `formatCurrency()`.

---

## 11. Backend Change Policy

### 11.1 Before writing any new code

1. **Check if the endpoint exists.** Read the relevant `apps/*/urls.py` and `apps/*/views.py`. The OpenAPI schema at `/api/docs/` can also help if the server is running.
2. **Check if the serializer supports the fields you need.** Read `apps/*/serializers.py`.
3. **Check existing permissions.** Look for `permission_classes` on the view. Admin views use `IsStaffUser` (a custom permission in `apps/common/`).

### 11.2 Adding backend support

When the admin needs functionality that doesn't exist yet:

1. Add the view to `apps/<app>/views.py`
2. Add the URL to `apps/<app>/urls.py`
3. Add the serializer to `apps/<app>/serializers.py` if needed
4. Use `IsStaffUser` (not `IsAdminUser` which checks `is_superuser`) for staff-only views
5. Keep admin-specific views in a clearly separated block in `views.py` and `urls.py`
6. Run `python manage.py check` — must return 0 issues

### 11.3 Preserving storefront compatibility

- Never modify public serializers (those used by storefront views) to add admin-only fields. Create separate admin serializers.
- Never change the slug-based public URL patterns for categories, brands, or products.
- Never change `ProductManager`'s default behaviour — it filters `is_active=True`. The admin views use `Product.objects.all()` to see all records.

### 11.4 Do not invent fake APIs

If an endpoint doesn't exist, do not mock its response in the service layer. Build the real endpoint or mark the feature as unimplemented. The admin must never show fabricated production data.

---

## 12. What Future AI Must Not Do

- **Do not rewrite the project from scratch.** The structure, stack, and patterns are established. Extend them.
- **Do not change the frontend stack.** No Redux, no Zustand, no CSS-in-JS, no different HTTP client, no different form library.
- **Do not break `frontend-store`.** It is a separate Vite project. Admin changes have no effect on it, but if you touch shared Django apps, keep public endpoints backward compatible.
- **Do not add mock or placeholder data to production code.** No `Math.random()`, no hardcoded fake stats, no `// TODO: replace with real data` that gets committed.
- **Do not use deprecated dependency workarounds.** No `// eslint-disable`, no `@ts-ignore`, no monkey-patching third-party types unless there is no other option.
- **Do not ignore the design tokens.** Never hardcode `#3B82F6` or `#10B981` or `12px` in component files. Always use `hsl(var(--primary))`, `var(--radius-md)`, etc.
- **Do not submit placeholder form values.** Form field defaults must be empty strings or `undefined`, not `"0"` or `"placeholder"`.
- **Do not assume an endpoint exists without checking** `apps/*/urls.py`. The known gap list in §6.3 is accurate as of July 2026 but may be stale.
- **Do not use `ACTIVE` as a product status.** The correct value is `PUBLISHED`.
- **Do not call public catalog endpoints from the admin for write operations.** Public endpoints are GET-only and slug-based. All admin writes go to `/catalog/admin/*`.
- **Do not hardcode `localhost:8000` in frontend code.** All API calls go through `axiosClient` which uses `env.apiBaseUrl`. Shell commands and `curl` may use `$REPLIT_DEV_DOMAIN` for debugging.
- **Do not create duplicate workflows.** Before adding a new Replit workflow, check whether one already exists for that service (Django backend on port 8000, Vite store on port 3000, Vite admin on port 5000).

---

## 13. Known Good Files

When starting work on any area, inspect these files first:

### Root config
- `config/urls.py` — all API routes
- `config/settings/base.py` — JWT config, installed apps, auth settings
- `.env.example` — all environment variables

### Frontend admin
- `frontend-admin/package.json` — exact dependency versions
- `frontend-admin/vite.config.ts` — proxy config, aliases, chunk splitting
- `frontend-admin/tsconfig.json` — TypeScript config, path aliases
- `frontend-admin/src/styles/tokens.css` — all design tokens
- `frontend-admin/src/styles/globals.css` — base styles, scrollbar, utility classes
- `frontend-admin/src/config/env.ts` — typed env wrapper
- `frontend-admin/src/services/api/endpoints.ts` — all endpoint paths
- `frontend-admin/src/services/api/axiosClient.ts` — HTTP client, auth headers, refresh logic, error normalisation
- `frontend-admin/src/contexts/AuthContext.tsx` — auth state, login, logout, session bootstrap
- `frontend-admin/src/routes/AdminOnlyRoute.tsx` — route guard (checks `user.is_staff`)
- `frontend-admin/src/app/router.tsx` — all routes, lazy imports, Suspense boundaries
- `frontend-admin/src/layouts/AdminLayout.tsx` — sidebar, topnav, mobile drawer
- `frontend-admin/src/types/models.ts` — all domain model types
- `frontend-admin/src/types/api.ts` — `ApiError`, `PaginatedResponse`
- `frontend-admin/src/pages/DashboardPage.tsx` — reference for stat card + chart patterns
- `frontend-admin/src/pages/catalog/ProductsPage.tsx` — reference for full CRUD page pattern
- `frontend-admin/src/services/api/catalog.service.ts` — reference for service layer patterns

### Frontend store (reference implementation)
- `frontend-store/src/styles/tokens.css` — compare token values with admin
- `frontend-store/src/services/api/axiosClient.ts` — same pattern as admin

### Backend
- `apps/catalog/views.py` — reference for admin view + permission patterns
- `apps/catalog/serializers.py` — reference for admin vs public serializer separation
- `apps/common/permissions.py` — `IsStaffUser` definition
- `apps/accounts/models.py` — `User` model, `is_staff` flag

---

## 14. Production Readiness Notes

### 14.1 Running locally

```bash
# Terminal 1 — Django backend
DJANGO_SETTINGS_MODULE=config.settings.development python manage.py runserver 0.0.0.0:8000

# Terminal 2 — Admin frontend
cd frontend-admin && npm run dev
```

The Vite dev server listens on port 5000 (`host: '0.0.0.0'`, `allowedHosts: true`). The proxy rewrites `/api/*` → `http://localhost:8000/api/v1/*`.

Database migrations: `python manage.py migrate`

Create a staff user: `python manage.py createsuperuser` (sets `is_staff=True` and `is_superuser=True`).

### 14.2 Before deployment

| Item | Requirement |
|---|---|
| `SECRET_KEY` | Must be a strong random value (≥50 chars). Never use the insecure dev placeholder. |
| `DATABASE_URL` | Must point to a production PostgreSQL instance. SQLite is not supported. |
| `ALLOWED_HOSTS` | Must include the production hostname(s). |
| `CORS_ALLOWED_ORIGINS` | Must include the admin panel's production origin. |
| `FRONTEND_URL` | Must be the public storefront URL (used in emails). |
| `MEDIA_STORAGE` | Must be `s3`, `gcs`, or `r2` for persistent storage (not `local` on ephemeral containers). |
| `SECURE_SSL_REDIRECT=True` | Ensure HTTPS is enforced. |
| `collectstatic` | Run `python manage.py collectstatic --noinput` before starting Django. |
| `migrate` | Run `python manage.py migrate` before starting Django. |

### 14.3 Production API base URL for the admin frontend

If the admin is deployed to the same domain as the API (same-origin):
- Leave `VITE_API_BASE_URL` unset (or set to `/api`)
- The reverse proxy must rewrite `/api/*` → `/api/v1/*`

If the admin is on a different origin from the API (e.g. `admin.shop.example.com` calling `api.shop.example.com`):
- Set `VITE_API_BASE_URL=https://api.shop.example.com/api/v1` at build time
- Add `https://admin.shop.example.com` to `CORS_ALLOWED_ORIGINS` on the backend

### 14.4 Required backend services

| Service | Required | Notes |
|---|---|---|
| PostgreSQL | ✅ Yes | `select_for_update()` and `to_tsvector()` require Postgres |
| Redis | Recommended | Used for category tree cache. App works without it (cache falls back to no-op) but will be slower |
| SMTP server | For email features | Password reset and verification emails won't deliver without it |
| Object storage (S3/GCS/R2) | For production | Required for persistent media uploads |
| Stripe | For payments | v1 is stubbed; integrate in v2 |

### 14.5 Health check

There is no dedicated `/health/` endpoint. Use `GET /api/docs/` (OpenAPI schema) or `GET /api/v1/catalog/categories/` (public, no auth) as a lightweight liveness check.
