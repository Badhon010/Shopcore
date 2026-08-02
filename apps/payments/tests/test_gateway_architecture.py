"""Tests for audit H-3: gateway architecture.

- get_gateway() registry: MANUAL / SSLCOMMERZ / STRIPE / PAYPAL registered.
- Gateways report "not configured" gracefully when env credentials are absent.
- process_gateway_webhook(): signature verification + PaymentEventLog
  idempotency (replays short-circuit) + success/failure recording.
"""
from __future__ import annotations

from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest
from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.tests.factories import UserFactory
from apps.orders.constants import OrderStatus
from apps.orders.tests.factories import OrderFactory
from apps.payments.constants import PaymentProvider
from apps.payments.constants import PaymentStatus as GatewayPaymentStatus
from apps.payments.models import Payment, PaymentEventLog


@pytest.mark.django_db
class TestGatewayRegistry:
    def test_manual_gateway_registered(self):
        from apps.payments.services import get_gateway
        gw = get_gateway(PaymentProvider.MANUAL)
        assert gw.provider == PaymentProvider.MANUAL

    def test_sslcommerz_gateway_registered(self):
        from apps.payments.services import get_gateway
        gw = get_gateway(PaymentProvider.SSLCOMMERZ)
        assert gw.provider == PaymentProvider.SSLCOMMERZ
        assert not gw.is_configured()  # no env credentials in tests

    def test_stripe_gateway_registered(self):
        from apps.payments.services import get_gateway
        gw = get_gateway(PaymentProvider.STRIPE)
        assert gw.provider == PaymentProvider.STRIPE
        assert not gw.is_configured()

    def test_paypal_gateway_registered(self):
        from apps.payments.services import get_gateway
        gw = get_gateway(PaymentProvider.PAYPAL)
        assert gw.provider == PaymentProvider.PAYPAL
        assert not gw.is_configured()

    def test_unregistered_provider_raises_value_error(self):
        from apps.payments.services import get_gateway
        with pytest.raises(ValueError):
            get_gateway(PaymentProvider.BKASH)


@pytest.mark.django_db
class TestGatewayInitiateNotConfigured:
    def test_sslcommerz_initiate_raises_not_configured(self):
        from apps.payments.gateways.sslcommerz_gateway import SSLCommerzGateway
        order = OrderFactory(status=OrderStatus.PENDING_PAYMENT)
        with pytest.raises(Exception) as exc:
            SSLCommerzGateway().initiate(order, Decimal("100.00"), "BDT")
        assert getattr(exc.value, "code", "") == "GATEWAY_NOT_CONFIGURED"

    def test_stripe_initiate_raises_not_configured(self):
        from apps.payments.gateways.stripe_gateway import StripeGateway
        order = OrderFactory(status=OrderStatus.PENDING_PAYMENT)
        with pytest.raises(Exception) as exc:
            StripeGateway().initiate(order, Decimal("100.00"), "BDT")
        assert getattr(exc.value, "code", "") == "GATEWAY_NOT_CONFIGURED"

    def test_paypal_initiate_raises_not_configured(self):
        from apps.payments.gateways.paypal_gateway import PayPalGateway
        order = OrderFactory(status=OrderStatus.PENDING_PAYMENT)
        with pytest.raises(Exception) as exc:
            PayPalGateway().initiate(order, Decimal("100.00"), "BDT")
        assert getattr(exc.value, "code", "") == "GATEWAY_NOT_CONFIGURED"


