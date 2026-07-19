"""Tests for the notifications app views."""
from __future__ import annotations

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.tests.factories import UserFactory
from apps.notifications.constants import NotificationChannel, NotificationStatus, NotificationType
from apps.notifications.models import NotificationLog


def _make_notification(user, is_read=False):
    return NotificationLog.objects.create(
        user=user,
        notification_type=NotificationType.ORDER_CONFIRMATION,
        channel=NotificationChannel.EMAIL,
        recipient=user.email,
        subject="Test notification",
        status=NotificationStatus.SENT,
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


@pytest.mark.django_db
class TestNotificationListView:
    def test_anonymous_user_cannot_access_notifications(self, api_client):
        response = api_client.get(reverse("notifications:notification-list"))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_authenticated_user_can_list_notifications(self, auth_client, user):
        _make_notification(user)
        _make_notification(user)
        response = auth_client.get(reverse("notifications:notification-list"))
        assert response.status_code == status.HTTP_200_OK
        results = response.data.get("results", response.data)
        assert len(results) == 2

    def test_user_only_sees_own_notifications(self, auth_client, user, other_user):
        _make_notification(user)
        _make_notification(other_user)
        _make_notification(other_user)
        response = auth_client.get(reverse("notifications:notification-list"))
        assert response.status_code == status.HTTP_200_OK
        results = response.data.get("results", response.data)
        assert len(results) == 1


@pytest.mark.django_db
class TestMarkNotificationReadView:
    def test_mark_notification_as_read(self, auth_client, user):
        notif = _make_notification(user, is_read=False)
        response = auth_client.post(
            reverse("notifications:notification-read", kwargs={"pk": notif.pk})
        )
        assert response.status_code == status.HTTP_200_OK
        notif.refresh_from_db()
        assert notif.is_read is True

    def test_cannot_mark_other_users_notification(self, auth_client, other_user):
        notif = _make_notification(other_user, is_read=False)
        response = auth_client.post(
            reverse("notifications:notification-read", kwargs={"pk": notif.pk})
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_mark_nonexistent_notification_returns_404(self, auth_client):
        response = auth_client.post(
            reverse("notifications:notification-read", kwargs={"pk": 999999})
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestMarkAllNotificationsReadView:
    def test_mark_all_notifications_as_read(self, auth_client, user):
        _make_notification(user, is_read=False)
        _make_notification(user, is_read=False)
        response = auth_client.post(reverse("notifications:notification-read-all"))
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert NotificationLog.objects.filter(user=user, is_read=False).count() == 0

    def test_anonymous_user_cannot_mark_all_read(self, api_client):
        response = api_client.post(reverse("notifications:notification-read-all"))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
