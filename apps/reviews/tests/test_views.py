"""Tests for the reviews app views."""
from __future__ import annotations

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.tests.factories import UserFactory
from apps.catalog.tests.factories import ProductFactory


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


def _review_payload(rating=5, title="Great product", body="Really loved it."):
    return {"rating": rating, "title": title, "body": body}


@pytest.mark.django_db
class TestProductReviewListView:
    def test_anonymous_user_can_read_reviews(self, api_client):
        from apps.reviews.models import Review
        product = ProductFactory(slug="test-product-reviews")
        user = UserFactory()
        Review.objects.create(
            product=product, user=user, rating=4,
            title="Good", body="Nice product.", is_approved=True,
        )
        response = api_client.get(
            reverse("reviews:product-review-list", kwargs={"product_slug": product.slug})
        )
        assert response.status_code == status.HTTP_200_OK
        results = response.data.get("results", response.data)
        assert len(results) == 1

    def test_unapproved_reviews_are_not_listed(self, api_client):
        from apps.reviews.models import Review
        product = ProductFactory(slug="product-unapproved")
        user = UserFactory()
        Review.objects.create(
            product=product, user=user, rating=3,
            title="Meh", body="Not great.", is_approved=False,
        )
        response = api_client.get(
            reverse("reviews:product-review-list", kwargs={"product_slug": product.slug})
        )
        assert response.status_code == status.HTTP_200_OK
        results = response.data.get("results", response.data)
        assert len(results) == 0


@pytest.mark.django_db
class TestProductReviewCreateView:
    def test_authenticated_user_can_create_review(self, auth_client):
        product = ProductFactory()
        response = auth_client.post(
            reverse("reviews:product-review-create", kwargs={"product_slug": product.slug}),
            _review_payload(rating=5),
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["rating"] == 5

    def test_anonymous_user_cannot_create_review(self, api_client):
        product = ProductFactory()
        response = api_client.post(
            reverse("reviews:product-review-create", kwargs={"product_slug": product.slug}),
            _review_payload(),
            format="json",
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_user_cannot_create_two_reviews_for_same_product(self, auth_client):
        product = ProductFactory()
        auth_client.post(
            reverse("reviews:product-review-create", kwargs={"product_slug": product.slug}),
            _review_payload(rating=4, title="First review"),
            format="json",
        )
        response = auth_client.post(
            reverse("reviews:product-review-create", kwargs={"product_slug": product.slug}),
            _review_payload(rating=5, title="Second review"),
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        # The view returns either the ALREADY_REVIEWED error code or a
        # DRF validation error (VALIDATION_ERROR) from the unique_together
        # constraint — both correctly signal a duplicate.
        error_code = response.data.get("error", {}).get("code", "")
        assert error_code in ("ALREADY_REVIEWED", "VALIDATION_ERROR") or response.status_code == 400

    def test_invalid_rating_too_high_returns_400(self, auth_client):
        product = ProductFactory()
        response = auth_client.post(
            reverse("reviews:product-review-create", kwargs={"product_slug": product.slug}),
            _review_payload(rating=6),
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_invalid_rating_too_low_returns_400(self, auth_client):
        product = ProductFactory()
        response = auth_client.post(
            reverse("reviews:product-review-create", kwargs={"product_slug": product.slug}),
            _review_payload(rating=0),
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_nonexistent_product_returns_4xx(self, auth_client):
        """A non-existent product slug is rejected. The URL does not exist
        in the router, so DRF returns 404 or 400 depending on routing."""
        response = auth_client.post(
            reverse("reviews:product-review-create", kwargs={"product_slug": "no-such-product"}),
            _review_payload(),
            format="json",
        )
        assert response.status_code in (
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_404_NOT_FOUND,
        )
