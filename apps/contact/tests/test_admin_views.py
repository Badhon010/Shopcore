"""Tests for admin contact message views."""
from __future__ import annotations

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.tests.factories import UserFactory
from apps.contact.models import ContactMessage


def _make_message(
    name="Alice",
    email="alice@example.com",
    subject="Hello",
    message="Test message body",
    msg_status=ContactMessage.Status.NEW,
):
    return ContactMessage.objects.create(
        name=name,
        email=email,
        subject=subject,
        message=message,
        status=msg_status,
    )


@pytest.fixture
def regular_user(db):
    return UserFactory()


@pytest.fixture
def regular_client(regular_user):
    client = APIClient()
    response = client.post(
        reverse("accounts:login"),
        {"email": regular_user.email, "password": "testpassword123!"},
        format="json",
    )
    assert response.status_code == 200, f"Login failed: {response.data}"
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
    return client


@pytest.fixture
def staff_client(staff_user):
    client = APIClient()
    response = client.post(
        reverse("accounts:login"),
        {"email": staff_user.email, "password": "testpassword123!"},
        format="json",
    )
    assert response.status_code == 200, f"Login failed: {response.data}"
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
    return client


@pytest.mark.django_db
class TestAdminContactMessageListView:
    def test_staff_can_list_messages(self, staff_client):
        _make_message()
        _make_message(name="Bob", email="bob@example.com")
        response = staff_client.get(reverse("contact:admin-message-list"))
        assert response.status_code == status.HTTP_200_OK
        results = response.data.get("results", response.data)
        assert len(results) == 2

    def test_non_staff_cannot_list_messages(self, regular_client):
        response = regular_client.get(reverse("contact:admin-message-list"))
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_anonymous_cannot_list_messages(self, api_client):
        response = api_client.get(reverse("contact:admin-message-list"))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_search_by_name(self, staff_client):
        _make_message(name="Alice Wonderland")
        _make_message(name="Bob Builder", email="bob@example.com")
        response = staff_client.get(reverse("contact:admin-message-list"), {"search": "Alice"})
        assert response.status_code == status.HTTP_200_OK
        results = response.data.get("results", response.data)
        assert len(results) == 1
        assert results[0]["name"] == "Alice Wonderland"

    def test_search_by_email(self, staff_client):
        _make_message(email="alice@example.com")
        _make_message(name="Bob", email="bob@example.com")
        response = staff_client.get(reverse("contact:admin-message-list"), {"search": "alice"})
        assert response.status_code == status.HTTP_200_OK
        results = response.data.get("results", response.data)
        assert len(results) == 1

    def test_filter_by_status(self, staff_client):
        _make_message(msg_status=ContactMessage.Status.NEW)
        _make_message(name="Bob", email="bob@example.com", msg_status=ContactMessage.Status.RESOLVED)
        response = staff_client.get(reverse("contact:admin-message-list"), {"status": "resolved"})
        assert response.status_code == status.HTTP_200_OK
        results = response.data.get("results", response.data)
        assert len(results) == 1
        assert results[0]["status"] == "resolved"

    def test_ordering_ascending(self, staff_client):
        _make_message(name="First")
        _make_message(name="Second", email="second@example.com")
        response = staff_client.get(reverse("contact:admin-message-list"), {"ordering": "created_at"})
        assert response.status_code == status.HTTP_200_OK
        results = response.data.get("results", response.data)
        assert results[0]["name"] == "First"


@pytest.mark.django_db
class TestAdminContactMessageDetailView:
    def test_staff_can_retrieve_message(self, staff_client):
        msg = _make_message()
        response = staff_client.get(reverse("contact:admin-message-detail", kwargs={"pk": msg.pk}))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == msg.pk
        assert response.data["name"] == msg.name

    def test_staff_can_update_status(self, staff_client):
        msg = _make_message()
        response = staff_client.patch(
            reverse("contact:admin-message-detail", kwargs={"pk": msg.pk}),
            {"status": "in_progress"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        msg.refresh_from_db()
        assert msg.status == ContactMessage.Status.IN_PROGRESS

    def test_staff_can_delete_message(self, staff_client):
        msg = _make_message()
        response = staff_client.delete(reverse("contact:admin-message-detail", kwargs={"pk": msg.pk}))
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not ContactMessage.objects.filter(pk=msg.pk).exists()

    def test_non_staff_cannot_access_detail(self, regular_client):
        msg = _make_message()
        response = regular_client.get(reverse("contact:admin-message-detail", kwargs={"pk": msg.pk}))
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_anonymous_cannot_access_detail(self, api_client):
        msg = _make_message()
        response = api_client.get(reverse("contact:admin-message-detail", kwargs={"pk": msg.pk}))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_readonly_fields_cannot_be_updated(self, staff_client):
        msg = _make_message()
        original_name = msg.name
        response = staff_client.patch(
            reverse("contact:admin-message-detail", kwargs={"pk": msg.pk}),
            {"name": "Hacker", "status": "resolved"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        msg.refresh_from_db()
        assert msg.name == original_name


@pytest.mark.django_db
class TestAdminContactMessageMarkResolvedView:
    def test_staff_can_mark_resolved(self, staff_client):
        msg = _make_message(msg_status=ContactMessage.Status.NEW)
        response = staff_client.post(
            reverse("contact:admin-message-resolve", kwargs={"pk": msg.pk})
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "resolved"
        msg.refresh_from_db()
        assert msg.status == ContactMessage.Status.RESOLVED

    def test_non_staff_cannot_mark_resolved(self, regular_client):
        msg = _make_message()
        response = regular_client.post(
            reverse("contact:admin-message-resolve", kwargs={"pk": msg.pk})
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_resolve_nonexistent_message_returns_404(self, staff_client):
        response = staff_client.post(
            reverse("contact:admin-message-resolve", kwargs={"pk": 999999})
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestAdminContactMessageMarkNewView:
    def test_staff_can_mark_new(self, staff_client):
        msg = _make_message(msg_status=ContactMessage.Status.RESOLVED)
        response = staff_client.post(
            reverse("contact:admin-message-mark-new", kwargs={"pk": msg.pk})
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "new"
        msg.refresh_from_db()
        assert msg.status == ContactMessage.Status.NEW

    def test_non_staff_cannot_mark_new(self, regular_client):
        msg = _make_message()
        response = regular_client.post(
            reverse("contact:admin-message-mark-new", kwargs={"pk": msg.pk})
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_mark_new_nonexistent_message_returns_404(self, staff_client):
        response = staff_client.post(
            reverse("contact:admin-message-mark-new", kwargs={"pk": 999999})
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
