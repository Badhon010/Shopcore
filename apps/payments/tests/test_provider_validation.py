"""Tests for H10: invalid payment provider must return HTTP 400, never 500.

Covers both serializer-level ChoiceField validation and the API view.
Uses force_authenticate() for API tests to avoid the login endpoint's
per-view throttle classes (not configured in test settings).
"""
from __future__ import annotations

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.tests.factories import UserFactory
from apps.orders.constants import OrderStatus
from apps.orders.tests.factories import OrderFactory
from apps.payments.constants import PaymentProvider
from apps.payments.serializers import InitiatePaymentSerializer


# ---------------------------------------------------------------------------
# Serializer-level tests (no DB, no API call)
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestInitiatePaymentSerializerProviderValidation:
    def test_valid_provider_passes_validation(self):
        """The MANUAL provider (the only v1 provider) must pass validation."""
        serializer = InitiatePaymentSerializer(
            data={"order_number": "ORD-20260711-000001", "provider": PaymentProvider.MANUAL}
        )
        assert serializer.is_valid(), serializer.errors

    def test_default_provider_is_manual(self):
        """Omitting 'provider' must default to MANUAL without error."""
        serializer = InitiatePaymentSerializer(data={"order_number": "ORD-20260711-000001"})
        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data["provider"] == PaymentProvider.MANUAL

    def test_unknown_provider_string_fails_validation(self):
        """A string that is not a member of PaymentProvider must fail."""
        serializer = InitiatePaymentSerializer(
            data={"order_number": "ORD-20260711-000001", "provider": "PAYPAL"}
        )
        assert not serializer.is_valid()
        assert "provider" in serializer.errors

    def test_arbitrary_string_provider_fails_validation(self):
        """A completely arbitrary string must also fail."""
        serializer = InitiatePaymentSerializer(
            data={"order_number": "ORD-20260711-000001", "provider": "notreal"}
        )
        assert not serializer.is_valid()
        assert "provider" in serializer.errors

    def test_known_but_unimplemented_provider_passes_serializer(self):
        """STRIPE is in the PaymentProvider enum so it passes serializer
        validation — the gateway layer (not the serializer) is responsible for
        rejecting unimplemented providers."""
        serializer = InitiatePaymentSerializer(
            data={"order_number": "ORD-20260711-000001", "provider": "STRIPE"}
        )
        assert serializer.is_valid(), serializer.errors

    def test_empty_provider_fails_validation(self):
        """An empty string is not a valid provider."""
        serializer = InitiatePaymentSerializer(
            data={"order_number": "ORD-20260711-000001", "provider": ""}
        )
        assert not serializer.is_valid()
        assert "provider" in serializer.errors


# ---------------------------------------------------------------------------
# API view tests
# ---------------------------------------------------------------------------

def _auth_client(user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
class TestInitiatePaymentViewProviderValidation:
    def test_unimplemented_provider_returns_400_not_500(self):
        """STRIPE is a valid PaymentProvider enum member but has no gateway
        implementation. The view must catch the resulting ValueError and
        return 400 (PROVIDER_NOT_AVAILABLE), never 500."""
        user = UserFactory()
        order = OrderFactory(user=user, status=OrderStatus.PENDING_PAYMENT)

        response = _auth_client(user).post(
            reverse("payments:payment-initiate"),
            {"order_number": order.order_number, "provider": "STRIPE"},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["error"]["code"] == "PROVIDER_NOT_AVAILABLE"

    def test_unknown_string_provider_returns_400(self):
        """A string not in PaymentProvider is rejected by the serializer (400)
        before it even reaches the gateway layer."""
        user = UserFactory()
        order = OrderFactory(user=user, status=OrderStatus.PENDING_PAYMENT)

        response = _auth_client(user).post(
            reverse("payments:payment-initiate"),
            {"order_number": order.order_number, "provider": "PAYPAL"},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_valid_manual_provider_processes_payment(self):
        """The MANUAL provider must process the payment and return 200."""
        user = UserFactory()
        order = OrderFactory(user=user, status=OrderStatus.PENDING_PAYMENT)

        response = _auth_client(user).post(
            reverse("payments:payment-initiate"),
            {"order_number": order.order_number, "provider": PaymentProvider.MANUAL},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert "payment_id" in response.data
        assert response.data["provider"] == PaymentProvider.MANUAL

    def test_omitting_provider_uses_manual_default(self):
        """Sending no 'provider' field must default to MANUAL and succeed."""
        user = UserFactory()
        order = OrderFactory(user=user, status=OrderStatus.PENDING_PAYMENT)

        response = _auth_client(user).post(
            reverse("payments:payment-initiate"),
            {"order_number": order.order_number},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["provider"] == PaymentProvider.MANUAL

    def test_unauthenticated_request_is_rejected(self):
        """Unauthenticated requests must be rejected (401)."""
        order = OrderFactory(status=OrderStatus.PENDING_PAYMENT)

        response = APIClient().post(
            reverse("payments:payment-initiate"),
            {"order_number": order.order_number, "provider": "FAKE"},
            format="json",
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_nonsense_string_provider_returns_400(self):
        """An entirely nonsense provider string must return 400 (serializer
        ChoiceField rejects it before the request reaches the gateway)."""
        user = UserFactory()
        order = OrderFactory(user=user, status=OrderStatus.PENDING_PAYMENT)

        response = _auth_client(user).post(
            reverse("payments:payment-initiate"),
            {"order_number": order.order_number, "provider": "xyzzy"},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
