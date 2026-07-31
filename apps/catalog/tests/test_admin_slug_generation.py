"""Tests for admin catalog slug auto-generation (Category/Brand/Product)."""
from __future__ import annotations

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.catalog.models import Brand, Category, Product
from apps.catalog.tests.factories import BrandFactory, CategoryFactory, ProductFactory

User = get_user_model()


@pytest.fixture
def staff_client(db):
    user = User.objects.create_user(
        email="slug-admin@example.com",
        password="pass",
        is_staff=True,
    )
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
class TestCategorySlugGeneration:
    def test_create_category_without_slug_generates_one(self, staff_client):
        url = reverse("catalog:admin-category-list")
        response = staff_client.post(url, {"name": "  Widgets & Gadgets  "}, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["slug"] == "widgets-gadgets"

    def test_create_category_duplicate_name_appends_suffix(self, staff_client):
        CategoryFactory(name="Electronics", slug="electronics")
        url = reverse("catalog:admin-category-list")
        response = staff_client.post(url, {"name": "Electronics"}, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["slug"] == "electronics-2"

    def test_create_category_collides_with_soft_deleted_row(self, staff_client):
        """Slug uniqueness must consider soft-deleted rows (all_objects)."""
        cat = CategoryFactory(name="Archived", slug="archived")
        cat.delete()  # soft delete → is_active=False
        url = reverse("catalog:admin-category-list")
        response = staff_client.post(url, {"name": "Archived"}, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["slug"] == "archived-2"

    def test_create_category_whitespace_slug_is_ignored(self, staff_client):
        url = reverse("catalog:admin-category-list")
        response = staff_client.post(url, {"name": "Clean", "slug": "   "}, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["slug"] == "clean"

    def test_create_category_explicit_colliding_slug_is_deduplicated(self, staff_client):
        """Explicit slug colliding with an existing row must not 500."""
        CategoryFactory(name="Taken", slug="taken")
        url = reverse("catalog:admin-category-list")
        response = staff_client.post(
            url, {"name": "New One", "slug": "taken"}, format="json"
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["slug"] == "taken-2"

    def test_patch_without_slug_keeps_existing(self, staff_client):
        cat = CategoryFactory(name="Original", slug="original")
        url = reverse("catalog:admin-category-detail", kwargs={"pk": cat.pk})
        response = staff_client.patch(url, {"name": "Renamed"}, format="json")
        assert response.status_code == status.HTTP_200_OK
        cat.refresh_from_db()
        assert cat.slug == "original"

    def test_patch_explicit_slug_override_deduplicated(self, staff_client):
        CategoryFactory(name="Taken", slug="taken")
        cat = CategoryFactory(name="Mine", slug="mine")
        url = reverse("catalog:admin-category-detail", kwargs={"pk": cat.pk})
        response = staff_client.patch(url, {"slug": "taken"}, format="json")
        assert response.status_code == status.HTTP_200_OK
        cat.refresh_from_db()
        assert cat.slug == "taken-2"


@pytest.mark.django_db
class TestBrandSlugGeneration:
    def test_create_brand_without_slug_generates_one(self, staff_client):
        url = reverse("catalog:admin-brand-list")
        response = staff_client.post(url, {"name": "Acme Corp"}, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["slug"] == "acme-corp"

    def test_patch_without_slug_keeps_existing(self, staff_client):
        brand = BrandFactory(name="Old", slug="old-brand")
        url = reverse("catalog:admin-brand-detail", kwargs={"pk": brand.pk})
        response = staff_client.patch(url, {"name": "New Name"}, format="json")
        assert response.status_code == status.HTTP_200_OK
        brand.refresh_from_db()
        assert brand.slug == "old-brand"

    def test_create_brand_explicit_colliding_slug_is_deduplicated(self, staff_client):
        BrandFactory(name="Taken", slug="taken")
        url = reverse("catalog:admin-brand-list")
        response = staff_client.post(
            url, {"name": "New Brand", "slug": "taken"}, format="json"
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["slug"] == "taken-2"


@pytest.mark.django_db
class TestProductSlugGeneration:
    def _payload(self, sku: str, **overrides):
        category = CategoryFactory()
        data = {
            "name": "Running Shoe",
            "category": category.pk,
            "base_price": "49.99",
            "sku": sku,
            "status": "DRAFT",
        }
        data.update(overrides)
        return data

    def test_create_product_without_slug_generates_one(self, staff_client):
        url = reverse("catalog:admin-product-list")
        response = staff_client.post(url, self._payload("SLUG-PROD-001"), format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["slug"] == "running-shoe"

    def test_create_product_no_slug_second_one_gets_suffix(self, staff_client):
        url = reverse("catalog:admin-product-list")
        first = staff_client.post(url, self._payload("SLUG-PROD-002"), format="json")
        assert first.status_code == status.HTTP_201_CREATED
        second = staff_client.post(url, self._payload("SLUG-PROD-003"), format="json")
        assert second.status_code == status.HTTP_201_CREATED
        assert first.data["slug"] == "running-shoe"
        assert second.data["slug"] == "running-shoe-2"

    def test_create_product_slug_collides_with_soft_deleted_row(self, staff_client):
        prod = ProductFactory(name="Ghost", slug="ghost")
        prod.delete()  # soft delete
        url = reverse("catalog:admin-product-list")
        response = staff_client.post(url, self._payload("SLUG-PROD-004", name="Ghost"), format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["slug"] == "ghost-2"

    def test_update_without_slug_keeps_existing(self, staff_client):
        prod = ProductFactory(name="Shoe", slug="shoe")
        url = reverse("catalog:admin-product-detail", kwargs={"slug": "shoe"})
        response = staff_client.patch(
            url, {"name": "Shoe v2", "category": prod.category_id}, format="json"
        )
        assert response.status_code == status.HTTP_200_OK
        prod.refresh_from_db()
        assert prod.slug == "shoe"

    def test_create_product_explicit_colliding_slug_is_deduplicated(self, staff_client):
        ProductFactory(name="Taken", slug="taken")
        url = reverse("catalog:admin-product-list")
        response = staff_client.post(
            url, self._payload("SLUG-PROD-005", slug="taken"), format="json"
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["slug"] == "taken-2"

    def test_self_contained_product_create_persists(self, staff_client):
        """Sanity: an auto-slugged product create is fully persisted."""
        url = reverse("catalog:admin-product-list")
        response = staff_client.post(
            url,
            {
                "name": "Self Contained",
                "category": CategoryFactory().pk,
                "base_price": "5.00",
                "sku": "SELF-SLUG-001",
                "status": "DRAFT",
            },
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert Product.objects.filter(name="Self Contained", slug="self-contained").exists()
