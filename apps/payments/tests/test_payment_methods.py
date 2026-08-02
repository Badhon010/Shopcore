"""Tests for audit H-1: PaymentMethod model + admin configuration API +
public storefront list.

The eight default methods are seeded by migration 0004, so they exist in the
test database. MANUAL and BANK_TRANSFER ship enabled; gateway-backed methods
ship disabled until their gateways are integrated.
"""
from __future__ import annotations

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.tests.factories import StaffUserFactory, UserFactory
from apps.payments.constants import PaymentProvider
from apps.payments.models import PaymentMethod


@pytest.mark.django_db
class TestSeededMethods:
    def test_all_providers_seeded(self):
        providers = set(PaymentMethod.objects.values_list("provider", flat=True))
        expected = {
            PaymentProvider.MANUAL,
            PaymentProvider.BANK_TRANSFER,
            PaymentProvider.BKASH,
            PaymentProvider.NAGAD,
            PaymentProvider.ROCKET,
            PaymentProvider.SSLCOMMERZ,
            PaymentProvider.STRIPE,
            PaymentProvider.PAYPAL,
        }
        assert providers == expected

    def test_default_enabled_state(self):
        manual = PaymentMethod.objects.get(provider=PaymentProvider.MANUAL)
        bank = PaymentMethod.objects.get(provider=PaymentProvider.BANK_TRANSFER)
        stripe = PaymentMethod.objects.get(provider=PaymentProvider.STRIPE)
        assert manual.is_enabled is True
        assert bank.is_enabled is True
        assert stripe.is_enabled is False


@pytest.mark.django_db
class TestPublicPaymentMethodList:
    def test_public_list_returns_only_enabled(self):
        response = APIClient().get(reverse("payments:payment-method-list"))
        assert response.status_code == 200
        providers = [m["provider"] for m in response.data]
        assert PaymentProvider.MANUAL in providers
        assert PaymentProvider.BANK_TRANSFER in providers
        assert PaymentProvider.STRIPE not in providers
        assert PaymentProvider.PAYPAL not in providers

    def test_public_list_does_not_require_auth(self):
        response = APIClient().get(reverse("payments:payment-method-list"))
        assert response.status_code == 200

    def test_public_list_ordered_by_sort_order(self):
        response = APIClient().get(reverse("payments:payment-method-list"))
        providers = [m["provider"] for m in response.data]
        assert providers.index(PaymentProvider.MANUAL) < providers.index(PaymentProvider.BANK_TRANSFER)

    def test_public_list_excludes_admin_fields(self):
        response = APIClient().get(reverse("payments:payment-method-list"))
        for method in response.data:
            assert "gateway_config" not in method
            assert "is_enabled" not in method


@pytest.mark.django_db
class TestAdminPaymentMethodApi:
    def test_staff_can_enable_a_method(self):
        staff = StaffUserFactory()
        stripe = PaymentMethod.objects.get(provider=PaymentProvider.STRIPE)
        client = APIClient()
        client.force_authenticate(user=staff)

        response = client.patch(
            reverse("payments:payment-method-admin-detail", args=[stripe.pk]),
            {"is_enabled": True},
            format="json",
        )

        assert response.status_code == 200
        stripe.refresh_from_db()
        assert stripe.is_enabled is True

    def test_staff_can_configure_manual_details(self):
        staff = StaffUserFactory()
        bank = PaymentMethod.objects.get(provider=PaymentProvider.BANK_TRANSFER)
        client = APIClient()
        client.force_authenticate(user=staff)

        response = client.patch(
            reverse("payments:payment-method-admin-detail", args=[bank.pk]),
            {
                "account_number": "1234567890",
                "account_name": "ShopCore Ltd",
                "instructions": "Use reference: order number",
            },
            format="json",
        )

        assert response.status_code == 200
        bank.refresh_from_db()
        assert bank.account_number == "1234567890"
        assert bank.account_name == "ShopCore Ltd"

    def test_enabled_method_appears_in_public_list(self):
        staff = StaffUserFactory()
        stripe = PaymentMethod.objects.get(provider=PaymentProvider.STRIPE)
        client = APIClient()
        client.force_authenticate(user=staff)
        client.patch(
            reverse("payments:payment-method-admin-detail", args=[stripe.pk]),
            {"is_enabled": True},
            format="json",
        )

        public_providers = [
            m["provider"]
            for m in APIClient().get(reverse("payments:payment-method-list")).data
        ]
        assert PaymentProvider.STRIPE in public_providers

    def test_non_staff_cannot_manage_methods(self):
        user = UserFactory()
        bank = PaymentMethod.objects.get(provider=PaymentProvider.BANK_TRANSFER)
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.patch(
            reverse("payments:payment-method-admin-detail", args=[bank.pk]),
            {"is_enabled": False},
            format="json",
        )
        assert response.status_code == 403

    def test_staff_can_list_methods(self):
        staff = StaffUserFactory()
        client = APIClient()
        client.force_authenticate(user=staff)
        response = client.get(reverse("payments:payment-method-admin-list"))
        assert response.status_code == 200
        assert response.data["count"] == 8
