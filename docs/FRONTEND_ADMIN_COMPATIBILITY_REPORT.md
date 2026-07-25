# ShopCore Frontend Admin Compatibility Report

**Milestone:** 1 — inspection and compatibility assessment  
**Date:** 2026-07-25  
**Scope:** `frontend-store/`, Django/DRF backend, and the proposed `frontend-admin/`

## Executive summary

ShopCore has a mature customer-facing React application in `frontend-store/` and a
Django REST API in the repository root. The proposed `frontend-admin/` directory
does not currently exist, despite the project brief describing it as an empty
project.

The store frontend is a suitable source of truth for the admin application's
technology, authentication, API client, data-fetching, design tokens, feedback
patterns, and base UI primitives. The admin shell can be built as a second Vite
application without changing the store application.

The current backend, however, exposes only a small staff REST surface. Most
administrative domains currently require Django Admin at `/admin/` rather than
the custom React application. Building functional admin pages for those domains
will require backend REST endpoints before or alongside the corresponding UI
milestones. The frontend must not use mock data to hide those gaps.

## Repository findings

### Actual project layout

- Backend: Django project at the repository root.
- Customer frontend: `frontend-store/`.
- Proposed admin frontend: absent.
- Backend API prefix: `/api/v1/`.
- Django Admin: `/admin/`.
- OpenAPI schema and documentation:
  - `/api/schema/`
  - `/api/docs/`
  - `/api/redoc/`

The root `README.md` and `DEPLOYMENT.md` refer to a `frontend/` directory in
several commands, but the actual customer application is `frontend-store/`.
Future documentation and workflows should use the actual directory name unless
the repository is intentionally renamed.

## Frontend source of truth

### Stack and configuration

`frontend-admin` should match these versions and conventions:

- React 19
- Vite 5
- TypeScript 5
- Tailwind CSS 3
- TanStack Query v5
- Axios
- React Router 6
- Radix UI primitives
- Lucide React
- Framer Motion
- React Hook Form and Zod
- `@` path alias mapped to `src/`

Reference configuration:

- `frontend-store/package.json`
- `frontend-store/vite.config.ts`
- `frontend-store/tsconfig.json`
- `frontend-store/tsconfig.app.json`
- `frontend-store/tsconfig.node.json`
- `frontend-store/tailwind.config.ts`
- `frontend-store/postcss.config.js`
- `frontend-store/.eslintrc.cjs`
- `frontend-store/.prettierrc`
- `frontend-store/.env.example`

The Vite development server listens on port `5000`, allows proxied hosts, and
proxies `/api` to the Django server at `http://localhost:8000`, rewriting
`/api` to `/api/v1`. It also proxies `/media` to the backend. The admin app
should use the same same-origin API approach and a distinct development port
when both frontends are run at once.

### Provider composition

Reference: `frontend-store/src/app/providers.tsx`.

The existing provider hierarchy is:

1. `HelmetProvider`
2. `QueryClientProvider`
3. `ThemeProvider`
4. `AuthProvider`
5. Store-specific `CartUIProvider`
6. `ToastProvider`

The admin should reuse the common providers and omit store-only cart state. The
shared query defaults are in `frontend-store/src/app/queryClient.ts`:

- 30-second query stale time
- 5-minute garbage-collection time
- no retries for 4xx errors
- up to two retries for other failures
- refetch on window focus
- mutations do not retry

### Authentication and authorization

Reference files:

- `frontend-store/src/contexts/AuthContext.tsx`
- `frontend-store/src/services/api/axiosClient.ts`
- `frontend-store/src/services/api/auth.service.ts`
- `frontend-store/src/routes/ProtectedRoute.tsx`
- `frontend-store/src/routes/PublicOnlyRoute.tsx`

The existing authentication flow should be reused:

- JWT access token is held in memory.
- Refresh token is stored through the existing `tokenStorage` abstraction.
- Axios attaches the Bearer access token.
- Concurrent 401 responses share one refresh request.
- Rotated refresh tokens are persisted immediately.
- Definitive refresh failure dispatches `auth:session-expired`.
- Logout clears auth-scoped query cache while preserving public catalog cache.

The store's `ProtectedRoute` checks authentication only. The `User` type in
`frontend-store/src/types/models.ts` also does not expose `is_staff`,
`is_superuser`, groups, or permissions. The admin therefore needs a
role/staff-aware guard, but it must be based on the backend's existing
permission model (`is_staff`) rather than an invented frontend-only role.
The `/api/v1/accounts/me/` response and/or a dedicated staff-me endpoint must
provide the data required for that guard.

### Routing and application structure

References:

- `frontend-store/src/app/router.tsx`
- `frontend-store/src/routes/routeConfig.ts`
- `frontend-store/src/constants/routes.ts`
- `frontend-store/src/layouts/`
- `frontend-store/src/pages/`

The store uses `createBrowserRouter`, centralized route metadata, lazy page
imports, route-level `Suspense`, and a router error boundary. Admin should
follow the same pattern with:

