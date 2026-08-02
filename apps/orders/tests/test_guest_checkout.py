"""Tests for audit H-4: full guest checkout.

- Guest cart via X-Cart-Token header (Cart.session_key).
- Guest checkout: POST /orders/checkout/ without auth → order with user=None
  + guest fields + inline address snapshot + one-time lookup token.
- Guest lookup: Order Number + Phone  OR  Order Number + Email + Lookup Token.
- Guest cancel with the lookup secret.
- Claim: verified user claims previous guest orders on login/verification.
- Guest cart merges into the user's cart on login.
"""
from __future__ import annotations

import hashlib

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.cart.models import Cart, CartItem
from apps.inventory.models import Warehouse
from apps.inventory.tests.factories import StockItemFactory
from apps.orders.constants import OrderStatus
from apps.orders.models import Order
from apps.orders.services import place_order


def _default_warehouse():
    wh = Warehouse.objects.filter(is_default=True).first()
    if wh is None:
        wh = Warehouse.objects.create(name="Guest WH", code="WH-GUEST", is_default=True)
    return wh


def _stocked_variant(qty: int = 10):
    return StockItemFactory(
        quantity_on_hand=qty, quantity_reserved=0, warehouse=_default_warehouse()
    ).variant


def _guest_cart(session_key: str = "guest-token-123"):
    cart = Cart.objects.create(session_key=session_key, user=None, is_active=True)
    variant = _stocked_variant()
    CartItem.objects.create(
        cart=cart, variant=variant, quantity=1, unit_price_snapshot=variant.effective_price
    )
    return cart


GUEST_ADDRESS = {
    "full_name": "Guest User",
    "phone_number": "+8801711111111",
    "address_line_1": "12 Dhanmondi",
    "address_line_2": "",
    "city": "Dhaka",
    "state_province": "Dhaka",
    "postal_code": "1205",
    "country": "BD",
}

GUEST_PAYLOAD = {
    "guest_name": "Guest User",
    "guest_email": "guest@example.com",
    "guest_phone": "+8801711111111",
    "shipping_address": GUEST_ADDRESS,
    "idempotency_key": "guest-idem-1",
}


@pytest.mark.django_db
class TestGuestCart:
    def test_guest_cart_requires_token(self):
        client = APIClient()
        response = client.get(reverse("cart:cart-detail"))
        # Anonymous request with no token: DRF treats the failing permission as
        # an authentication failure (401) since no authenticator succeeded.
        assert response.status_code == 401

    def test_guest_cart_with_token_works(self):
        client = APIClient()
        response = client.get(
            reverse("cart:cart-detail"), HTTP_X_CART_TOKEN="guest-token-abc"
        )
        assert response.status_code == 200
        assert response.data["item_count"] == 0

    def test_guest_cart_add_item(self):
        client = APIClient()
        variant = _stocked_variant()
        response = client.post(
            reverse("cart:cart-item-list"),
            {"variant_id": variant.pk, "quantity": 2},
            HTTP_X_CART_TOKEN="guest-token-abc",
            format="json",
        )
        assert response.status_code == 201
        assert response.data["item_count"] == 2

    def test_authenticated_cart_still_works(self):
        from apps.accounts.tests.factories import UserFactory
        user = UserFactory()
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get(reverse("cart:cart-detail"))
        assert response.status_code == 200


