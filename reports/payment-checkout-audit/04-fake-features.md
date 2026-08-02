# 4. Fake / placeholder features

Explicitly mocked, stubbed, or documented-as-not-implemented.

| Feature | Where | Reality |
| ------- | ----- | ------- |
| Stripe gateway | `apps/payments/gateways/stripe_gateway.py` | Entire class raises `NotImplementedError` in `initiate()` and `handle_webhook()`. Docstring is a TODO for v2. |
| SSLCommerz / bKash "providers" | `apps/payments/constants.py:5-10` | Enum members only. No gateway class files exist at all (`gateways/` contains only `base.py`, `manual.py`, `stripe_gateway.py`). |
| Payment webhooks | `apps/payments/views.py:76-107` | View + signature hook exist, but the only registered gateway (`ManualGateway.handle_webhook`) is `pass` (`apps/payments/gateways/manual.py:61-62`). No webhook event actually changes any state. |
| Celery / background jobs | `config/celery.py` | Entire file is a commented-out stub. Emails are sent synchronously. Documented as intentional for v1. |
| Guest cart token | `frontend-store/src/services/api/cart.service.ts:27-55` | Frontend-only localStorage token + header that the backend ignores (see B-2). |
| "Cash on delivery" payment method | `frontend-store/src/pages/PaymentPage.tsx:96-101` | Hardcoded UI label; backend `MANUAL` marks payment **succeeded immediately**, which is not COD semantics (no "pending until delivery"). |
| Refund | `apps/orders/constants.py:28`, `apps/orders/services.py:304-305` | Only flips `payment_status`; no money movement, no `Payment` update, no restock. |
| Invoice | `frontend-store/src/pages/OrderDetailsPage.tsx:48` | Browser print dialog, not a server-generated invoice. |
| Payment configuration | `config/settings/base.py:446-448` | `STRIPE_*` env vars are read but unused by any code path. |
| `RETURN` stock movement | `apps/inventory/constants.py:12` | Enum member never written anywhere in `apps/` code. |
| Low-stock email alert | `apps/notifications/constants.py:16` (`LOW_STOCK_ALERT`) | Notification type exists; no sender function exists in `apps/notifications/services.py`. |
