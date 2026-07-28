"""Tests for the notifications app views."""
from __future__ import annotations

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.tests.factories import UserFactory
from apps.notifications.models import Notification


def _make_notification(user, is_read=False, title="Test notification"):
    return Notification.objects.create(
        user=user,
        title=title,
        body="Test notification body.",
        notification_type=Notification.Type.SYSTEM,
        is_read=is_read,
    )


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return UserFactory()


@pytest.fixture
def other_user(db):
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


# ── List ───────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestNotificationListView:
    def test_anonymous_user_cannot_access_notifications(self, api_client):
        response = api_client.get(reverse("notifications:list"))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_authenticated_user_can_list_notifications(self, auth_client, user):
        _make_notification(user)
        _make_notification(user)
        response = auth_client.get(reverse("notifications:list"))
        assert response.status_code == status.HTTP_200_OK
        results = response.data.get("results", response.data)
        assert len(results) == 2

    def test_user_only_sees_own_notifications(self, auth_client, user, other_user):
        _make_notification(user)
        _make_notification(other_user)
        _make_notification(other_user)
        response = auth_client.get(reverse("notifications:list"))
        assert response.status_code == status.HTTP_200_OK
        results = response.data.get("results", response.data)
        assert len(results) == 1


# ── Mark single read ───────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestMarkNotificationReadView:
    def test_mark_notification_as_read(self, auth_client, user):
        notif = _make_notification(user, is_read=False)
        response = auth_client.post(
            reverse("notifications:mark-read", kwargs={"pk": notif.pk})
        )
        assert response.status_code == status.HTTP_200_OK
        notif.refresh_from_db()
        assert notif.is_read is True

    def test_mark_already_read_notification_is_idempotent(self, auth_client, user):
        notif = _make_notification(user, is_read=True)
        response = auth_client.post(
            reverse("notifications:mark-read", kwargs={"pk": notif.pk})
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["is_read"] is True

    def test_cannot_mark_other_users_notification(self, auth_client, other_user):
        notif = _make_notification(other_user, is_read=False)
        response = auth_client.post(
            reverse("notifications:mark-read", kwargs={"pk": notif.pk})
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_mark_nonexistent_notification_returns_404(self, auth_client):
        response = auth_client.post(
            reverse("notifications:mark-read", kwargs={"pk": 999999})
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND


# ── Mark all read ──────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestMarkAllNotificationsReadView:
    def test_mark_all_notifications_as_read(self, auth_client, user):
        _make_notification(user, is_read=False)
        _make_notification(user, is_read=False)
        response = auth_client.post(reverse("notifications:mark-all-read"))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["updated"] == 2
        assert Notification.objects.filter(user=user, is_read=False).count() == 0

    def test_mark_all_read_skips_already_read(self, auth_client, user):
        _make_notification(user, is_read=True)
        _make_notification(user, is_read=False)
        response = auth_client.post(reverse("notifications:mark-all-read"))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["updated"] == 1

    def test_anonymous_user_cannot_mark_all_read(self, api_client):
        response = api_client.post(reverse("notifications:mark-all-read"))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_only_own_notifications_marked(self, auth_client, user, other_user):
        _make_notification(user, is_read=False)
        other_notif = _make_notification(other_user, is_read=False)
        auth_client.post(reverse("notifications:mark-all-read"))
        other_notif.refresh_from_db()
        # Other user's notification untouched
        assert other_notif.is_read is False


# ── Delete single ──────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestNotificationDeleteView:
    def test_delete_own_notification(self, auth_client, user):
        notif = _make_notification(user)
        url = reverse("notifications:notification-delete", kwargs={"pk": notif.pk})
        response = auth_client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Notification.objects.filter(pk=notif.pk).exists()

    def test_cannot_delete_other_users_notification(self, auth_client, other_user):
        notif = _make_notification(other_user)
        url = reverse("notifications:notification-delete", kwargs={"pk": notif.pk})
        response = auth_client.delete(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert Notification.objects.filter(pk=notif.pk).exists()

    def test_delete_nonexistent_notification_returns_404(self, auth_client):
        url = reverse("notifications:notification-delete", kwargs={"pk": 999999})
        response = auth_client.delete(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_anonymous_cannot_delete(self, api_client, user):
        notif = _make_notification(user)
        url = reverse("notifications:notification-delete", kwargs={"pk": notif.pk})
        response = api_client.delete(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ── Bulk delete ────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestNotificationBulkDeleteView:
    def test_bulk_delete_own_notifications(self, auth_client, user):
        n1 = _make_notification(user)
        n2 = _make_notification(user)
        url = reverse("notifications:bulk-delete")
        response = auth_client.post(url, {"ids": [n1.pk, n2.pk]}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["deleted"] == 2
        assert not Notification.objects.filter(pk__in=[n1.pk, n2.pk]).exists()

    def test_bulk_delete_only_affects_own_notifications(self, auth_client, user, other_user):
        own = _make_notification(user)
        others = _make_notification(other_user)
        url = reverse("notifications:bulk-delete")
        response = auth_client.post(url, {"ids": [own.pk, others.pk]}, format="json")
        assert response.status_code == status.HTTP_200_OK
        # Only own is deleted; other user's notification is silently excluded
        assert response.data["deleted"] == 1
        assert not Notification.objects.filter(pk=own.pk).exists()
        assert Notification.objects.filter(pk=others.pk).exists()

    def test_bulk_delete_empty_ids_rejected(self, auth_client):
        url = reverse("notifications:bulk-delete")
        response = auth_client.post(url, {"ids": []}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_bulk_delete_anonymous_rejected(self, api_client):
        url = reverse("notifications:bulk-delete")
        response = api_client.post(url, {"ids": [1]}, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ── Clear all ──────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestNotificationClearAllView:
    def test_clear_all_deletes_own_notifications(self, auth_client, user):
        _make_notification(user)
        _make_notification(user)
        url = reverse("notifications:clear-all")
        response = auth_client.delete(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["deleted"] == 2
        assert Notification.objects.filter(user=user).count() == 0

    def test_clear_all_does_not_delete_other_users_notifications(self, auth_client, user, other_user):
        _make_notification(user)
        other_notif = _make_notification(other_user)
        url = reverse("notifications:clear-all")
        auth_client.delete(url)
        assert Notification.objects.filter(pk=other_notif.pk).exists()

    def test_clear_all_on_empty_inbox_returns_zero(self, auth_client, user):
        url = reverse("notifications:clear-all")
        response = auth_client.delete(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["deleted"] == 0

    def test_anonymous_cannot_clear_all(self, api_client):
        url = reverse("notifications:clear-all")
        response = api_client.delete(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ── Bulk mark read ─────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestNotificationBulkMarkReadView:
    def test_bulk_mark_read(self, auth_client, user):
        n1 = _make_notification(user, is_read=False)
        n2 = _make_notification(user, is_read=False)
        url = reverse("notifications:bulk-mark-read")
        response = auth_client.post(url, {"ids": [n1.pk, n2.pk]}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["updated"] == 2
        n1.refresh_from_db()
        n2.refresh_from_db()
        assert n1.is_read is True
        assert n2.is_read is True

    def test_bulk_mark_read_skips_already_read(self, auth_client, user):
        n1 = _make_notification(user, is_read=True)
        n2 = _make_notification(user, is_read=False)
        url = reverse("notifications:bulk-mark-read")
        response = auth_client.post(url, {"ids": [n1.pk, n2.pk]}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["updated"] == 1

    def test_bulk_mark_read_ignores_other_users_notifications(self, auth_client, other_user):
        other_notif = _make_notification(other_user, is_read=False)
        url = reverse("notifications:bulk-mark-read")
        response = auth_client.post(url, {"ids": [other_notif.pk]}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["updated"] == 0
        other_notif.refresh_from_db()
        assert other_notif.is_read is False

    def test_bulk_mark_read_empty_ids_rejected(self, auth_client):
        url = reverse("notifications:bulk-mark-read")
        response = auth_client.post(url, {"ids": []}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_anonymous_cannot_bulk_mark_read(self, api_client):
        url = reverse("notifications:bulk-mark-read")
        response = api_client.post(url, {"ids": [1]}, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ── Unread count ───────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestNotificationUnreadCountView:
    def test_unread_count_zero_on_empty_inbox(self, auth_client):
        response = auth_client.get(reverse("notifications:unread-count"))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["unread_count"] == 0

    def test_unread_count_reflects_unread_only(self, auth_client, user):
        _make_notification(user, is_read=False)
        _make_notification(user, is_read=False)
        _make_notification(user, is_read=True)
        response = auth_client.get(reverse("notifications:unread-count"))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["unread_count"] == 2

    def test_unread_count_excludes_other_users(self, auth_client, other_user):
        _make_notification(other_user, is_read=False)
        _make_notification(other_user, is_read=False)
        response = auth_client.get(reverse("notifications:unread-count"))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["unread_count"] == 0

    def test_anonymous_cannot_get_unread_count(self, api_client):
        response = api_client.get(reverse("notifications:unread-count"))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
