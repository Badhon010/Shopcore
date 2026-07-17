"""Custom managers for the accounts app."""
from __future__ import annotations

from django.contrib.auth.models import BaseUserManager


class UserManager(BaseUserManager):
    """Manager for the custom User model.

    Uses email as the unique identifier instead of username.
    """

    def create_user(self, email: str, password: str, **extra_fields) -> "User":
        """Create and save a regular user.

        Args:
            email: The user's email address (used as USERNAME_FIELD).
            password: The raw password.
            **extra_fields: Additional fields on the User model.

        Returns:
            The created User instance.

        Raises:
            ValueError: If email is not provided.
        """
        if not email:
            raise ValueError("The Email field is required.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email: str, password: str, **extra_fields) -> "User":
        """Create and save a superuser.

        Args:
            email: The user's email address.
            password: The raw password.
            **extra_fields: Additional fields.

        Returns:
            The created superuser instance.
        """
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, password, **extra_fields)
