"""Tests for notification management views (delete, bulk-delete, clear-all, bulk-mark-read, unread-count)."""
from __future__ import annotations

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.tests.factories import UserFactory
from apps.notifications.models import Notification


def _make_notification(user, is_read=False, title="Test Notification"):
    return Notification.objects.create(
        user=user,
        title=title,
        body="Notification body text",
        notification_type=Notification.Type.SYSTEM,
        is_read=is_read,
    )


@pytest.fixture
def other_user(db):
    return UserFactory()


@pytest.fixture
def other_client(other_user):
    client = APIClient()
    response = client.post(
        reverse("accounts:login"),
        {"email": other_user.email, "password": "testpassword123!"},
        format="json",
    )
    assert response.status_code == 200, f"Login failed: {response.data}"
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
    return client


@pytest.mark.django_db
class TestNotificationDeleteView:
    def test_user_can_delete_own_notification(self, auth_client, user):
        notif = _make_notification(user)
        response = auth_client.delete(
            reverse("notifications:notification-delete", kwargs={"pk": notif.pk})
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Notification.objects.filter(pk=notif.pk).exists()

    def test_user_cannot_delete_other_users_notification(self, auth_client, other_user):
        notif = _make_notification(other_user)
        response = auth_client.delete(
            reverse("notifications:notification-delete", kwargs={"pk": notif.pk})
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert Notification.objects.filter(pk=notif.pk).exists()

    def test_anonymous_cannot_delete_notification(self, api_client, user):
        notif = _make_notification(user)
        response = api_client.delete(
            reverse("notifications:notification-delete", kwargs={"pk": notif.pk})
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_delete_nonexistent_notification_returns_404(self, auth_client):
        response = auth_client.delete(
            reverse("notifications:notification-delete", kwargs={"pk": 999999})
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestNotificationBulkDeleteView:
    def test_bulk_delete_own_notifications(self, auth_client, user):
        n1 = _make_notification(user)
        n2 = _make_notification(user)
        n3 = _make_notification(user)
        response = auth_client.post(
            reverse("notifications:bulk-delete"),
            {"ids": [n1.pk, n2.pk]},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["deleted"] == 2
        assert not Notification.objects.filter(pk=n1.pk).exists()
        assert not Notification.objects.filter(pk=n2.pk).exists()
        assert Notification.objects.filter(pk=n3.pk).exists()

    def test_bulk_delete_silently_ignores_other_users_notifications(self, auth_client, user, other_user):
        own = _make_notification(user)
        other = _make_notification(other_user)
        response = auth_client.post(
            reverse("notifications:bulk-delete"),
            {"ids": [own.pk, other.pk]},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["deleted"] == 1
        assert Notification.objects.filter(pk=other.pk).exists()

    def test_bulk_delete_requires_ids(self, auth_client):
        response = auth_client.post(
            reverse("notifications:bulk-delete"),
            {},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_bulk_delete_requires_non_empty_ids(self, auth_client):
        response = auth_client.post(
            reverse("notifications:bulk-delete"),
            {"ids": []},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_anonymous_cannot_bulk_delete(self, api_client):
        response = api_client.post(
            reverse("notifications:bulk-delete"),
            {"ids": [1]},
            format="json",
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestNotificationClearAllView:
    def test_clear_all_deletes_own_notifications(self, auth_client, user):
        _make_notification(user)
        _make_notification(user)
        response = auth_client.delete(reverse("notifications:clear-all"))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["deleted"] == 2
        assert Notification.objects.filter(user=user).count() == 0

    def test_clear_all_does_not_delete_other_users_notifications(self, auth_client, user, other_user):
        _make_notification(user)
        other_notif = _make_notification(other_user)
        auth_client.delete(reverse("notifications:clear-all"))
        assert Notification.objects.filter(pk=other_notif.pk).exists()

    def test_anonymous_cannot_clear_all(self, api_client):
        response = api_client.delete(reverse("notifications:clear-all"))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_clear_all_with_no_notifications(self, auth_client):
        response = auth_client.delete(reverse("notifications:clear-all"))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["deleted"] == 0


@pytest.mark.django_db
class TestNotificationBulkMarkReadView:
    def test_bulk_mark_read_own_notifications(self, auth_client, user):
        n1 = _make_notification(user, is_read=False)
        n2 = _make_notification(user, is_read=False)
        response = auth_client.post(
            reverse("notifications:bulk-mark-read"),
            {"ids": [n1.pk, n2.pk]},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["updated"] == 2
        n1.refresh_from_db()
        n2.refresh_from_db()
        assert n1.is_read is True
        assert n2.is_read is True

    def test_bulk_mark_read_already_read_notifications(self, auth_client, user):
        n1 = _make_notification(user, is_read=True)
        response = auth_client.post(
            reverse("notifications:bulk-mark-read"),
            {"ids": [n1.pk]},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["updated"] == 0

    def test_bulk_mark_read_ignores_other_users_notifications(self, auth_client, user, other_user):
        own = _make_notification(user, is_read=False)
        other = _make_notification(other_user, is_read=False)
        response = auth_client.post(
            reverse("notifications:bulk-mark-read"),
            {"ids": [own.pk, other.pk]},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["updated"] == 1
        other.refresh_from_db()
        assert other.is_read is False

    def test_bulk_mark_read_requires_ids(self, auth_client):
        response = auth_client.post(
            reverse("notifications:bulk-mark-read"),
            {},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_anonymous_cannot_bulk_mark_read(self, api_client):
        response = api_client.post(
            reverse("notifications:bulk-mark-read"),
            {"ids": [1]},
            format="json",
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestNotificationUnreadCountView:
    def test_unread_count_returns_correct_count(self, auth_client, user):
        _make_notification(user, is_read=False)
        _make_notification(user, is_read=False)
        _make_notification(user, is_read=True)
        response = auth_client.get(reverse("notifications:unread-count"))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["unread_count"] == 2

    def test_unread_count_zero_when_no_notifications(self, auth_client):
        response = auth_client.get(reverse("notifications:unread-count"))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["unread_count"] == 0

    def test_unread_count_only_counts_own_notifications(self, auth_client, user, other_user):
        _make_notification(user, is_read=False)
        _make_notification(other_user, is_read=False)
        _make_notification(other_user, is_read=False)
        response = auth_client.get(reverse("notifications:unread-count"))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["unread_count"] == 1

    def test_anonymous_cannot_get_unread_count(self, api_client):
        response = api_client.get(reverse("notifications:unread-count"))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
