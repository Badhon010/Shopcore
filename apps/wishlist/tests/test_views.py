"""Tests for the wishlist app views."""
from __future__ import annotations

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.tests.factories import UserFactory
from apps.catalog.tests.factories import ProductFactory, ProductVariantFactory


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
class TestWishlistView:
    def test_get_wishlist_authenticated(self, auth_client):
        response = auth_client.get(reverse("wishlist:wishlist-list"))
        assert response.status_code == status.HTTP_200_OK

    def test_get_wishlist_anonymous_returns_401(self, api_client):
        response = api_client.get(reverse("wishlist:wishlist-list"))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestWishlistAddView:
    def test_add_product_to_wishlist(self, auth_client):
        product = ProductFactory()
        response = auth_client.post(
            reverse("wishlist:wishlist-add"),
            {"product_id": product.pk},
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["product"]["id"] == product.pk

    def test_anonymous_cannot_add_to_wishlist(self, api_client):
        product = ProductFactory()
        response = api_client.post(
            reverse("wishlist:wishlist-add"),
            {"product_id": product.pk},
            format="json",
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_add_nonexistent_product_returns_404(self, auth_client):
        response = auth_client.post(
            reverse("wishlist:wishlist-add"),
            {"product_id": 999999},
            format="json",
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestWishlistRemoveView:
    def test_remove_product_from_wishlist(self, auth_client):
        product = ProductFactory()
        auth_client.post(
            reverse("wishlist:wishlist-add"),
            {"product_id": product.pk},
            format="json",
        )
        response = auth_client.delete(
            reverse("wishlist:wishlist-remove", kwargs={"product_id": product.pk})
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT
        # Confirm item is gone — response may be paginated
        list_resp = auth_client.get(reverse("wishlist:wishlist-list"))
        results = list_resp.data.get("results", list_resp.data)
        assert len(results) == 0

    def test_remove_nonexistent_product_returns_404(self, auth_client):
        response = auth_client.delete(
            reverse("wishlist:wishlist-remove", kwargs={"product_id": 999999})
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestWishlistMoveToCartView:
    def test_move_item_from_wishlist_to_cart(self, auth_client):
        product = ProductFactory()
        # Create a variant so move_to_cart can find one
        ProductVariantFactory(product=product)
        auth_client.post(
            reverse("wishlist:wishlist-add"),
            {"product_id": product.pk},
            format="json",
        )
        response = auth_client.post(
            reverse("wishlist:wishlist-move-to-cart"),
            {"product_id": product.pk},
            format="json",
        )
        # WishlistMoveToCartView returns 201 Created
        assert response.status_code in (
            status.HTTP_200_OK,
            status.HTTP_201_CREATED,
        )

        # Item should now be in cart
        cart_resp = auth_client.get(reverse("cart:cart-detail"))
        assert cart_resp.data["item_count"] == 1

        # Item should no longer be in wishlist
        wishlist_resp = auth_client.get(reverse("wishlist:wishlist-list"))
        results = wishlist_resp.data.get("results", wishlist_resp.data)
        assert len(results) == 0

    def test_move_to_cart_anonymous_returns_401(self, api_client):
        response = api_client.post(
            reverse("wishlist:wishlist-move-to-cart"),
            {"product_id": 1},
            format="json",
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
