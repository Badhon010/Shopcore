"""Root pytest configuration for ShopCore.

Fixtures defined here are available in all test modules without import.
"""
from __future__ import annotations

import django
import pytest
from django.conf import settings


def pytest_configure(config):
    """Set Django settings module before any test collection."""
    settings.DJANGO_SETTINGS_MODULE = "config.settings.test"


@pytest.fixture
def api_client():
    from rest_framework.test import APIClient
    return APIClient()


@pytest.fixture
def user(db):
    from apps.accounts.tests.factories import UserFactory
    return UserFactory()


@pytest.fixture
def staff_user(db):
    from apps.accounts.tests.factories import StaffUserFactory
    return StaffUserFactory()


@pytest.fixture
def auth_client(user):
    from django.urls import reverse
    from rest_framework.test import APIClient
    client = APIClient()
    response = client.post(
        reverse("accounts:login"),
        {"email": user.email, "password": "testpassword123!"},
        format="json",
    )
    assert response.status_code == 200, f"Login failed: {response.data}"
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
    return client


@pytest.fixture
def warehouse(db):
    from apps.inventory.tests.factories import WarehouseFactory
    return WarehouseFactory(is_default=True)
