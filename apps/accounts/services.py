"""Business logic services for the accounts app."""
from __future__ import annotations

import logging

from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.db import transaction

from apps.accounts.models import Address

User = get_user_model()
logger = logging.getLogger("shopcore.accounts.services")


class EmailVerificationTokenGenerator(PasswordResetTokenGenerator):
    """Token generator for email verification links.

    Subclasses Django's built-in generator so we don't need a separate DB table.
    The token is verified via the standard check_token() method.
    """

    def _make_hash_value(self, user, timestamp: int) -> str:
        return f"{user.pk}{timestamp}{user.is_email_verified}{user.email}"


email_verification_token_generator = EmailVerificationTokenGenerator()


class ResetPasswordTokenGenerator(PasswordResetTokenGenerator):
    """Token generator for password reset links.

    Unlike Django's ``default_token_generator``, the token hash does NOT
    include ``user.last_login``. With ``SIMPLE_JWT.UPDATE_LAST_LOGIN = True``,
    logging in after requesting a reset link would otherwise silently
    invalidate the token — the user sees a mysterious 400 and cannot reset
    their password. Changing the password still invalidates outstanding
    tokens because the hash includes ``user.password``.
    """

    def _make_hash_value(self, user, timestamp: int) -> str:
        return f"{user.pk}{timestamp}{user.password}"


password_reset_token_generator = ResetPasswordTokenGenerator()


def register_user(email: str, password: str, first_name: str = "", last_name: str = "") -> User:
    """Create a new user account and send a verification email.

    Args:
        email: The user's email address.
        password: The raw password (will be hashed).
        first_name: Optional first name.
        last_name: Optional last name.

    Returns:
        The newly created User instance.

    Raises:
        ValueError: If a user with this email already exists.
    """
    if User.objects.filter(email=email).exists():
        raise ValueError(f"A user with email '{email}' already exists.")

    with transaction.atomic():
        user = User.objects.create_user(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
        )

    # Send welcome + verification email (imported here to avoid circular imports)
    try:
        from apps.notifications.services import send_welcome_email
        send_welcome_email(user)
    except Exception:
        logger.warning("Failed to send welcome email to %s", email, exc_info=True)

    return user


def set_default_address(user: User, address: Address) -> Address:
    """Set an address as the user's default, atomically unsetting the previous default.

    Args:
        user: The user who owns the address.
        address: The address to make default.

    Returns:
        The updated address.

    Raises:
        ValueError: If the address does not belong to the user.
    """
    if address.user_id != user.pk:
        raise ValueError("Address does not belong to this user.")

    with transaction.atomic():
        # Unset any existing default
        Address.objects.filter(user=user, is_default=True).exclude(pk=address.pk).update(
            is_default=False
        )
        address.is_default = True
        address.save(update_fields=["is_default"])

    return address


def blacklist_all_refresh_tokens(user: User) -> None:
    """Blacklist every outstanding JWT refresh token for a user.

    Called after any password mutation so that stolen tokens cannot be reused
    even if an attacker obtained them before the password change.

    Failures are caught and logged — a token-blacklist backend error must
    never prevent a password change from completing.

    Args:
        user: The user whose tokens should be revoked.
    """
    try:
        from rest_framework_simplejwt.token_blacklist.models import (
            BlacklistedToken,
            OutstandingToken,
        )
        for token in OutstandingToken.objects.filter(user=user):
            BlacklistedToken.objects.get_or_create(token=token)
        logger.info("Blacklisted all refresh tokens for user %s", user.email)
    except Exception:
        logger.warning(
            "Failed to blacklist refresh tokens for user %s — tokens may still be valid",
            user.email,
            exc_info=True,
        )


def change_password(user: User, old_password: str, new_password: str) -> None:
    """Change a user's password, verifying the old password first.

    Args:
        user: The user changing their password.
        old_password: The current raw password.
        new_password: The new raw password.

    Raises:
        ValueError: If the old password is incorrect.
    """
    if not user.check_password(old_password):
        raise ValueError("Old password is incorrect.")

    user.set_password(new_password)
    user.save(update_fields=["password"])

    # Revoke all outstanding refresh tokens so a stolen token cannot be
    # used after the user changes their password.
    blacklist_all_refresh_tokens(user)

    logger.info("Password changed for user %s", user.email)


def send_password_reset_email(email: str) -> None:
    """Send a password reset email if the account exists.

    Deliberately does not reveal whether the account exists (security).

    Args:
        email: The email address to send the reset link to.
    """
    try:
        user = User.objects.get(email=email, is_active=True)
    except User.DoesNotExist:
        # Do not reveal whether the account exists
        logger.debug("Password reset requested for non-existent email: %s", email)
        return

    try:
        from apps.notifications.services import send_password_reset_email as _send
        _send(user)
    except Exception:
        logger.warning("Failed to send password reset email to %s", email, exc_info=True)


def send_verification_email(user: User) -> None:
    """Send an email verification link to the user.

    Args:
        user: The user to send the verification email to.
    """
    try:
        from apps.notifications.services import send_email_verification
        send_email_verification(user)
    except Exception:
        logger.warning("Failed to send verification email to %s", user.email, exc_info=True)


def verify_email(user: User, token: str) -> bool:
    """Verify a user's email using a token.

    Args:
        user: The user to verify.
        token: The verification token.

    Returns:
        True if verification succeeded, False if the token is invalid.
    """
    if email_verification_token_generator.check_token(user, token):
        user.is_email_verified = True
        user.save(update_fields=["is_email_verified"])
        # Verified email is proof of ownership → claim any previous guest
        # orders placed with this email (audit H-4 "verified automatic claim").
        claim_guest_orders(user)
        return True
    return False


def claim_guest_orders(user: User, by_phone: bool = False) -> int:
    """Claim a user's previous guest orders (audit H-4).

    Called automatically after email verification and on login (email is
    verified at that point). Guest orders whose guest_email matches the user's
    verified email are re-attached to the account (Order.user set), so the
    customer sees their full history without duplicate orders.

    Args:
        user: The verified user claiming guest orders.
        by_phone: Also claim orders that match the user's phone number only
            (used on login when phone matches). Defaults to False — email
            matching is the primary verified identity.

    Returns:
        The number of claimed orders.
    """
    from django.db.models import Q

    from apps.orders.models import Order

    if not user.is_email_verified and not by_phone:
        # Never claim orders for an unverified identity (audit H-4 rule).
        return 0

    qs = Order.objects.filter(user__isnull=True).filter(
        Q(guest_email__iexact=user.email)
    )
    if by_phone and user.phone_number:
        qs = qs | Order.objects.filter(
            user__isnull=True, guest_phone=user.phone_number
        )

    claimed = 0
    with transaction.atomic():
        for order in qs.distinct().iterator():
            # Guard: never overwrite an existing owner.
            if order.user_id is None:
                order.user = user
                order.save(update_fields=["user", "updated_at"])
                claimed += 1

    if claimed:
        logger.info(
            "Claimed %d guest order(s) for user %s", claimed, user.email
        )
    return claimed


def merge_guest_cart_on_login(user: User, session_key: str | None) -> None:
    """Merge a guest cart into the user's cart after login (audit H-4).

    Called from the login serializer when an X-Cart-Token header is present.
    Never raises — a missing/invalid guest cart is a silent no-op.
    """
    if not session_key:
        return
    try:
        from apps.cart.services import merge_guest_cart_into_user_cart
        merge_guest_cart_into_user_cart(user, session_key[:40])
    except Exception:
        logger.warning(
            "Failed to merge guest cart (session=%s) for user %s",
            session_key, user.email, exc_info=True,
        )