@pytest.mark.django_db
class TestGatewayInitiateConfigured:
    """With credentials configured (mocked provider calls), initiate creates an
    INITIATED Payment and returns the frontend data (client_secret/redirect)."""

    def test_stripe_initiate_creates_initiated_payment(self):
        from apps.payments.models import PaymentMethod
        from apps.payments.services import initiate_payment

        PaymentMethod.objects.filter(provider="STRIPE").update(is_enabled=True)
        user = UserFactory()
        order = OrderFactory(user=user, status=OrderStatus.PENDING_PAYMENT)

        fake_intent = MagicMock()
        fake_intent.client_secret = "pi_secret_abc"
        fake_intent.id = "pi_123"
        fake_intent.amount = 10000
        fake_intent.currency = "bdt"

        with (
            override_settings(STRIPE_SECRET_KEY="sk_test_x", STRIPE_PUBLISHABLE_KEY="pk_test_x"),
            patch("apps.payments.gateways.stripe_gateway.StripeGateway._stripe", new_callable=MagicMock) as mock_stripe,
        ):
            mock_stripe.PaymentIntent.create.return_value = fake_intent
            result = initiate_payment(order, provider="STRIPE")

        assert result["provider"] == "STRIPE"
        assert result["client_secret"] == "pi_secret_abc"
        assert result["provider_transaction_id"] == "pi_123"

        payment = Payment.objects.get(order=order, provider="STRIPE")
        assert payment.status == GatewayPaymentStatus.INITIATED
        assert payment.provider_transaction_id == "pi_123"

    def test_paypal_initiate_returns_approve_url(self):
        from apps.payments.models import PaymentMethod
        from apps.payments.services import initiate_payment

        PaymentMethod.objects.filter(provider="PAYPAL").update(is_enabled=True)
        user = UserFactory()
        order = OrderFactory(user=user, status=OrderStatus.PENDING_PAYMENT)

        with (
            override_settings(PAYPAL_CLIENT_ID="cid", PAYPAL_CLIENT_SECRET="csec"),
            patch("apps.payments.gateways.paypal_gateway.PayPalGateway._access_token", return_value="tok"),
            patch("apps.payments.gateways.paypal_gateway.requests.post") as mock_post,
        ):
            mock_post.return_value = MagicMock(
                raise_for_status=MagicMock(),
                json=lambda: {
                    "id": "PAY-1",
                    "links": [{"rel": "approve", "href": "https://paypal.com/approve/PAY-1"}],
                },
            )
            result = initiate_payment(order, provider="PAYPAL")

        assert result["redirect_url"] == "https://paypal.com/approve/PAY-1"
        assert result["provider_transaction_id"] == "PAY-1"

    def test_sslcommerz_initiate_returns_gateway_page_url(self):
        from apps.payments.models import PaymentMethod
        from apps.payments.services import initiate_payment

        PaymentMethod.objects.filter(provider="SSLCOMMERZ").update(is_enabled=True)
        user = UserFactory()
        order = OrderFactory(user=user, status=OrderStatus.PENDING_PAYMENT)

        with (
            override_settings(
                SSLCOMMERZ_STORE_ID="sid", SSLCOMMERZ_STORE_PASSWORD="spwd", SSLCOMMERZ_SANDBOX=True
            ),
            patch("apps.payments.gateways.sslcommerz_gateway.requests.post") as mock_post,
        ):
            mock_post.return_value = MagicMock(
                raise_for_status=MagicMock(),
                json=lambda: {
                    "status": "SUCCESS",
                    "GatewayPageURL": "https://sandbox.sslcommerz.com/gwprocess/v4/gw.php?sessionkey=SK1",
                    "sessionkey": "SK1",
                },
            )
            result = initiate_payment(order, provider="SSLCOMMERZ")

        assert result["redirect_url"].startswith("https://sandbox.sslcommerz.com")
        assert result["provider_transaction_id"] == "SK1"


@pytest.mark.django_db
class TestWebhookIdempotency:
    def test_duplicate_event_is_deduplicated(self):
        """The same gateway event id processed twice must record the payment
        exactly once (PaymentEventLog unique constraint short-circuits)."""
        user = UserFactory()
        order = OrderFactory(user=user, status=OrderStatus.PENDING_PAYMENT)

        payload = {
            "id": "evt_stripe_1",
            "type": "payment_intent.succeeded",
            "data": {"object": {"id": "pi_1", "metadata": {"order_number": order.order_number}}},
        }

        import json
        json.dumps(payload).encode()

        def handle_webhook(payload, raw_body=None, headers=None):
            from apps.payments.services import record_successful_payment
            record_successful_payment(
                order,
                provider=PaymentProvider.STRIPE,
                amount=order.grand_total,
                currency="BDT",
                raw_response={"event_id": "evt_stripe_1"},
            )

        with (
            patch("apps.payments.gateways.stripe_gateway.StripeGateway.verify_signature"),
            patch(
                "apps.payments.gateways.stripe_gateway.StripeGateway.handle_webhook",
                side_effect=handle_webhook,
            ),
        ):
            client = APIClient()
            url = reverse("payments:payment-webhook", kwargs={"provider": "stripe"})
            r1 = client.post(url, payload, format="json")
            r2 = client.post(url, payload, format="json")

        assert r1.status_code == 200
        assert r2.status_code == 200
        assert r2.data["result"] == "duplicate"

        order.refresh_from_db()
        assert order.status == OrderStatus.PAID
        # Exactly one succeeded payment + one event log row.
        assert Payment.objects.filter(order=order, status=GatewayPaymentStatus.SUCCEEDED).count() == 1
        assert PaymentEventLog.objects.filter(event_id="evt_stripe_1").count() == 1

    def test_invalid_signature_rejected(self):
        client = APIClient()
        url = reverse("payments:payment-webhook", kwargs={"provider": "stripe"})

        with (
            patch(
                "apps.payments.gateways.stripe_gateway.StripeGateway.verify_signature",
                side_effect=ValueError("bad sig"),
            ),
            override_settings(STRIPE_WEBHOOK_SECRET="whsec_x"),
        ):
            response = client.post(url, {"id": "evt_1"}, format="json")

        assert response.status_code == 400
        assert response.data["error"]["code"] == "INVALID_SIGNATURE"
