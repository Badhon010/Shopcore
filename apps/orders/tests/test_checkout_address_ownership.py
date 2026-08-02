"""Tests for C-NEW-1: checkout address ownership enforcement.

Verifies that CheckoutView (and CheckoutSerializer) never allows an
authenticated user to use another user's address — either as shipping
or billing — and that unauthenticated requests are rejected outright.

Uses force_authenticate() to avoid hitting the login endpoint (which has
per-view throttle classes that are not configured in the test settings).
"""
from __future__ import annotations

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.tests.factories import AddressFactory, UserFactory
from apps.cart.models import Cart, CartItem
from apps.inventory.models import Warehouse
from apps.inventory.tests.factories import StockItemFactory

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _auth_client(user) -> APIClient:
    """Return an authenticated APIClient using force_authenticate."""
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def _default_warehouse():
    wh = Warehouse.objects.filter(is_default=True).first()
    if wh is None:
        wh = Warehouse.objects.create(name="Test Warehouse", code="WH-OWN", is_default=True)
    return wh


def _cart_with_item(user):
    """Active cart with one stocked variant — enough to pass checkout."""
    stock = StockItemFactory(
        quantity_on_hand=10, quantity_reserved=0, warehouse=_default_warehouse()
    )
    cart = Cart.objects.create(user=user, is_active=True)
    CartItem.objects.create(
        cart=cart,
        variant=stock.variant,
        quantity=1,
        unit_price_snapshot=stock.variant.effective_price,
    )
    return cart


def _url():
    return reverse("orders:order-checkout")


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestCheckoutAddressOwnership:
    def test_own_shipping_address_succeeds(self):
        """A user checking out with their own address must succeed (201)."""
        user = UserFactory()
        address = AddressFactory(user=user)
        _cart_with_item(user)

        response = _auth_client(user).post(
            _url(), {"shipping_address_id": address.pk}, format="json"
        )
        assert response.status_code == status.HTTP_201_CREATED

    def test_other_users_shipping_address_is_rejected(self):
        """Supplying another user's shipping address PK must be rejected (400).
        No order is created for the requesting user."""
        user = UserFactory()
        other_user = UserFactory()
        other_address = AddressFactory(user=other_user)
        _cart_with_item(user)

        response = _auth_client(user).post(
            _url(), {"shipping_address_id": other_address.pk}, format="json"
        )
        # Serializer rejects it with 400 before any order is created.
        assert response.status_code == status.HTTP_400_BAD_REQUEST

        from apps.orders.models import Order
        assert not Order.objects.filter(user=user).exists()

    def test_own_shipping_other_users_billing_is_rejected(self):
        """Own shipping address + another user's billing address must be
        rejected — mixed ownership is not allowed."""
        user = UserFactory()
        other_user = UserFactory()
        own_address = AddressFactory(user=user)
        other_billing = AddressFactory(user=other_user)
        _cart_with_item(user)

        response = _auth_client(user).post(
            _url(),
            {"shipping_address_id": own_address.pk, "billing_address_id": other_billing.pk},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

        from apps.orders.models import Order
        assert not Order.objects.filter(user=user).exists()

    def test_nonexistent_address_pk_is_rejected(self):
        """An address PK that does not exist at all must be rejected (400)."""
        user = UserFactory()
        _cart_with_item(user)

        response = _auth_client(user).post(
            _url(), {"shipping_address_id": 999999}, format="json"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_unauthenticated_registered_style_checkout_is_rejected(self):
        """An unauthenticated request using the REGISTERED checkout shape
        (shipping_address_id) must be rejected — the guest serializer does not
        accept an address FK (audit H-4)."""
        other_user = UserFactory()
        other_address = AddressFactory(user=other_user)

        response = APIClient().post(
            _url(), {"shipping_address_id": other_address.pk}, format="json"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_unauthenticated_checkout_without_cart_token_rejected(self):
        """A guest checkout without an X-Cart-Token header must be rejected
        (no anonymous cart exists to check out)."""
        payload = {
            "guest_name": "Guest",
            "guest_email": "guest@example.com",
            "guest_phone": "+8801711111111",
            "shipping_address": {
                "full_name": "Guest",
                "phone_number": "+8801711111111",
                "address_line_1": "1 Road",
                "city": "Dhaka",
                "state_province": "Dhaka",
                "postal_code": "1205",
                "country": "BD",
            },
        }

        response = APIClient().post(_url(), payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["error"]["code"] == "CART_TOKEN_REQUIRED"

    def test_view_defense_in_depth_rejects_other_users_address(self):
        """Even if the serializer ownership check were bypassed, the view's
        Address.objects.get(pk=..., user=request.user) guard must return 404
        rather than leaking the other user's data."""
        from unittest.mock import patch

        user = UserFactory()
        other_user = UserFactory()
        other_address = AddressFactory(user=other_user)
        _cart_with_item(user)

        def _permissive_validate(self_ser, value):
            return value  # skip serializer ownership check

        with patch(
            "apps.orders.serializers.CheckoutSerializer.validate_shipping_address_id",
            _permissive_validate,
        ):
            response = _auth_client(user).post(
                _url(), {"shipping_address_id": other_address.pk}, format="json"
            )

        # View-level guard must return 404, never 200 or 500.
        assert response.status_code == status.HTTP_404_NOT_FOUND

        from apps.orders.models import Order
        assert not Order.objects.filter(user=user).exists()