- a public login route;
- an authentication guard;
- a staff/role guard;
- an admin shell layout;
- lazy-loaded business pages;
- explicit loading, not-found, server-error, offline, and unauthorized states.

### API and service layer

References:

- `frontend-store/src/services/api/axiosClient.ts`
- `frontend-store/src/services/api/endpoints.ts`
- `frontend-store/src/services/api/normalizers.ts`
- `frontend-store/src/services/api/*.service.ts`
- `frontend-store/src/services/queryKeys.ts`
- `frontend-store/src/types/api.ts`
- `frontend-store/src/types/models.ts`

The admin should use the same Axios behavior and service-oriented API boundary.
Endpoint paths are centralized in `endpoints.ts`; normalizers translate DRF
responses into stable frontend models; React Query hooks own cache and mutation
invalidation.

Existing service modules that are directly reusable or structurally relevant:

- `auth.service.ts`
- `orders.service.ts`
- `profile.service.ts`
- `reviews.service.ts`
- `coupons.service.ts`
- `newsletter.service.ts`
- `notifications.service.ts`
- `contact.service.ts`

The existing API error shape and `applyServerErrors` helper in
`axiosClient.ts` should remain the standard for form errors and server feedback.

### Design system and theme

References:

- `frontend-store/src/styles/tokens.css`
- `frontend-store/src/styles/globals.css`
- `frontend-store/src/styles/animations.css`
- `frontend-store/src/contexts/ThemeContext.tsx`
- `frontend-store/src/utils/cn.ts`
- `frontend-store/tailwind.config.ts`

The design system is token-based:

- HSL CSS variables for surfaces, borders, text, brand, status, and focus states.
- Tailwind aliases map to the CSS variables.
- `darkMode: 'class'`.
- `ThemeContext` supports light, dark, and system modes.
- `data-brand` supports ShopCore, green, purple, and pink themes.
- Inter Variable is the primary font.
- Shared radius, shadow, motion, typography, and status scales are already
  defined.

The admin should copy/use these tokens rather than introduce a parallel theme.
Its sidebar, topbar, cards, tables, and status badges should be composed from
the existing token vocabulary and shared UI primitives.

### Reusable UI, feedback, and form patterns

Reusable base components are in `frontend-store/src/components/`:

- UI primitives: `Button`, `Input`, `Textarea`, `Select`, `Checkbox`,
  `Switch`, `Slider`, `Tabs`, `Accordion`, `Drawer`, `Modal`, `IconButton`,
  `Avatar`, `Badge`, `Tag`, `Card`, `Breadcrumbs`, `Pagination`,
  `ProgressBar`, and `Tooltip`.
- Feedback: `Spinner`, `Skeleton`, `EmptyState`, `ErrorState`,
  `ErrorBoundary`, and `ToastProvider`.
- Layout: `PageContainer` and responsive image helpers.

Forms use React Hook Form with Zod schemas. Existing conventions are in:

- `frontend-store/src/utils/validators.ts`
- `frontend-store/src/components/ui/FormField.tsx`
- form components under `frontend-store/src/features/` and `frontend-store/src/pages/`

The admin can reuse these primitives, but it needs new admin-specific patterns
for dense data tables, row selection, bulk actions, file uploads, and possibly
rich text. Those should be added only when a real admin milestone requires
them, and should follow the existing CVA, `cn`, modal, toast, loading, and
error conventions.

## Backend compatibility inventory

### Global authentication and permissions

- Authentication: `rest_framework_simplejwt.authentication.JWTAuthentication`.
- Global default permission: `IsAuthenticated`.
- `apps.common.permissions.IsStaffUser`: authenticated users with
  `is_staff=True`.
- `apps.common.permissions.IsAdminOrReadOnly`: public safe-method access and
  staff-only writes, but it is not currently applied to the catalog routes.
- `apps.common.permissions.IsOwner` and `IsOwnerOrReadOnly` protect customer-owned
  objects.

The custom admin must use the existing JWT login/refresh/logout endpoints and
must treat `is_staff` as the backend authorization boundary.

### Existing staff-capable REST endpoints

These are the only clearly staff-capable custom API endpoints identified:

| Endpoint | Method | Permission | Purpose |
|---|---:|---|---|
| `/api/v1/inventory/stock/` | GET | `IsStaffUser` | List stock items |
| `/api/v1/inventory/stock/<pk>/` | GET | `IsStaffUser` | Retrieve a stock item |
| `/api/v1/inventory/stock/<pk>/restock/` | POST | `IsStaffUser` | Restock a stock item |
| `/api/v1/orders/<order_number>/transition/` | POST | `IsStaffUser` | Change order status |

The stock serializer exposes calculated availability (`on_hand - reserved`).
Order serialization includes line-item snapshots and status history, which are
useful for a read-only order detail page.

### Existing customer/public endpoints that may be read by the admin

These endpoints exist but are not admin management APIs:

