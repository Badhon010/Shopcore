"""Custom validators for the accounts app."""
from __future__ import annotations

from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _


class LetterAndDigitPasswordValidator:
    """Require passwords to contain at least one letter and one digit.

    This validator is registered in settings.AUTH_PASSWORD_VALIDATORS.
    """

    def validate(self, password: str, user=None) -> None:
        """Raise ValidationError if password lacks a letter or digit.

        Args:
            password: The raw password string.
            user: The user instance (unused but required by Django's validator interface).

        Raises:
            ValidationError: If the password does not meet the requirement.
        """
        has_letter = any(c.isalpha() for c in password)
        has_digit = any(c.isdigit() for c in password)
        if not has_letter or not has_digit:
            raise ValidationError(
                _("Password must contain at least one letter and one digit."),
                code="password_no_letter_or_digit",
            )

    def get_help_text(self) -> str:
        return _("Your password must contain at least one letter and one digit.")
