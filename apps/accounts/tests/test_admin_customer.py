"""Tests for admin customer management endpoints."""
from __future__ import annotations

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.tests.factories import StaffUserFactory, UserFactory


@pytest.fixture
def admin_client():
    staff = StaffUserFactory()
    client = APIClient()
    client.force_authenticate(user=staff)
    return client, staff


@pytest.fixture
def plain_client():
    user = UserFactory()
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
class TestAdminUserActivateView:
    def test_activate_user(self, admin_client):
        client, _ = admin_client
        target = UserFactory(is_active=False)
        url = reverse("accounts:admin-user-activate", kwargs={"pk": target.pk})
        response = client.post(url)
        assert response.status_code == status.HTTP_200_OK
        target.refresh_from_db()
        assert target.is_active is True

    def test_activate_nonexistent_user(self, admin_client):
        client, _ = admin_client
        url = reverse("accounts:admin-user-activate", kwargs={"pk": 999999})
        response = client.post(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_activate_requires_admin(self, plain_client):
        target = UserFactory(is_active=False)
        url = reverse("accounts:admin-user-activate", kwargs={"pk": target.pk})
        response = plain_client.post(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_activate_requires_auth(self):
        target = UserFactory(is_active=False)
        client = APIClient()
        url = reverse("accounts:admin-user-activate", kwargs={"pk": target.pk})
        response = client.post(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestAdminUserDeactivateView:
    def test_deactivate_user(self, admin_client):
        client, _ = admin_client
        target = UserFactory(is_active=True)
        url = reverse("accounts:admin-user-deactivate", kwargs={"pk": target.pk})
        response = client.post(url)
        assert response.status_code == status.HTTP_200_OK
        target.refresh_from_db()
        assert target.is_active is False

    def test_cannot_deactivate_self(self, admin_client):
        client, staff = admin_client
        url = reverse("accounts:admin-user-deactivate", kwargs={"pk": staff.pk})
        response = client.post(url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["error"]["code"] == "SELF_DEACTIVATION"

    def test_deactivate_requires_admin(self, plain_client):
        target = UserFactory()
        url = reverse("accounts:admin-user-deactivate", kwargs={"pk": target.pk})
        response = plain_client.post(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestAdminUserSuspendView:
    def test_suspend_user(self, admin_client):
        client, _ = admin_client
        target = UserFactory(is_active=True)
        url = reverse("accounts:admin-user-suspend", kwargs={"pk": target.pk})
        response = client.post(url)
        assert response.status_code == status.HTTP_200_OK
        target.refresh_from_db()
        assert target.is_active is False
        assert "note" in response.data

    def test_cannot_suspend_self(self, admin_client):
        client, staff = admin_client
        url = reverse("accounts:admin-user-suspend", kwargs={"pk": staff.pk})
        response = client.post(url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestAdminUserPromoteStaffView:
    def test_promote_user_to_staff(self, admin_client):
        client, _ = admin_client
        target = UserFactory(is_staff=False)
        url = reverse("accounts:admin-user-promote-staff", kwargs={"pk": target.pk})
        response = client.post(url)
        assert response.status_code == status.HTTP_200_OK
        target.refresh_from_db()
        assert target.is_staff is True

    def test_promote_nonexistent_user(self, admin_client):
        client, _ = admin_client
        url = reverse("accounts:admin-user-promote-staff", kwargs={"pk": 999999})
        response = client.post(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_promote_requires_admin(self, plain_client):
        target = UserFactory()
        url = reverse("accounts:admin-user-promote-staff", kwargs={"pk": target.pk})
        response = plain_client.post(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestAdminUserRemoveStaffView:
    def test_remove_staff_from_user(self, admin_client):
        client, _ = admin_client
        target = StaffUserFactory()
        url = reverse("accounts:admin-user-remove-staff", kwargs={"pk": target.pk})
        response = client.post(url)
        assert response.status_code == status.HTTP_200_OK
        target.refresh_from_db()
        assert target.is_staff is False

    def test_cannot_remove_own_staff(self, admin_client):
        client, staff = admin_client
        url = reverse("accounts:admin-user-remove-staff", kwargs={"pk": staff.pk})
        response = client.post(url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["error"]["code"] == "SELF_DEMOTION"

    def test_remove_staff_requires_admin(self, plain_client):
        target = StaffUserFactory()
        url = reverse("accounts:admin-user-remove-staff", kwargs={"pk": target.pk})
        response = plain_client.post(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestAdminUserResetPasswordView:
    def test_trigger_password_reset(self, admin_client):
        client, _ = admin_client
        target = UserFactory()
        url = reverse("accounts:admin-user-reset-password", kwargs={"pk": target.pk})
        response = client.post(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_reset_password_nonexistent_user(self, admin_client):
        client, _ = admin_client
        url = reverse("accounts:admin-user-reset-password", kwargs={"pk": 999999})
        response = client.post(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_reset_password_requires_admin(self, plain_client):
        target = UserFactory()
        url = reverse("accounts:admin-user-reset-password", kwargs={"pk": target.pk})
        response = plain_client.post(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestAdminUserForceVerifyEmailView:
    def test_force_verify_email(self, admin_client):
        client, _ = admin_client
        target = UserFactory(is_email_verified=False)
        url = reverse("accounts:admin-user-verify-email", kwargs={"pk": target.pk})
        response = client.post(url)
        assert response.status_code == status.HTTP_200_OK
        target.refresh_from_db()
        assert target.is_email_verified is True

    def test_force_verify_nonexistent_user(self, admin_client):
        client, _ = admin_client
        url = reverse("accounts:admin-user-verify-email", kwargs={"pk": 999999})
        response = client.post(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_force_verify_requires_admin(self, plain_client):
        target = UserFactory(is_email_verified=False)
        url = reverse("accounts:admin-user-verify-email", kwargs={"pk": target.pk})
        response = plain_client.post(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestAdminUserUpdateView:
    def test_update_user_fields(self, admin_client):
        client, _ = admin_client
        target = UserFactory(first_name="Old", last_name="Name")
        url = reverse("accounts:admin-user-update", kwargs={"pk": target.pk})
        response = client.patch(url, {"first_name": "New", "last_name": "Name2"}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["first_name"] == "New"
        assert response.data["last_name"] == "Name2"

    def test_password_not_exposed(self, admin_client):
        client, _ = admin_client
        target = UserFactory()
        url = reverse("accounts:admin-user-update", kwargs={"pk": target.pk})
        response = client.patch(url, {"first_name": "X"}, format="json")
        assert "password" not in response.data

    def test_cannot_demote_self(self, admin_client):
        client, staff = admin_client
        url = reverse("accounts:admin-user-update", kwargs={"pk": staff.pk})
        response = client.patch(url, {"is_staff": False}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["error"]["code"] == "SELF_DEMOTION"

    def test_update_requires_admin(self, plain_client):
        target = UserFactory()
        url = reverse("accounts:admin-user-update", kwargs={"pk": target.pk})
        response = plain_client.patch(url, {"first_name": "X"}, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestAdminUserBulkActionView:
    def get_url(self):
        return reverse("accounts:admin-user-bulk-action")

    def test_bulk_activate(self, admin_client):
        client, _ = admin_client
        users = [UserFactory(is_active=False) for _ in range(3)]
        ids = [u.pk for u in users]
        response = client.post(self.get_url(), {"action": "activate", "ids": ids}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["updated"] == 3
        assert response.data["errors"] == []
        for u in users:
            u.refresh_from_db()
            assert u.is_active is True

    def test_bulk_deactivate(self, admin_client):
        client, _ = admin_client
        users = [UserFactory(is_active=True) for _ in range(2)]
        ids = [u.pk for u in users]
        response = client.post(self.get_url(), {"action": "deactivate", "ids": ids}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["updated"] == 2

    def test_bulk_deactivate_skips_self(self, admin_client):
        client, staff = admin_client
        target = UserFactory(is_active=True)
        ids = [staff.pk, target.pk]
        response = client.post(self.get_url(), {"action": "deactivate", "ids": ids}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["updated"] == 1
        assert len(response.data["errors"]) == 1

    def test_bulk_promote_staff(self, admin_client):
        client, _ = admin_client
        users = [UserFactory(is_staff=False) for _ in range(2)]
        ids = [u.pk for u in users]
        response = client.post(self.get_url(), {"action": "promote_staff", "ids": ids}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["updated"] == 2
        for u in users:
            u.refresh_from_db()
            assert u.is_staff is True

    def test_bulk_remove_staff_skips_self(self, admin_client):
        client, staff = admin_client
        target = StaffUserFactory()
        ids = [staff.pk, target.pk]
        response = client.post(self.get_url(), {"action": "remove_staff", "ids": ids}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["updated"] == 1
        assert len(response.data["errors"]) == 1

    def test_bulk_action_invalid_ids(self, admin_client):
        client, _ = admin_client
        response = client.post(self.get_url(), {"action": "activate", "ids": [999998, 999999]}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["updated"] == 0
        assert len(response.data["errors"]) == 2

    def test_bulk_action_requires_admin(self, plain_client):
        response = plain_client.post(
            self.get_url(), {"action": "activate", "ids": [1]}, format="json"
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_bulk_action_invalid_action(self, admin_client):
        client, _ = admin_client
        response = client.post(self.get_url(), {"action": "delete_all", "ids": [1]}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_bulk_action_empty_ids(self, admin_client):
        client, _ = admin_client
        response = client.post(self.get_url(), {"action": "activate", "ids": []}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