- Catalog:
  - `GET /api/v1/catalog/banners/`
  - `GET /api/v1/catalog/categories/tree/`
  - `GET /api/v1/catalog/categories/`
  - `GET /api/v1/catalog/categories/<slug>/`
  - `GET /api/v1/catalog/brands/`
  - `GET /api/v1/catalog/brands/<slug>/`
  - `GET /api/v1/catalog/products/`
  - `GET /api/v1/catalog/products/<slug>/`
- Orders:
  - `GET /api/v1/orders/`
  - `GET /api/v1/orders/<order_number>/`
  - `POST /api/v1/orders/<order_number>/cancel/` (customer ownership flow)
- Accounts:
  - `GET|PUT|PATCH /api/v1/accounts/me/`
  - address endpoints under `/api/v1/accounts/addresses/`
- Reviews:
  - `GET /api/v1/reviews/products/<product_slug>/reviews/`
  - customer create and own-review update/delete endpoints
- Notifications:
  - authenticated user's list/detail/read endpoints
- Newsletter:
  - `POST /api/v1/newsletter/subscribe/`
- Coupons:
  - customer-facing coupon application/preview only

These should not be presented as admin CRUD capabilities. In particular,
customer-scoped list endpoints cannot safely be reused to show all customers,
orders, reviews, or notifications.

## Admin capability gaps

The following areas have models and/or Django Admin support but do not have
suitable staff REST endpoints:

| Admin area | Current state | Required before functional UI |
|---|---|---|
| Dashboard and analytics | No aggregate reporting endpoints | Sales, order, customer, and inventory metrics |
| Products | Public read-only catalog API | Staff CRUD, variants, images, and validation |
| Categories and brands | Public read-only catalog API | Staff CRUD and soft-delete behavior |
| Banners/content | Public list only | Staff CRUD and ordering/publishing controls |
| Customers | `/accounts/me/` only | Staff list/detail, account status, and order history |
| Reviews | Public approved list and customer-owned actions | Staff moderation and deletion |
| Coupons | Apply/preview only | Staff CRUD, redemption reporting, and limits |
| Newsletter | Subscribe only | Subscriber management, campaigns, templates, sending, logs, statistics |
| Users, groups, roles, permissions | Django model/admin support only | Staff management API with safe authorization rules |
| Payments/settings | Customer initiation/webhooks and Django settings | Admin visibility and operational controls as required |

The backend already contains serializers such as
`ProductCreateUpdateSerializer` and model/admin registrations for many of these
domains, but their presence does not create a REST route. Before adding a UI
that edits a resource, search the backend and add a properly authenticated
endpoint only when no suitable endpoint exists.

## Recommended milestone order

1. **Admin foundation:** scaffold `frontend-admin` with the store's Vite,
   TypeScript, Tailwind, provider, theme, Axios, query, routing, and feedback
   conventions. Add login, auth bootstrap, staff guard, responsive shell,
   sidebar, topbar, and dark mode. Do not add business pages yet.
2. **Backend authorization contract:** expose the staff identity required by the
   guard, or confirm that the existing `/accounts/me/` response is extended
   safely. Keep all permission decisions server-side.
3. **Dashboard:** add real aggregate endpoints first, then wire dashboard
   widgets to React Query. No mock metrics.
4. **Inventory and read-only orders:** these can use existing staff endpoints,
   with order detail/transition behavior verified against backend serializers.
5. **Catalog, customers, reviews, marketing, coupons, analytics, and settings:**
   implement each API contract before its corresponding management UI.

## Reusable asset index

| Concern | Store source of truth |
|---|---|
| App providers | `frontend-store/src/app/providers.tsx` |
| Query defaults | `frontend-store/src/app/queryClient.ts` |
| JWT client and refresh | `frontend-store/src/services/api/axiosClient.ts` |
| Auth state | `frontend-store/src/contexts/AuthContext.tsx` |
| Theme and brand | `frontend-store/src/contexts/ThemeContext.tsx` |
| Theme tokens | `frontend-store/src/styles/tokens.css` |
| Tailwind aliases | `frontend-store/tailwind.config.ts` |
| API paths | `frontend-store/src/services/api/endpoints.ts` |
| API error mapping | `frontend-store/src/services/api/axiosClient.ts` |
| Models and API types | `frontend-store/src/types/models.ts`, `src/types/api.ts` |
| Shared class utility | `frontend-store/src/utils/cn.ts` |
| Validation | `frontend-store/src/utils/validators.ts` |
| UI primitives | `frontend-store/src/components/ui/` |
| Loading/error/empty states | `frontend-store/src/components/feedback/` |
| Existing service patterns | `frontend-store/src/services/api/` |
| Existing tests and providers | `frontend-store/src/tests/` |

## Milestone 1 conclusion

The codebase is compatible with a second React admin application that shares
ShopCore's visual and technical conventions. The next implementation milestone
can scaffold the admin shell without modifying `frontend-store`. It should not
yet promise full catalog, customer, marketing, analytics, or settings
management until the backend REST gaps above are addressed.