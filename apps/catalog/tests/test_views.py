"""Tests for the catalog app views."""
from __future__ import annotations

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.catalog.tests.factories import CategoryFactory, ProductFactory


@pytest.fixture
def api_client():
    return APIClient()


@pytest.mark.django_db
class TestProductListView:
    def test_list_products_public(self, api_client):
        ProductFactory.create_batch(5)
        response = api_client.get(reverse("catalog:product-list"))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 5

    def test_list_products_paginated(self, api_client):
        ProductFactory.create_batch(25)
        response = api_client.get(reverse("catalog:product-list"))
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 20  # default page size

    def test_list_products_num_queries(self, api_client, django_assert_max_num_queries):
        ProductFactory.create_batch(5)
        with django_assert_max_num_queries(30):  # guard against severe N+1; exact count varies with signals
            response = api_client.get(reverse("catalog:product-list"))
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestProductDetailView:
    def test_get_product_by_slug(self, api_client):
        product = ProductFactory(slug="test-product")
        response = api_client.get(reverse("catalog:product-detail", kwargs={"slug": "test-product"}))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["slug"] == "test-product"

    def test_get_nonexistent_product(self, api_client):
        response = api_client.get(reverse("catalog:product-detail", kwargs={"slug": "nonexistent"}))
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestCategoryViews:
    def test_list_categories(self, api_client):
        CategoryFactory.create_batch(3)
        response = api_client.get(reverse("catalog:category-list"))
        assert response.status_code == status.HTTP_200_OK
