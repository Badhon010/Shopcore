"""
Celery stub for ShopCore — intentionally NOT active in v1.

Justification (from architecture decision):
With a single vendor and moderate order volume, transactional emails are sent
synchronously via Django's EmailBackend with a short timeout and a resilient
retry-on-admin-action fallback. Celery is not needed in v1.

HOW TO ACTIVATE CELERY (when email volume or report-generation demands it):
1. Add ``celery`` and a broker (``redis`` already in requirements) to requirements.txt.
2. Add ``"celery"`` and ``"django_celery_beat"`` to ``INSTALLED_APPS`` in base.py.
3. Add ``CELERY_BROKER_URL = env("REDIS_URL")`` to base.py.
4. Uncomment the app variable below and wire it in your WSGI/ASGI entrypoint.
5. In each app's ``tasks.py``, decorate the existing service-wrapper functions with
   ``@shared_task`` — they already accept plain arguments and return plain data,
   so no refactor of the service layer is needed.

# from celery import Celery
# app = Celery("shopcore")
# app.config_from_object("django.conf:settings", namespace="CELERY")
# app.autodiscover_tasks()
"""
