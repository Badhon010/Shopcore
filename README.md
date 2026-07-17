# ShopCore

A production-hardened Django REST API for e-commerce backends.

ShopCore provides all the backend primitives needed to build a modern online store:
product catalog with full-text search, cart, checkout with idempotency, inventory
management with race-condition-proof stock reservation, order lifecycle management,
JWT authentication with device logout on password change, coupons, wishlists, and
product reviews.

---

## Status

**v1.0.0-backend** — frozen for frontend development.

| Check | Status |
|-------|--------|
| Test suite | ✅ 88/88 passing |
| `manage.py check` | ✅ 0 issues |
| Critical vulnerabilities | ✅ 0 |
| High vulnerabilities | ✅ 0 |
| Pending migrations | ✅ None |

---

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL to your local PostgreSQL instance

# 3. Run migrations
python manage.py migrate

# 4. Start the development server
python manage.py runserver

# 5. Run tests
pytest
```

API root: `http://localhost:8000/api/`  
Interactive API docs: `http://localhost:8000/api/schema/swagger-ui/`  
OpenAPI schema JSON: `http://localhost:8000/api/schema/`

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        REST Clients                          │
│                (Browser / Mobile / Admin UI)                 │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS  JWT Bearer
┌───────────────────────────▼─────────────────────────────────┐
│                    Django / DRF API                          │
│  accounts · catalog · cart · orders · inventory · payments  │
│        coupons · reviews · wishlist · notifications         │
└──────────┬──────────────────────────────┬───────────────────┘
           │ SQL (psycopg3)               │ Cache (django-redis)
┌──────────▼──────────┐        ┌──────────▼──────────────────┐
│    PostgreSQL 14+   │        │         Redis 6+             │
│  primary datastore  │        │  category tree · sessions    │
└─────────────────────┘        └─────────────────────────────┘
```

See `docs/ARCHITECTURE.md` for the full diagram and `docs/ER_DIAGRAM.md` for the
database schema.

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
│   ├── notifications/  # Transactional email (welcome, order, password reset)
│   └── common/         # Shared mixins (TimeStampedModel, SoftDeleteModel)
├── config/
│   ├── settings/
│   │   ├── base.py        # Shared settings
│   │   ├── production.py  # Production overrides + startup guards
│   │   └── test.py        # Test overrides
│   ├── urls.py
│   └── wsgi.py
├── docs/
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── ER_DIAGRAM.md
│   └── PRODUCTION_READINESS_AUDIT_*.md
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

---

## API Summary

Full documentation is in `docs/API.md`. Key endpoint groups:

| Prefix | Description | Auth |
|--------|-------------|------|
| `/api/accounts/` | Register, login, logout, profile, password, addresses | Mixed |
| `/api/catalog/` | Products, categories, brands, search | Public |
| `/api/cart/` | Cart management | Required |
| `/api/orders/` | Checkout, order history, cancellation | Required |
| `/api/inventory/` | Stock management | Staff only |
| `/api/payments/` | Initiate payment, webhooks | Mixed |
| `/api/coupons/` | Apply discount codes | Required |
| `/api/reviews/` | Product reviews | Mixed |
| `/api/wishlist/` | Wishlist management | Required |

---

## Running in Production

See `DEPLOYMENT.md` for complete instructions. The short version:

```bash
export DJANGO_SETTINGS_MODULE=config.settings.production

# Required environment variables (startup fails without these):
# SECRET_KEY, DATABASE_URL, EMAIL_URL

gunicorn config.wsgi:application \
  --workers 4 --threads 2 \
  --worker-class gthread \
  --timeout 30 \
  --bind 0.0.0.0:8000
```

---

## Known Limitations (v1.0.0-backend)

See `docs/PRODUCTION_READINESS_AUDIT_4.md` for the full list. Short version:

- Email is sent synchronously — Celery integration is a `TODO` in the code
- No dedicated `/health/` endpoint
- Remaining N+1 patterns in `ProductListSerializer` and the category tree
- Product reviews have no purchase verification gate

These are tracked Medium/Low items and do not affect correctness of the core
order and inventory flows.

---

## License

MIT
