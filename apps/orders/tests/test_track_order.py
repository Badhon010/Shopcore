"""Tests for audit C-3 / B-1: POST /orders/track/ — guest order tracking by
order number + email (+ optional phone).

The email/phone pair is the bearer secret: a mismatch returns the same 404
envelope as a missing order so order numbers cannot be probed (audit S-5).
The response must never include the owner's identity fields.
"""
from __future__ import annotations

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.tests.factories import UserFactory
from apps.orders.tests.factories import OrderFactory


def _url() -> str:
    return reverse("orders:order-track")


@pytest.mark.django_db
class TestTrackOrderView:
    def test_track_with_correct_email_returns_limited_order(self):
        user = UserFactory()
        order = OrderFactory(user=user)

        response = APIClient().post(
            _url(),
            {"order_number": order.order_number, "email": user.email},
            format="json",
        )

        assert response.status_code == 200
        data = response.data
        assert data["order_number"] == order.order_number
        assert data["status"] == order.status
        assert data["grand_total"] == str(order.grand_total)
        # Owner identity must not leak.
        assert "user_email" not in data
        assert "user" not in data
        # Useful payload is present.
        assert "items" in data
        assert "status_history" in data
        assert "shipping_address_snapshot" in data

    def test_track_with_wrong_email_returns_404(self):
        user = UserFactory()
        order = OrderFactory(user=user)

        response = APIClient().post(
            _url(),
            {"order_number": order.order_number, "email": "someone-else@example.com"},
            format="json",
        )

        assert response.status_code == 404
        assert response.data["error"]["code"] == "ORDER_NOT_FOUND"

    def test_track_unknown_order_returns_404(self):
        response = APIClient().post(
            _url(),
            {"order_number": "ORD-DOES-NOT-EXIST", "email": "a@b.com"},
            format="json",
        )
        assert response.status_code == 404
        assert response.data["error"]["code"] == "ORDER_NOT_FOUND"

    def test_track_phone_mismatch_returns_404(self):
        user = UserFactory(phone_number="+15550000000")
        order = OrderFactory(user=user)

        response = APIClient().post(
            _url(),
            {
                "order_number": order.order_number,
                "email": user.email,
                "phone_number": "+19999999999",
            },
            format="json",
        )
        assert response.status_code == 404

    def test_track_phone_match_succeeds(self):
        user = UserFactory(phone_number="+15550000000")
        order = OrderFactory(user=user)

        response = APIClient().post(
            _url(),
            {
                "order_number": order.order_number,
                "email": user.email,
                "phone_number": "+15550000000",
            },
            format="json",
        )
        assert response.status_code == 200

    def test_track_requires_email(self):
        response = APIClient().post(
            _url(), {"order_number": "ORD-123456"}, format="json"
        )
        assert response.status_code == 400

    def test_track_case_insensitive_email(self):
        user = UserFactory(email="MixedCase@Example.com")
        order = OrderFactory(user=user)

        response = APIClient().post(
            _url(),
            {"order_number": order.order_number, "email": "mixedcase@example.com"},
            format="json",
        )
        assert response.status_code == 200

    def test_registered_order_ignores_lookup_token(self):
        """The lookup token is a guest-only credential: a registered order
        still requires the account email even when a token is supplied."""
        user = UserFactory()
        order = OrderFactory(user=user)

        response = APIClient().post(
            _url(),
            {"order_number": order.order_number, "lookup_token": "some-token"},
            format="json",
        )
        assert response.status_code == 404