@pytest.mark.django_db
class TestGuestCheckout:
    def test_guest_checkout_creates_order_with_guest_identity(self):
        _guest_cart("guest-token-xyz")
        client = APIClient()

        response = client.post(
            reverse("orders:order-checkout"),
            GUEST_PAYLOAD,
            HTTP_X_CART_TOKEN="guest-token-xyz",
            format="json",
        )

        assert response.status_code == 201, response.data
        order = Order.objects.get(order_number=response.data["order_number"])
        assert order.user_id is None
        assert order.guest_email == "guest@example.com"
        assert order.guest_name == "Guest User"
        assert order.guest_phone == "+8801711111111"
        assert order.guest_session_id == "guest-token-xyz"
        assert order.shipping_address_snapshot["city"] == "Dhaka"
        assert order.status == OrderStatus.PENDING_PAYMENT
        # Lookup token returned once, stored hashed.
        assert response.data["guest_lookup_token"]
        assert len(response.data["guest_lookup_token"]) >= 32
        stored_hash = hashlib.sha256(
            response.data["guest_lookup_token"].encode("utf-8")
        ).hexdigest()
        assert stored_hash == order.guest_lookup_token

    def test_guest_checkout_requires_token(self):
        client = APIClient()
        response = client.post(
            reverse("orders:order-checkout"), GUEST_PAYLOAD, format="json"
        )
        assert response.status_code == 400
        assert response.data["error"]["code"] == "CART_TOKEN_REQUIRED"

    def test_guest_checkout_idempotent(self):
        _guest_cart("guest-token-idem")
        client = APIClient()
        url = reverse("orders:order-checkout")

        r1 = client.post(url, GUEST_PAYLOAD, HTTP_X_CART_TOKEN="guest-token-idem", format="json")
        r2 = client.post(url, GUEST_PAYLOAD, HTTP_X_CART_TOKEN="guest-token-idem", format="json")

        assert r1.status_code == 201
        assert r2.status_code == 201
        assert r1.data["order_number"] == r2.data["order_number"]
        assert Order.objects.filter(
            guest_session_id="guest-token-idem", idempotency_key="guest-idem-1"
        ).count() == 1

    def test_guest_checkout_empty_cart_rejected(self):
        Cart.objects.create(session_key="guest-token-empty", user=None, is_active=True)
        client = APIClient()
        response = client.post(
            reverse("orders:order-checkout"),
            GUEST_PAYLOAD,
            HTTP_X_CART_TOKEN="guest-token-empty",
            format="json",
        )
        assert response.status_code == 400
        assert response.data["error"]["code"] == "EMPTY_CART"

    def test_guest_checkout_with_invalid_country(self):
        _guest_cart("guest-token-badcountry")
        client = APIClient()
        payload = dict(GUEST_PAYLOAD)
        payload["shipping_address"] = dict(GUEST_ADDRESS, country="XX")
        response = client.post(
            reverse("orders:order-checkout"),
            payload,
            HTTP_X_CART_TOKEN="guest-token-badcountry",
            format="json",
        )
        assert response.status_code == 400


@pytest.mark.django_db
class TestGuestLookup:
    def _guest_order(self, session="guest-token-lookup"):
        cart = _guest_cart(session)
        return place_order(
            user=None,
            cart=cart,
            guest_data={
                "guest_name": "Guest User",
                "guest_email": "guest@example.com",
                "guest_phone": "+8801711111111",
                "guest_session_id": session,
            },
            shipping_address_snapshot=GUEST_ADDRESS,
        )

    def test_lookup_by_phone(self):
        order = self._guest_order()
        client = APIClient()
        response = client.post(
            reverse("orders:order-track"),
            {"order_number": order.order_number, "phone_number": "+8801711111111"},
            format="json",
        )
        assert response.status_code == 200
        assert response.data["order_number"] == order.order_number

    def test_lookup_by_email_and_token(self):
        order = self._guest_order()
        plain_token = order._guest_lookup_token_plain
        client = APIClient()
        response = client.post(
            reverse("orders:order-track"),
            {
                "order_number": order.order_number,
                "email": "guest@example.com",
                "lookup_token": plain_token,
            },
            format="json",
        )
        assert response.status_code == 200

    def test_lookup_wrong_phone_404(self):
        order = self._guest_order()
        client = APIClient()
        response = client.post(
            reverse("orders:order-track"),
            {"order_number": order.order_number, "phone_number": "+8801799999999"},
            format="json",
        )
        assert response.status_code == 404

    def test_lookup_wrong_token_404(self):
        order = self._guest_order()
        client = APIClient()
        response = client.post(
            reverse("orders:order-track"),
            {
                "order_number": order.order_number,
                "email": "guest@example.com",
                "lookup_token": "wrong-token",
            },
            format="json",
        )
        assert response.status_code == 404

    def test_guest_lookup_does_not_expose_internals(self):
        order = self._guest_order()
        client = APIClient()
        response = client.post(
            reverse("orders:order-track"),
            {"order_number": order.order_number, "phone_number": "+8801711111111"},
            format="json",
        )
        assert "guest_lookup_token" not in response.data
        assert "guest_email" not in response.data


