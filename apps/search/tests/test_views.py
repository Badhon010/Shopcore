"""Tests for the global search view."""
from __future__ import annotations

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.tests.factories import StaffUserFactory, UserFactory


@pytest.fixture
def staff_client():
    staff = StaffUserFactory()
    client = APIClient()
    client.force_authenticate(user=staff)
    return client


@pytest.fixture
def plain_client():
    user = UserFactory()
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def anon_client():
    return APIClient()


URL = "search:global-search"


# ── Permissions ────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestGlobalSearchPermissions:
    def test_staff_can_search(self, staff_client):
        response = staff_client.get(reverse(URL), {"q": "test"})
        assert response.status_code == status.HTTP_200_OK

    def test_non_staff_cannot_search(self, plain_client):
        response = plain_client.get(reverse(URL), {"q": "test"})
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_anonymous_cannot_search(self, anon_client):
        response = anon_client.get(reverse(URL), {"q": "test"})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ── Query validation ───────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestGlobalSearchQueryValidation:
    def test_query_shorter_than_2_chars_rejected(self, staff_client):
        response = staff_client.get(reverse(URL), {"q": "x"})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_empty_query_rejected(self, staff_client):
        response = staff_client.get(reverse(URL), {"q": ""})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_missing_query_rejected(self, staff_client):
        response = staff_client.get(reverse(URL))
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_two_char_query_is_accepted(self, staff_client):
        response = staff_client.get(reverse(URL), {"q": "ab"})
        assert response.status_code == status.HTTP_200_OK


# ── Response structure ─────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestGlobalSearchResponseStructure:
    def test_response_has_expected_top_level_keys(self, staff_client):
        response = staff_client.get(reverse(URL), {"q": "anything"})
        assert response.status_code == status.HTTP_200_OK
        for key in ("query", "page", "page_size", "results"):
            assert key in response.data, f"Missing top-level key: {key}"

    def test_results_grouped_by_type(self, staff_client):
        response = staff_client.get(reverse(URL), {"q": "anything"})
        results = response.data["results"]
        # All seven types should be present when no `types` filter is applied
        for resource_type in ("product", "category", "brand", "order", "customer", "review", "subscriber"):
            assert resource_type in results, f"Missing resource type: {resource_type}"

    def test_each_type_bucket_has_total_and_items(self, staff_client):
        response = staff_client.get(reverse(URL), {"q": "anything"})
        for resource_type, bucket in response.data["results"].items():
            assert "total" in bucket, f"{resource_type}: missing 'total'"
            assert "items" in bucket, f"{resource_type}: missing 'items'"
            assert isinstance(bucket["items"], list), f"{resource_type}: 'items' is not a list"

    def test_query_echoed_in_response(self, staff_client):
        response = staff_client.get(reverse(URL), {"q": "myquery"})
        assert response.data["query"] == "myquery"

    def test_pagination_defaults(self, staff_client):
        response = staff_client.get(reverse(URL), {"q": "test"})
        assert response.data["page"] == 1
        assert response.data["page_size"] == 20


# ── types filter ───────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestGlobalSearchTypesFilter:
    def test_types_filter_restricts_results(self, staff_client):
        response = staff_client.get(reverse(URL), {"q": "test", "types": "product,category"})
        assert response.status_code == status.HTTP_200_OK
        results = response.data["results"]
        assert "product" in results
        assert "category" in results
        # Types not requested should be absent
        assert "order" not in results
        assert "customer" not in results

    def test_single_type_filter(self, staff_client):
        response = staff_client.get(reverse(URL), {"q": "test", "types": "customer"})
        assert response.status_code == status.HTTP_200_OK
        results = response.data["results"]
        assert "customer" in results
        assert len(results) == 1

    def test_unknown_type_in_filter_is_silently_ignored(self, staff_client):
        # "invoice" is not a supported type — only valid ones should appear
        response = staff_client.get(reverse(URL), {"q": "test", "types": "product,invoice"})
        assert response.status_code == status.HTTP_200_OK
        results = response.data["results"]
        assert "product" in results
        assert "invoice" not in results

    def test_all_types_invalid_returns_empty_results(self, staff_client):
        response = staff_client.get(reverse(URL), {"q": "test", "types": "bogus,faketype"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["results"] == {}


# ── Pagination ─────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestGlobalSearchPagination:
    def test_page_param_is_respected(self, staff_client):
        response = staff_client.get(reverse(URL), {"q": "test", "page": 2})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["page"] == 2

    def test_page_size_param_is_respected(self, staff_client):
        response = staff_client.get(reverse(URL), {"q": "test", "page_size": 5})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["page_size"] == 5

    def test_page_size_clamped_to_100(self, staff_client):
        response = staff_client.get(reverse(URL), {"q": "test", "page_size": 9999})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["page_size"] == 100

    def test_invalid_page_falls_back_to_1(self, staff_client):
        response = staff_client.get(reverse(URL), {"q": "test", "page": "not-a-number"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["page"] == 1


# ── Data correctness ───────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestGlobalSearchDataCorrectness:
    def test_search_finds_matching_user_by_email(self, staff_client, db):
        user = UserFactory(email="findme_unique_xyz@example.com")
        response = staff_client.get(reverse(URL), {"q": "findme_unique_xyz", "types": "customer"})
        assert response.status_code == status.HTTP_200_OK
        customer_results = response.data["results"]["customer"]
        assert customer_results["total"] >= 1
        emails = [item["title"] for item in customer_results["items"]]
        assert user.email in emails

    def test_search_returns_zero_results_for_no_match(self, staff_client):
        response = staff_client.get(
            reverse(URL),
            {"q": "zzz_no_match_xyzabc_12345", "types": "product,category,brand"},
        )
        assert response.status_code == status.HTTP_200_OK
        for resource_type in ("product", "category", "brand"):
            assert response.data["results"][resource_type]["total"] == 0
