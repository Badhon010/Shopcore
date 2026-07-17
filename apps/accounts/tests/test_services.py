"""Tests for the accounts app services."""
from __future__ import annotations

import pytest
from django.contrib.auth import get_user_model

from apps.accounts.services import change_password, set_default_address, verify_email, email_verification_token_generator
from apps.accounts.tests.factories import AddressFactory, UserFactory

User = get_user_model()


@pytest.mark.django_db
class TestSetDefaultAddress:
    def test_set_default_address(self):
        user = UserFactory()
        addr1 = AddressFactory(user=user, is_default=True)
        addr2 = AddressFactory(user=user, is_default=False)

        set_default_address(user, addr2)

        addr1.refresh_from_db()
        addr2.refresh_from_db()
        assert addr2.is_default is True
        assert addr1.is_default is False

    def test_cannot_set_other_users_address(self):
        user = UserFactory()
        other_user = UserFactory()
        addr = AddressFactory(user=other_user)

        with pytest.raises(ValueError, match="does not belong"):
            set_default_address(user, addr)


@pytest.mark.django_db
class TestChangePassword:
    def test_change_password_success(self):
        user = UserFactory()
        change_password(user, "testpassword123!", "newpassword456!")
        user.refresh_from_db()
        assert user.check_password("newpassword456!")

    def test_change_password_wrong_old(self):
        user = UserFactory()
        with pytest.raises(ValueError, match="incorrect"):
            change_password(user, "wrongpassword", "newpassword456!")


@pytest.mark.django_db
class TestVerifyEmail:
    def test_verify_email_success(self):
        user = UserFactory(is_email_verified=False)
        token = email_verification_token_generator.make_token(user)
        result = verify_email(user, token)
        assert result is True
        user.refresh_from_db()
        assert user.is_email_verified is True

    def test_verify_email_invalid_token(self):
        user = UserFactory(is_email_verified=False)
        result = verify_email(user, "invalid-token")
        assert result is False
