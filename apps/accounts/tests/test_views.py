"""Tests for the accounts app views."""
from __future__ import annotations

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.tests.factories import AddressFactory, StaffUserFactory, UserFactory


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user():
    return UserFactory()


@pytest.fixture
def auth_client(user):
    client = APIClient()
    response = client.post(
        reverse("accounts:login"),
        {"email": user.email, "password": "testpassword123!"},
        format="json",
    )
    token = response.data["access"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return client


@pytest.mark.django_db
class TestRegisterView:
    def test_register_success(self, api_client):
        response = api_client.post(
            reverse("accounts:register"),
            {
                "email": "newuser@example.com",
                "password": "securepass123!",
                "password_confirm": "securepass123!",
            },
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["email"] == "newuser@example.com"

    def test_register_duplicate_email(self, api_client, user):
        response = api_client.post(
            reverse("accounts:register"),
            {
                "email": user.email,
                "password": "securepass123!",
                "password_confirm": "securepass123!",
            },
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_register_password_mismatch(self, api_client):
        response = api_client.post(
            reverse("accounts:register"),
            {
                "email": "new@example.com",
                "password": "securepass123!",
                "password_confirm": "different123!",
            },
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestMeView:
    def test_get_profile(self, auth_client, user):
        response = auth_client.get(reverse("accounts:me"))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["email"] == user.email
        assert response.data["is_staff"] is False

    def test_staff_status_is_read_only_and_exposed(self, api_client):
        staff_user = StaffUserFactory()
        response = api_client.post(
            reverse("accounts:login"),
            {"email": staff_user.email, "password": "testpassword123!"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["user"]["is_staff"] is True

        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
        profile_response = api_client.patch(
            reverse("accounts:me"),
            {"is_staff": False},
            format="json",
        )

        assert profile_response.status_code == status.HTTP_200_OK
        assert profile_response.data["is_staff"] is True

    def test_get_profile_unauthenticated(self, api_client):
        response = api_client.get(reverse("accounts:me"))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestAddressViews:
    def test_list_addresses(self, auth_client, user):
        AddressFactory.create_batch(3, user=user)
        response = auth_client.get(reverse("accounts:address-list"))
        assert response.status_code == status.HTTP_200_OK
        # Response may be paginated or plain list
        data = response.data.get("results", response.data) if isinstance(response.data, dict) else response.data
        assert len(data) == 3

    def test_cannot_see_other_users_addresses(self, auth_client):
        other_user = UserFactory()
        AddressFactory(user=other_user)
        response = auth_client.get(reverse("accounts:address-list"))
        assert response.status_code == status.HTTP_200_OK
        data = response.data.get("results", response.data) if isinstance(response.data, dict) else response.data
        assert len(data) == 0

    def test_create_address(self, auth_client):
        response = auth_client.post(
            reverse("accounts:address-list"),
            {
                "full_name": "Test User",
                "phone_number": "+15551234567",
                "address_line_1": "123 Main St",
                "city": "San Francisco",
                "state_province": "CA",
                "postal_code": "94105",
                "country": "US",
                "address_type": "SHIPPING",
            },
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED
