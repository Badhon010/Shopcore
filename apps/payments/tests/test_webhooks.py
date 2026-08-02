"""Tests for the payments webhook view."""
from __future__ import annotations

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    return APIClient()


@pytest.mark.django_db
class TestWebhookView:
    def test_webhook_valid_payload_returns_ok(self, api_client):
        """ManualGateway verify_signature is a no-op, handle_webhook is a no-op."""
        response = api_client.post(
            reverse("payments:payment-webhook", kwargs={"provider": "manual"}),
            {"event": "payment.succeeded", "transaction_id": "txn-001"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "ok"

    def test_webhook_unknown_provider_returns_400(self, api_client):
        response = api_client.post(
            reverse("payments:payment-webhook", kwargs={"provider": "unknown_provider_xyz"}),
            {"event": "payment.succeeded"},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["error"]["code"] == "UNKNOWN_PROVIDER"

    def test_webhook_unknown_event_type_handled_gracefully(self, api_client):
        """ManualGateway handle_webhook is a no-op, so unknown events return 200."""
        response = api_client.post(
            reverse("payments:payment-webhook", kwargs={"provider": "manual"}),
            {"event": "completely.unknown.event", "data": {}},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK

    def test_webhook_invalid_signature_returns_400(self, api_client):
        """Patch ManualGateway.verify_signature to raise, simulating a bad HMAC."""
        from unittest.mock import patch

        with patch(
            "apps.payments.gateways.manual.ManualGateway.verify_signature",
            side_effect=ValueError("HMAC mismatch"),
        ):
            response = api_client.post(
                reverse("payments:payment-webhook", kwargs={"provider": "manual"}),
                {"event": "payment.succeeded"},
                format="json",
            )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["error"]["code"] == "INVALID_SIGNATURE"

    def test_webhook_handle_webhook_exception_returns_400(self, api_client):
        """If handle_webhook raises, the view must return 400."""
        from unittest.mock import patch

        with patch(
            "apps.payments.gateways.manual.ManualGateway.handle_webhook",
            side_effect=RuntimeError("Unexpected processing error"),
        ):
            response = api_client.post(
                reverse("payments:payment-webhook", kwargs={"provider": "manual"}),
                {"event": "some.event"},
                format="json",
            )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["error"]["code"] == "WEBHOOK_ERROR"

    def test_webhook_idempotent_same_transaction_twice(self, api_client):
        """Calling the ManualGateway webhook twice with the same payload is safe
        (handle_webhook is a no-op, so it never double-processes)."""
        payload = {"event": "payment.succeeded", "transaction_id": "txn-idempotent"}
        url = reverse("payments:payment-webhook", kwargs={"provider": "manual"})

        resp1 = api_client.post(url, payload, format="json")
        resp2 = api_client.post(url, payload, format="json")

        assert resp1.status_code == status.HTTP_200_OK
        assert resp2.status_code == status.HTTP_200_OK
