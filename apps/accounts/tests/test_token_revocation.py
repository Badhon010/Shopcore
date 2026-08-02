"""Tests for H1: JWT refresh-token revocation on password mutation.

After change_password() or PasswordResetConfirmView, every outstanding
refresh token for the user must be blacklisted so stolen tokens cannot
be reused even after the user has secured their account.

Token creation uses RefreshToken.for_user() directly (bypasses the login
endpoint and its per-view throttle classes, which are not configured in
the test settings).
"""
from __future__ import annotations

import pytest
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.services import (
    blacklist_all_refresh_tokens,
    change_password,
    password_reset_token_generator,
)
from apps.accounts.tests.factories import UserFactory


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_refresh_token(user) -> str:
    """Create an OutstandingToken in the DB and return the refresh token string."""
    token = RefreshToken.for_user(user)
    return str(token)


def _try_refresh(refresh_token_str: str) -> int:
    """Attempt to exchange a refresh token; return the HTTP status code."""
    client = APIClient()
    response = client.post(
        reverse("accounts:token-refresh"),
        {"refresh": refresh_token_str},
        format="json",
    )
    return response.status_code


# ---------------------------------------------------------------------------
# blacklist_all_refresh_tokens helper
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestBlacklistAllRefreshTokens:
    def test_blacklist_invalidates_refresh_token(self):
        """After blacklist_all_refresh_tokens(), the refresh token must no
        longer be accepted by the token-refresh endpoint."""
        user = UserFactory()
        refresh = _make_refresh_token(user)

        # Token works before revocation.
        assert _try_refresh(refresh) == status.HTTP_200_OK

        # After the first successful refresh the token was rotated; create a
        # fresh one so we have an outstanding token to revoke.
        fresh_refresh = _make_refresh_token(user)

        blacklist_all_refresh_tokens(user)

        assert _try_refresh(fresh_refresh) == status.HTTP_401_UNAUTHORIZED

    def test_blacklist_is_safe_on_user_with_no_tokens(self):
        """Calling blacklist_all_refresh_tokens() on a user who has no
        OutstandingToken rows must not raise."""
        user = UserFactory()
        blacklist_all_refresh_tokens(user)  # must not raise


# ---------------------------------------------------------------------------
# change_password revokes tokens
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestChangePasswordRevokesTokens:
    def test_refresh_token_rejected_after_change_password(self):
        """A refresh token obtained before change_password() must be
        rejected after the password is changed."""
        user = UserFactory()
        refresh = _make_refresh_token(user)

        # Verify the token works before the password change.
        assert _try_refresh(refresh) == status.HTTP_200_OK

        # The first refresh rotated the token; grab a new outstanding one.
        fresh_refresh = _make_refresh_token(user)

        # Change the password — must blacklist all outstanding tokens.
        change_password(user, "testpassword123!", "newpassword789!")

        assert _try_refresh(fresh_refresh) == status.HTTP_401_UNAUTHORIZED

    def test_wrong_old_password_does_not_revoke_tokens(self):
        """A failed password change must not affect outstanding tokens."""
        user = UserFactory()
        refresh = _make_refresh_token(user)

        with pytest.raises(ValueError, match="incorrect"):
            change_password(user, "wrongpassword!", "newpassword789!")

        # Token must still work — password change was rejected.
        assert _try_refresh(refresh) == status.HTTP_200_OK

    def test_multiple_outstanding_tokens_all_revoked(self):
        """All outstanding tokens for the user are revoked, not just the
        most recent one."""
        user = UserFactory()
        refresh1 = _make_refresh_token(user)
        refresh2 = _make_refresh_token(user)
        refresh3 = _make_refresh_token(user)

        change_password(user, "testpassword123!", "newpassword789!")

        assert _try_refresh(refresh1) == status.HTTP_401_UNAUTHORIZED
        assert _try_refresh(refresh2) == status.HTTP_401_UNAUTHORIZED
        assert _try_refresh(refresh3) == status.HTTP_401_UNAUTHORIZED


# ---------------------------------------------------------------------------
# PasswordResetConfirmView revokes tokens
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestPasswordResetConfirmRevokesTokens:
    def test_refresh_token_rejected_after_password_reset_confirm(self):
        """A refresh token obtained before PasswordResetConfirmView succeeds
        must be rejected afterwards."""
        user = UserFactory()
        refresh = _make_refresh_token(user)

        # Build a valid password-reset link.
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        reset_token = password_reset_token_generator.make_token(user)

        client = APIClient()
        reset_response = client.post(
            reverse("accounts:password-reset-confirm"),
            {
                "uid": uid,
                "token": reset_token,
                "new_password": "resetpassword999!",
                "new_password_confirm": "resetpassword999!",
            },
            format="json",
        )
        assert reset_response.status_code == status.HTTP_204_NO_CONTENT

        # The refresh token must now be blacklisted.
        assert _try_refresh(refresh) == status.HTTP_401_UNAUTHORIZED

    def test_invalid_reset_token_does_not_revoke_tokens(self):
        """A failed password-reset confirm (bad token) must not affect
        outstanding refresh tokens."""
        user = UserFactory()
        refresh = _make_refresh_token(user)

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        client = APIClient()
        response = client.post(
            reverse("accounts:password-reset-confirm"),
            {
                "uid": uid,
                "token": "invalid-token",
                "new_password": "resetpassword999!",
                "new_password_confirm": "resetpassword999!",
            },
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

        # Token must still work — no password change occurred.
        assert _try_refresh(refresh) == status.HTTP_200_OK

    def test_multiple_tokens_revoked_on_reset(self):
        """All outstanding tokens are revoked by a successful reset, not just
        the one that was most recently created."""
        user = UserFactory()
        refresh1 = _make_refresh_token(user)
        refresh2 = _make_refresh_token(user)

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        reset_token = password_reset_token_generator.make_token(user)

        client = APIClient()
        client.post(
            reverse("accounts:password-reset-confirm"),
            {
                "uid": uid,
                "token": reset_token,
                "new_password": "resetpassword999!",
                "new_password_confirm": "resetpassword999!",
            },
            format="json",
        )

        assert _try_refresh(refresh1) == status.HTTP_401_UNAUTHORIZED
        assert _try_refresh(refresh2) == status.HTTP_401_UNAUTHORIZED

    def test_reset_token_survives_login_before_confirm(self):
        """The reset token must remain valid even if the user logs in after
        requesting the reset (SIMPLE_JWT UPDATE_LAST_LOGIN=True changes
        last_login, which would invalidate Django's default token).
        """
        from django.utils import timezone

        user = UserFactory()
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        reset_token = password_reset_token_generator.make_token(user)

        # Simulate a login after the link was requested.
        user.last_login = timezone.now()
        user.save(update_fields=["last_login"])

        client = APIClient()
        response = client.post(
            reverse("accounts:password-reset-confirm"),
            {
                "uid": uid,
                "token": reset_token,
                "new_password": "resetpassword999!",
                "new_password_confirm": "resetpassword999!",
            },
            format="json",
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT
        user.refresh_from_db()
        assert user.check_password("resetpassword999!")
