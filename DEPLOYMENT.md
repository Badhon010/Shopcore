# ShopCore — Deployment Guide

This document covers deploying ShopCore in three environments:
1. [Local development](#local-development)
2. [Replit (recommended for staging/demo)](#replit-deployment)
3. [Self-hosted production](#self-hosted-production)

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

### 5. Run the development server

```bash
python manage.py runserver
```

API available at `http://localhost:8000/api/`.  
OpenAPI schema browser at `http://localhost:8000/api/schema/swagger-ui/`.

### 6. Run tests

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

The Replit workflow should run:

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

Set `DJANGO_SETTINGS_MODULE=config.settings.production` in the workflow environment
(or as a Replit secret).

### Post-deploy steps

```bash
python manage.py migrate --settings=config.settings.production
python manage.py collectstatic --noinput --settings=config.settings.production
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

    location / {
        proxy_pass http://unix:/run/shopcore/gunicorn.sock;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files are handled by WhiteNoise — no separate location block needed.
}

server {
    listen 80;
    server_name api.yourdomain.example.com;
    return 301 https://$host$request_uri;
}
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
