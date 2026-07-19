"""Tests for the cart app views."""
from __future__ import annotations

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.tests.factories import UserFactory
from apps.catalog.tests.factories import ProductVariantFactory


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return UserFactory()


@pytest.fixture
def auth_client(user):
    client = APIClient()
    response = client.post(
        reverse("accounts:login"),
        {"email": user.email, "password": "testpassword123!"},
        format="json",
    )
    assert response.status_code == 200, f"Login failed: {response.data}"
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
    return client


@pytest.mark.django_db
class TestCartView:
    def test_get_cart_authenticated(self, auth_client):
        response = auth_client.get(reverse("cart:cart-detail"))
        assert response.status_code == status.HTTP_200_OK
        assert "items" in response.data
        assert "subtotal" in response.data

    def test_get_cart_anonymous_returns_401(self, api_client):
        response = api_client.get(reverse("cart:cart-detail"))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestCartItemListView:
    def test_add_item_authenticated(self, auth_client):
        variant = ProductVariantFactory()
        response = auth_client.post(
            reverse("cart:cart-item-list"),
            {"variant_id": variant.pk, "quantity": 2},
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["item_count"] == 2

    def test_add_item_anonymous_returns_401(self, api_client):
        variant = ProductVariantFactory()
        response = api_client.post(
            reverse("cart:cart-item-list"),
            {"variant_id": variant.pk, "quantity": 1},
            format="json",
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_add_invalid_variant_returns_400(self, auth_client):
        response = auth_client.post(
            reverse("cart:cart-item-list"),
            {"variant_id": 999999, "quantity": 1},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_adding_same_item_twice_increments_quantity(self, auth_client):
        variant = ProductVariantFactory()
        auth_client.post(
            reverse("cart:cart-item-list"),
            {"variant_id": variant.pk, "quantity": 1},
            format="json",
        )
        auth_client.post(
            reverse("cart:cart-item-list"),
            {"variant_id": variant.pk, "quantity": 3},
            format="json",
        )
        response = auth_client.get(reverse("cart:cart-detail"))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["item_count"] == 4
        assert len(response.data["items"]) == 1

    def test_add_inactive_variant_returns_400(self, auth_client):
        variant = ProductVariantFactory(is_active=False)
        response = auth_client.post(
            reverse("cart:cart-item-list"),
            {"variant_id": variant.pk, "quantity": 1},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestCartItemDetailView:
    def _add_item(self, client, variant, quantity=1):
        return client.post(
            reverse("cart:cart-item-list"),
            {"variant_id": variant.pk, "quantity": quantity},
            format="json",
        )

    def test_update_item_quantity(self, auth_client):
        variant = ProductVariantFactory()
        add_resp = self._add_item(auth_client, variant, quantity=2)
        assert add_resp.status_code == status.HTTP_201_CREATED
        item_id = add_resp.data["items"][0]["id"]

        response = auth_client.patch(
            reverse("cart:cart-item-detail", kwargs={"item_id": item_id}),
            {"quantity": 5},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["item_count"] == 5

    def test_remove_item_from_cart(self, auth_client):
        variant = ProductVariantFactory()
        add_resp = self._add_item(auth_client, variant, quantity=1)
        assert add_resp.status_code == status.HTTP_201_CREATED
        item_id = add_resp.data["items"][0]["id"]

        response = auth_client.delete(
            reverse("cart:cart-item-detail", kwargs={"item_id": item_id}),
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["item_count"] == 0
        assert len(response.data["items"]) == 0

    def test_update_nonexistent_item_returns_error(self, auth_client):
        response = auth_client.patch(
            reverse("cart:cart-item-detail", kwargs={"item_id": 999999}),
            {"quantity": 1},
            format="json",
        )
        # CartItemNotFoundError is raised — mapped to 4xx by the exception handler
        assert response.status_code in (
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_404_NOT_FOUND,
        )

    def test_update_requires_authentication(self, api_client):
        response = api_client.patch(
            reverse("cart:cart-item-detail", kwargs={"item_id": 1}),
            {"quantity": 1},
            format="json",
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
