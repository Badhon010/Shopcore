# Deployment Guide

## Production Checklist (before go-live)

- [ ] `SECRET_KEY` set to a random 50+ char string (never the dev default)
- [ ] `DEBUG=False` and `DJANGO_SETTINGS_MODULE=config.settings.production`
- [ ] `DATABASE_URL` pointing to a production PostgreSQL instance
- [ ] `REDIS_URL` pointing to a production Redis instance
- [ ] `ALLOWED_HOSTS` set to your actual domain(s)
- [ ] `CORS_ALLOWED_ORIGINS` set to your frontend domain(s)
- [ ] `SECURE_SSL_REDIRECT=True`, `SESSION_COOKIE_SECURE=True`, `CSRF_COOKIE_SECURE=True`
- [ ] `EMAIL_URL` set to a real SMTP server
- [ ] `python manage.py check --deploy` passes with no warnings
- [ ] `python manage.py migrate` run against the production database
- [ ] `python manage.py collectstatic --noinput` run
- [ ] Superuser created: `python manage.py createsuperuser`

---

## Running with Gunicorn

```bash
# Install production dependencies
pip install -r requirements.txt

# Collect static files
python manage.py collectstatic --noinput

# Run migrations
python manage.py migrate

# Start Gunicorn (adjust workers and timeout for your instance)
gunicorn config.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers 4 \
  --worker-class sync \
  --timeout 60 \
  --access-logfile - \
  --error-logfile -
```

**Recommended:** Put Nginx in front of Gunicorn as a reverse proxy:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location /static/ {
        alias /path/to/shopcore/staticfiles/;
    }

    location /media/ {
        # See "Media Files" note below
        alias /path/to/shopcore/media/;
    }

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Media Files (User Uploads)

**⚠️ Important:** `MEDIA_ROOT` (local filesystem) is ephemeral on most cloud platforms and will be lost on container restarts.

For production, replace local media storage with S3-compatible object storage using `django-storages`:

```bash
pip install django-storages boto3
```

Then in `production.py`:

```python
DEFAULT_FILE_STORAGE = "storages.backends.s3boto3.S3Boto3Storage"
AWS_ACCESS_KEY_ID = env("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = env("AWS_SECRET_ACCESS_KEY")
AWS_STORAGE_BUCKET_NAME = env("AWS_S3_BUCKET_NAME")
AWS_S3_REGION_NAME = env("AWS_S3_REGION_NAME", default="us-east-1")
MEDIA_URL = f"https://{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com/"
```

Add the corresponding vars to your `.env`. This is the v1 boundary — the application code is ready for it, just not wired by default.

---

## Static Files

WhiteNoise serves static files directly from Gunicorn in production (no Nginx needed for static). It's already configured in `base.py` via `STATICFILES_STORAGE`.

---

## Database Migrations

Always run migrations before starting the app:

```bash
python manage.py migrate
```

To push development schema changes to production:

```bash
# From your CI/CD or deployment script:
python manage.py migrate --settings=config.settings.production
```

---

## Environment Variables Reference

See `.env.example` for the full list with inline comments. All must be set before starting production.

---

## Scaling Considerations

| Concern | v1 recommendation |
|---|---|
| Workers | `2 × CPU_cores + 1` Gunicorn sync workers |
| DB connections | Set `CONN_MAX_AGE=60` (already in production.py) |
| Caching | Redis is already wired; increase TTLs as traffic grows |
| Background tasks | Add Celery when email volume demands it (see ARCHITECTURE.md) |
| Media storage | Switch to S3-compatible storage (see above) |
