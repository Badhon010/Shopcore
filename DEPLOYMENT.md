# ShopCore — Deployment Guide

This document covers deploying ShopCore in three environments:
1. [Local development](#local-development)
2. [Replit (recommended for staging/demo)](#replit-deployment)
3. [Self-hosted production](#self-hosted-production)

> **Full-stack note:** ShopCore consists of a Django API and a React/Vite SPA.
> Both must be running for the application to work end-to-end.
> The API serves `http://host/api/v1/` and the SPA is served separately (dev server
> in development; static files via a CDN or reverse proxy in production).

---

## Prerequisites

| Dependency | Minimum version | Notes |
|------------|----------------|-------|
| Python     | 3.12           | |
| PostgreSQL | 14             | Required — project uses `select_for_update()` and `to_tsvector` |
| Redis      | 6              | Required for caching; optional in dev (falls back to locmem) |
| gunicorn   | 23             | Included in `requirements.txt` |

---

## Local Development

### 1. Clone and install

```bash
git clone <repo-url>
cd shopcore
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — at minimum set DATABASE_URL to your local PostgreSQL instance
```

### 3. Create the database

```bash
createdb shopcore                    # PostgreSQL CLI
python manage.py migrate
python manage.py createsuperuser     # optional
```

### 4. Collect static files

```bash
python manage.py collectstatic --noinput
```

### 5. Run the backend development server

```bash
python manage.py runserver
```

API available at `http://localhost:8000/api/v1/`.  
OpenAPI schema browser at `http://localhost:8000/api/docs/`.

### 6. Run the frontend development server

```bash
cd frontend
pnpm install
pnpm dev      # SPA at http://localhost:3000  (proxies /api/ to :8000)
```

The Vite dev server is pre-configured to proxy all `/api/` requests to
`http://localhost:8000`. Both servers must be running simultaneously for
the full application to work.

### 7. Build the frontend for production

```bash
cd frontend
pnpm build    # outputs to frontend/dist/
```

### 8. Run tests

```bash
pytest                  # runs against DATABASE_URL (PostgreSQL) or test_db.sqlite3
pytest --tb=short -q    # compact output
pytest -x               # stop on first failure
```

---

## Replit Deployment

Replit injects environment variables directly into the process — no `.env` file
is read. Set each variable via the **Secrets** panel (padlock icon).

### Required secrets

| Secret key | Description |
|------------|-------------|
| `SECRET_KEY` | Django secret key (generate a new one — see `.env.example`) |
| `DATABASE_URL` | PostgreSQL connection string (Replit Postgres or external) |
| `EMAIL_URL` | SMTP connection string (e.g. SendGrid, Mailgun) |

### Optional secrets (sensible defaults exist)

| Secret key | Default |
|------------|---------|
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` — **must include your Replit domain** |
| `REDIS_URL` | `redis://localhost:6379/0` |
| `DEFAULT_FROM_EMAIL` | `no-reply@shopcore.example` |

### Workflow configuration

Create two workflows in Replit:

**Backend** — runs the Django API:
```
gunicorn config.wsgi:application \
  --workers 2 \
  --threads 4 \
  --worker-class gthread \
  --timeout 30 \
  --bind 0.0.0.0:5000 \
  --access-logfile - \
  --error-logfile -
```

**Frontend** — serves the Vite dev server (or a static build):
```bash
# Development preview
cd frontend && pnpm dev --port 3000

# Production build (run once, then serve dist/ with a static server)
cd frontend && pnpm build
```

Set `DJANGO_SETTINGS_MODULE=config.settings.production` in the workflow environment
(or as a Replit secret).

### Post-deploy steps

```bash
python manage.py migrate --settings=config.settings.production
python manage.py collectstatic --noinput --settings=config.settings.production
cd frontend && pnpm build
```

---

## Self-hosted Production

### System setup

```bash
# Create a dedicated system user
useradd --system --create-home shopcore

# Create PostgreSQL database and user
psql -U postgres -c "CREATE USER shopcore WITH PASSWORD 'strong-password';"
psql -U postgres -c "CREATE DATABASE shopcore OWNER shopcore;"

# Install Redis
apt-get install redis-server      # Debian/Ubuntu
systemctl enable --now redis
```

### Application setup

```bash
su - shopcore
git clone <repo-url> app
cd app
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with all REQUIRED values

export DJANGO_SETTINGS_MODULE=config.settings.production

# Database migrations
python manage.py migrate

# Collect static files (served by WhiteNoise — no separate nginx config needed)
python manage.py collectstatic --noinput
```

### gunicorn process manager (systemd)

```ini
# /etc/systemd/system/shopcore.service
[Unit]
Description=ShopCore API
After=network.target postgresql.service redis.service

[Service]
User=shopcore
WorkingDirectory=/home/shopcore/app
EnvironmentFile=/home/shopcore/app/.env
Environment=DJANGO_SETTINGS_MODULE=config.settings.production
ExecStart=/home/shopcore/.local/bin/gunicorn config.wsgi:application \
    --workers 4 \
    --threads 2 \
    --worker-class gthread \
    --timeout 30 \
    --bind unix:/run/shopcore/gunicorn.sock \
    --access-logfile - \
    --error-logfile -
ExecReload=/bin/kill -s HUP $MAINPID
RuntimeDirectory=shopcore
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable --now shopcore
```

### Reverse proxy (nginx)

```nginx
server {
    listen 443 ssl http2;
    server_name api.yourdomain.example.com;

    ssl_certificate     /etc/letsencrypt/live/api.yourdomain.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.example.com/privkey.pem;

    # Media uploads — served directly by Nginx for performance.
    # The alias path must match MEDIA_ROOT in your environment.
    # Only add this block when MEDIA_STORAGE=local; for S3/GCS/R2 the
    # files are served from the cloud bucket and this block is not needed.
    location /media/ {
        alias /var/www/shopcore/media/;

        # Security: prevent execution of uploaded files as scripts.
        add_header Content-Disposition "attachment";
        add_header X-Content-Type-Options "nosniff";

        # Optional: cache aggressively if files are immutable (e.g. UUIDs in filenames).
        # expires 30d;
        # add_header Cache-Control "public, max-age=2592000, immutable";
    }

    # Static files (Django admin + WhiteNoise) — handled by the backend.

    # Frontend SPA — serve the Vite build output as static files.
    # Replace /home/shopcore/app/frontend/dist with your actual build output path.
    location / {
        root /home/shopcore/app/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API — proxy to gunicorn.
    location /api/ {
        proxy_pass http://unix:/run/shopcore/gunicorn.sock;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name yourdomain.example.com;
    return 301 https://$host$request_uri;
}
```

---

## Media Files

### Storage backends

The storage backend is selected by the `MEDIA_STORAGE` environment variable.
Only `local` is implemented. Cloud backends (`s3`, `gcs`, `r2`) are extension
points — see `config/settings/base.py` for the commented configuration blocks.

| `MEDIA_STORAGE` | Where files go | Suitable for |
|-----------------|---------------|--------------|
| `local` (default) | `MEDIA_ROOT` on disk | Single-instance servers with a persistent volume |
| `s3` | AWS S3 bucket | Multi-instance / HA (requires django-storages) |
| `gcs` | Google Cloud Storage bucket | Multi-instance / HA (requires django-storages) |
| `r2` | Cloudflare R2 bucket | Multi-instance / HA (requires django-storages) |

### Local filesystem setup (MEDIA_STORAGE=local)

Create the media directory and set ownership **before** starting the application:

```bash
# Create a persistent media directory outside the project root
sudo mkdir -p /var/www/shopcore/media

# Give the application user write access
sudo chown shopcore:shopcore /var/www/shopcore/media
sudo chmod 750 /var/www/shopcore/media
```

Set `MEDIA_ROOT=/var/www/shopcore/media` in your environment (or `.env`).

> **Important:** do not point `MEDIA_ROOT` at a directory inside the project
> checkout. Uploads would be overwritten on the next `git pull` and could
> accidentally be committed to version control.

### Development

When `DEBUG=True`, Django serves uploaded files automatically via the
`django.views.static.serve` view (wired in `config/urls.py`).
No additional configuration is needed for local development.

### Production with Nginx (MEDIA_STORAGE=local)

Configure Nginx to serve the `/media/` location directly — this avoids routing
upload traffic through gunicorn and is significantly more efficient.

```nginx
location /media/ {
    alias /var/www/shopcore/media/;

    # Prevent the browser from executing uploaded files as scripts
    add_header Content-Disposition "attachment";
    add_header X-Content-Type-Options "nosniff";
}
```

The full Nginx server block is shown in the [Reverse proxy (nginx)](#reverse-proxy-nginx)
section below. When using a cloud backend (`s3`, `gcs`, `r2`), files are served
from the cloud provider's URL and this `location /media/` block is not needed.

### Upload size limit

`MAX_UPLOAD_SIZE_MB` (default `5`) controls the maximum allowed upload size in
megabytes. Set it in your environment to increase or decrease the limit:

```bash
MAX_UPLOAD_SIZE_MB=20   # allow up to 20 MB uploads
```

---

## Health Check

> **Note:** A dedicated `/health/` endpoint is not yet implemented (tracked as M-6
> in `docs/PRODUCTION_READINESS_AUDIT_4.md`). Until it is added, load-balancer
> probes can use `GET /api/schema/` which returns 200 without authentication.

To add a minimal health check now:

```python
# config/urls.py — add to urlpatterns
from django.http import JsonResponse
path("health/", lambda r: JsonResponse({"status": "ok"})),
```

---

## Post-deployment Verification Checklist

- [ ] `DJANGO_SETTINGS_MODULE=config.settings.production python manage.py check` — 0 issues
- [ ] `curl https://api.yourdomain.example.com/api/catalog/products/` — returns 200
- [ ] `curl -X POST https://api.yourdomain.example.com/api/accounts/register/` — returns 400 (not 500)
- [ ] Test password reset email is actually delivered (not stuck in logs)
- [ ] Verify `SECURE_SSL_REDIRECT=True` redirects HTTP → HTTPS
- [ ] Verify HSTS header present: `Strict-Transport-Security: max-age=31536000`
- [ ] Review Gunicorn worker count: `2 × CPU cores + 1` workers is a common starting point

---

## Known Limitations (v1.0.0-backend)

The following items are tracked in `docs/PRODUCTION_READINESS_AUDIT_4.md` as
Medium findings. They do not block deployment but should be addressed before
high-volume traffic:

- Email is sent synchronously in the request thread (no Celery). SMTP latency
  directly impacts API response time under load.
- Production logs write to `/tmp/shopcore.log` which is volatile. Redirect to
  stdout or a persistent volume.
- No dedicated `/health/` endpoint (see above for workaround).
- `ProductListSerializer` and the category tree serializer have remaining N+1
  query patterns that were not fixed in v1.0.0-backend.
