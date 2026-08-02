"""Serializers for the accounts app."""
from __future__ import annotations

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.accounts.models import Address
from apps.accounts.services import register_user

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Extends the default JWT serializer to include user info in the response."""

    def validate(self, attrs: dict) -> dict:
        data = super().validate(attrs)
        # Block login until the user has verified their email address.
        if not self.user.is_email_verified:
            raise serializers.ValidationError(
                {
                    "detail": (
                        "Email address is not verified. "
                        "Please check your inbox and click the verification link "
                        "before logging in."
                    ),
                    "code": "EMAIL_NOT_VERIFIED",
                }
            )
        data["user"] = UserSerializer(self.user).data
        return data


class UserSerializer(serializers.ModelSerializer):
    """Read-only user representation."""

    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "phone_number",
            "is_active",
            "is_email_verified",
            "is_staff",
            "date_joined",
        ]
        read_only_fields = ["id", "email", "is_active", "is_email_verified", "is_staff", "date_joined"]


class UserRegistrationSerializer(serializers.Serializer):
    """Validate and create a new user account."""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=10)
    password_confirm = serializers.CharField(write_only=True)
    first_name = serializers.CharField(max_length=150, required=False, default="")
    last_name = serializers.CharField(max_length=150, required=False, default="")

    def validate_email(self, value: str) -> str:
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.lower()

    def validate(self, attrs: dict) -> dict:
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        validate_password(attrs["password"])
        return attrs

    def create(self, validated_data: dict) -> User:
        validated_data.pop("password_confirm")
        return register_user(**validated_data)


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """Partial update of user profile fields."""

    class Meta:
        model = User
        fields = ["first_name", "last_name", "phone_number"]


class ChangePasswordSerializer(serializers.Serializer):
    """Validate a password change request."""

    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=10)
    new_password_confirm = serializers.CharField(write_only=True)

    def validate(self, attrs: dict) -> dict:
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError(
                {"new_password_confirm": "New passwords do not match."}
            )
        validate_password(attrs["new_password"])
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    """Request a password reset email."""

    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Confirm a password reset with a token."""

    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=10)
    new_password_confirm = serializers.CharField(write_only=True)

    def validate(self, attrs: dict) -> dict:
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError(
                {"new_password_confirm": "Passwords do not match."}
            )
        validate_password(attrs["new_password"])
        return attrs


class EmailVerificationSerializer(serializers.Serializer):
    """Verify an email address."""

    uid = serializers.CharField()
    token = serializers.CharField()


class ResendVerificationSerializer(serializers.Serializer):
    """Request a new verification email (no authentication required)."""

    email = serializers.EmailField()


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    """Partial update of a user's fields by an admin. Never exposes password."""

    class Meta:
        model = User
        fields = ["first_name", "last_name", "is_active", "is_staff", "is_email_verified"]


class AdminUserDetailSerializer(serializers.ModelSerializer):
    """Read-only admin view of a user — no password fields ever."""

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "phone_number",
            "is_active",
            "is_staff",
            "is_email_verified",
            "date_joined",
            "last_login",
        ]
        read_only_fields = fields


class AdminBulkActionSerializer(serializers.Serializer):
    """Validate a bulk action request on a list of user IDs."""

    ACTION_CHOICES = [
        ("activate", "Activate"),
        ("deactivate", "Deactivate"),
        ("promote_staff", "Promote to Staff"),
        ("remove_staff", "Remove Staff"),
    ]

    action = serializers.ChoiceField(choices=ACTION_CHOICES)
    ids = serializers.ListField(child=serializers.IntegerField(min_value=1), min_length=1)


class AddressSerializer(serializers.ModelSerializer):
    """Full address representation."""

    class Meta:
        model = Address
        fields = [
            "id",
            "full_name",
            "phone_number",
            "address_line_1",
            "address_line_2",
            "city",
            "state_province",
            "postal_code",
            "country",
            "address_type",
            "is_default",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_full_name(self, value: str) -> str:
        if not value.strip():
            raise serializers.ValidationError("Full name cannot be blank.")
        return value

    def validate_phone_number(self, value: str) -> str:
        import re
        if not re.match(r"^\+?1?\d{9,15}$", value):
            raise serializers.ValidationError("Enter a valid phone number.")
        return value