@pytest.mark.django_db
class TestGuestCancel:
    def _guest_order(self, session="guest-token-cancel"):
        cart = _guest_cart(session)
        return place_order(
            user=None,
            cart=cart,
            guest_data={
                "guest_name": "Guest User",
                "guest_email": "guest@example.com",
                "guest_phone": "+8801711111111",
                "guest_session_id": session,
            },
            shipping_address_snapshot=GUEST_ADDRESS,
        )

    def test_guest_cancel_with_phone(self):
        order = self._guest_order()
        client = APIClient()
        response = client.post(
            reverse("orders:order-cancel", args=[order.order_number]),
            {"phone_number": "+8801711111111"},
            format="json",
        )
        assert response.status_code == 200
        order.refresh_from_db()
        assert order.status == OrderStatus.CANCELLED

    def test_guest_cancel_without_secret_404(self):
        order = self._guest_order()
        client = APIClient()
        response = client.post(
            reverse("orders:order-cancel", args=[order.order_number]), {}, format="json"
        )
        assert response.status_code == 404


@pytest.mark.django_db
class TestGuestClaim:
    def test_verified_user_claims_guest_orders_on_login(self):
        from apps.accounts.models import User

        _guest_cart("guest-token-claim")
        place_order(
            user=None,
            cart=Cart.objects.get(session_key="guest-token-claim"),
            guest_data={
                "guest_name": "Guest User",
                "guest_email": "alice@example.com",
                "guest_phone": "+8801711111111",
                "guest_session_id": "guest-token-claim",
            },
            shipping_address_snapshot=GUEST_ADDRESS,
        )

        # Register + verify the same email, then login → order is claimed.
        user = User.objects.create_user(
            email="alice@example.com", password="password12345"
        )
        user.is_email_verified = True
        user.save(update_fields=["is_email_verified"])

        client = APIClient()
        response = client.post(
            reverse("accounts:login"),
            {"email": "alice@example.com", "password": "password12345"},
            format="json",
        )
        assert response.status_code == 200
        order = Order.objects.get(guest_session_id="guest-token-claim")
        assert order.user_id == user.pk

    def test_unverified_email_does_not_claim(self):
        from apps.accounts.models import User

        _guest_cart("guest-token-noclaim")
        place_order(
            user=None,
            cart=Cart.objects.get(session_key="guest-token-noclaim"),
            guest_data={
                "guest_name": "Guest User",
                "guest_email": "bob@example.com",
                "guest_phone": "+8801711111111",
                "guest_session_id": "guest-token-noclaim",
            },
            shipping_address_snapshot=GUEST_ADDRESS,
        )

        user = User.objects.create_user(email="bob@example.com", password="password12345")
        # is_email_verified stays False → login is blocked, no claim possible.

        from apps.accounts.services import claim_guest_orders
        claimed = claim_guest_orders(user)
        assert claimed == 0
        assert Order.objects.get(guest_session_id="guest-token-noclaim").user_id is None

    def test_verify_email_triggers_claim(self):
        from apps.accounts.models import User
        from apps.accounts.services import email_verification_token_generator, verify_email

        _guest_cart("guest-token-verifyclaim")
        place_order(
            user=None,
            cart=Cart.objects.get(session_key="guest-token-verifyclaim"),
            guest_data={
                "guest_name": "Guest User",
                "guest_email": "carol@example.com",
                "guest_phone": "+8801711111111",
                "guest_session_id": "guest-token-verifyclaim",
            },
            shipping_address_snapshot=GUEST_ADDRESS,
        )

        user = User.objects.create_user(email="carol@example.com", password="password12345")
        token = email_verification_token_generator.make_token(user)
        assert verify_email(user, token) is True
        order = Order.objects.get(guest_session_id="guest-token-verifyclaim")
        assert order.user_id == user.pk


@pytest.mark.django_db
class TestGuestCartMergeOnLogin:
    def test_login_merges_guest_cart(self):
        from apps.accounts.models import User

        cart = _guest_cart("guest-token-merge")
        variant = cart.items.first().variant

        user = User.objects.create_user(email="merge@example.com", password="password12345")
        user.is_email_verified = True
        user.save(update_fields=["is_email_verified"])

        client = APIClient()
        response = client.post(
            reverse("accounts:login"),
            {"email": "merge@example.com", "password": "password12345"},
            HTTP_X_CART_TOKEN="guest-token-merge",
            format="json",
        )
        assert response.status_code == 200

        user_cart = Cart.objects.get(user=user, is_active=True)
        assert user_cart.items.filter(variant=variant).exists()
        # Guest cart deactivated after merge.
        cart.refresh_from_db()
        assert cart.is_active is False
