# ShopCore

A full-stack e-commerce platform: production-hardened **Django REST API** backend
paired with a **React / Vite / Tailwind** frontend.

The backend provides every primitive needed for a modern online store: product
catalog with full-text search, cart, idempotent checkout, race-condition-proof
inventory reservation, order lifecycle management, JWT auth with full device
logout, coupons, wishlists, product reviews, and an in-app notification centre.

The frontend is a single-page application with full TypeScript type safety,
React Query data-fetching, a custom design system, and route-level code-splitting.

---

## Status

| Check | Status |
|-------|--------|
| Backend test suite | ✅ 90 / 90 passing |
| `manage.py check` | ✅ 0 issues |
| TypeScript build (`tsc -b`) | ✅ 0 errors |
| Vite production build | ✅ 2 206 modules |
| Critical vulnerabilities | ✅ 0 |
| Pending migrations | ✅ None |

---

## Quick Start

```bash
# ── Backend ────────────────────────────────────────────────────
pip install -r requirements.txt
cp .env.example .env          # set DATABASE_URL at minimum
python manage.py migrate
python manage.py runserver    # API at http://localhost:8000/api/v1/

# ── Frontend ───────────────────────────────────────────────────
cd frontend
pnpm install
pnpm dev                      # UI at http://localhost:3000
```

- Interactive API docs: `http://localhost:8000/api/docs/`
- OpenAPI schema JSON: `http://localhost:8000/api/schema/`
- Run backend tests: `pytest`
- Run frontend type-check: `cd frontend && pnpm tsc -b --noEmit`

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                React / Vite / Tailwind SPA                       │
│   catalog · cart · checkout · account · notifications · reviews  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS  JWT Bearer  /api/v1/
┌───────────────────────────▼─────────────────────────────────────┐
│                    Django / DRF API                              │
│  accounts · catalog · cart · orders · inventory · payments      │
│        coupons · reviews · wishlist · notifications             │
└──────────┬──────────────────────────────┬───────────────────────┘
           │ SQL (psycopg3)               │ Cache (django-redis)
┌──────────▼──────────┐        ┌──────────▼──────────────────────┐
│    PostgreSQL 14+   │        │         Redis 6+                 │
│  primary datastore  │        │  category tree · sessions        │
└─────────────────────┘        └─────────────────────────────────┘
```

See `docs/ARCHITECTURE.md` for the full diagram and `docs/ER_DIAGRAM.md` for
the database schema.

---

## Project Layout

```
shopcore/
├── apps/
│   ├── accounts/       # Users, JWT auth, addresses, password reset
│   ├── catalog/        # Products, categories, brands, variants, attributes
│   ├── cart/           # Session & user carts with guest→user merge
│   ├── orders/         # Checkout, order lifecycle, status history
│   ├── inventory/      # Stock items, warehouse, stock movements
│   ├── payments/       # Payment initiation, webhook ingestion
│   ├── coupons/        # Discount codes with per-user redemption limits
│   ├── reviews/        # Product reviews and ratings
│   ├── wishlist/       # Wishlist with move-to-cart
│   ├── notifications/  # In-app notification centre + transactional email log
│   └── common/         # Shared mixins (TimeStampedModel, SoftDeleteModel)
├── config/
│   ├── settings/
│   │   ├── base.py        # Shared settings
│   │   ├── production.py  # Production overrides + startup guards
│   │   └── test.py        # Test overrides (throttle rates, test DB)
│   ├── urls.py
│   └── wsgi.py
├── docs/
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── ER_DIAGRAM.md
│   └── PRODUCTION_READINESS_AUDIT_*.md
├── frontend/
│   ├── src/
│   │   ├── app/            # Router, providers, App root
│   │   ├── pages/          # Route-level page components
│   │   ├── features/       # Feature-scoped components & hooks
│   │   ├── components/     # Shared UI primitives
│   │   ├── services/       # Axios client, API service modules
│   │   ├── types/          # TypeScript models and API types
│   │   └── utils/          # Formatting, validation helpers
│   ├── public/             # favicon.svg, logo.svg, placeholder-product.svg
│   ├── vite.config.ts
│   └── tsconfig.app.json
├── .env.example
├── CHANGELOG.md
├── DEPLOYMENT.md
└── requirements.txt
```

---

## Key Design Decisions

### Race-condition-proof inventory
Stock reservation and commitment use `select_for_update(nowait=True)` inside
`transaction.atomic()`. An order can only be placed if stock can be reserved
atomically. Partial failures roll back the entire transaction.

### Idempotent checkout
Every checkout request includes a client-supplied `idempotency_key`. A
`(user, idempotency_key)` unique constraint on `Order` means retrying a failed
network request returns the original order rather than creating a duplicate.

### JWT with full device logout
`ROTATE_REFRESH_TOKENS = True` and `BLACKLIST_AFTER_ROTATION = True` are
enabled. Changing or resetting a password calls `blacklist_all_refresh_tokens(user)`,
which blacklists every `OutstandingToken` for that user — all devices are signed
out immediately.

### Soft deletes on catalog entities
`Category`, `Brand`, and `Product` extend `SoftDeleteModel`. Deleting them sets
`deleted_at` rather than removing the row, preserving referential integrity for
historical orders.

### Canonical URL routing (frontend)
Category browsing uses a single URL structure: `/products/category/:slug`.
Old `/category/:slug` paths are redirected permanently. A single
`ProductListPage` handles both the all-products and category-filtered views.

### Defensive data layer (frontend)
All date-formatting utilities (`formatRelativeDate`, `formatDate`) accept
`string | Date | null | undefined` and never throw. React Router routes have
an `errorElement` so component crashes show a friendly error page rather than
a raw stack trace.

---

## API Summary

Full documentation is in `docs/API.md`. Key endpoint groups:

| Prefix | Description | Auth |
|--------|-------------|------|
| `/api/v1/accounts/` | Register, login, logout, profile, password, addresses | Mixed |
| `/api/v1/catalog/` | Products, categories, brands, full-text search | Public |
| `/api/v1/cart/` | Cart management, coupon application | Required |
| `/api/v1/orders/` | Checkout, order history, cancellation | Required |
| `/api/v1/inventory/` | Stock management | Staff only |
| `/api/v1/payments/` | Initiate payment, webhooks | Mixed |
| `/api/v1/coupons/` | Apply discount codes | Required |
| `/api/v1/reviews/` | Product reviews and ratings | Mixed |
| `/api/v1/wishlist/` | Wishlist management | Required |
| `/api/v1/notifications/` | In-app notification centre, mark read | Required |

---

## Running in Production

See `DEPLOYMENT.md` for complete instructions. The short version:

```bash
export DJANGO_SETTINGS_MODULE=config.settings.production

# Backend (required env: SECRET_KEY, DATABASE_URL, EMAIL_URL)
gunicorn config.wsgi:application \
  --workers 4 --threads 2 \
  --worker-class gthread \
  --timeout 30 \
  --bind 0.0.0.0:8000

# Frontend — build once, serve with any static host
cd frontend && pnpm build   # outputs to frontend/dist/
```

---

## Known Limitations

- Email is sent synchronously in the request thread — Celery integration is a
  `TODO` in the code. SMTP latency directly impacts response time under load.
- No dedicated `/health/` endpoint (see `DEPLOYMENT.md` for a workaround).
- Remaining N+1 patterns in `ProductListSerializer` and the category tree.
- Product reviews have no purchase-verification gate.

These are tracked Medium/Low items and do not affect correctness of the core
order and inventory flows. See `docs/PRODUCTION_READINESS_AUDIT_4.md`.

---

## License

MIT
