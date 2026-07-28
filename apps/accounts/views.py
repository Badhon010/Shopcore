"""Views for the accounts app."""
from __future__ import annotations

import logging

from django.contrib.auth import get_user_model
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.accounts.models import Address
from apps.accounts.serializers import (
    AddressSerializer,
    AdminBulkActionSerializer,
    AdminUserDetailSerializer,
    AdminUserUpdateSerializer,
    ChangePasswordSerializer,
    CustomTokenObtainPairSerializer,
    EmailVerificationSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    ResendVerificationSerializer,
    UserProfileUpdateSerializer,
    UserRegistrationSerializer,
    UserSerializer,
)
from apps.accounts.services import (
    change_password,
    send_password_reset_email,
    send_verification_email,
    set_default_address,
    verify_email,
)
from apps.common.pagination import StandardResultsSetPagination
from apps.common.permissions import IsOwner
from apps.common.throttling import (
    LoginRateThrottle,
    PasswordResetRequestThrottle,
    RegisterRateThrottle,
    ResendVerificationThrottle,
)

User = get_user_model()
logger = logging.getLogger("shopcore.accounts.views")


class RegisterView(generics.CreateAPIView):
    """Register a new user account."""

    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [RegisterRateThrottle]

    @extend_schema(
        summary="Register a new user",
        responses={201: UserSerializer},
    )
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
    """Login and receive JWT access + refresh tokens."""

    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [LoginRateThrottle]


class LogoutView(APIView):
    """Blacklist the refresh token (logout)."""

    @extend_schema(
        summary="Logout (blacklist refresh token)",
        request={"application/json": {"type": "object", "properties": {"refresh": {"type": "string"}}}},
        responses={204: None},
    )
    def post(self, request, *args, **kwargs):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response(
                {"error": {"code": "MISSING_REFRESH_TOKEN", "message": "Refresh token is required.", "details": {}}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception as exc:
            logger.warning("Logout failed: %s", exc)
            return Response(
                {"error": {"code": "INVALID_TOKEN", "message": "Token is invalid or expired.", "details": {}}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(generics.RetrieveUpdateAPIView):
    """Retrieve or update the authenticated user's profile."""

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return UserProfileUpdateSerializer
        return UserSerializer

    def get_object(self):
        return self.request.user

    @extend_schema(summary="Get current user profile", responses={200: UserSerializer})
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(summary="Update current user profile", responses={200: UserSerializer})
    def patch(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = UserProfileUpdateSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(instance).data)


class ChangePasswordView(APIView):
    """Change the authenticated user's password."""

    @extend_schema(summary="Change password", request=ChangePasswordSerializer, responses={204: None})
    def post(self, request, *args, **kwargs):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            change_password(
                request.user,
                serializer.validated_data["old_password"],
                serializer.validated_data["new_password"],
            )
        except ValueError as exc:
            return Response(
                {"error": {"code": "INVALID_PASSWORD", "message": str(exc), "details": {}}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class PasswordResetRequestView(APIView):
    """Request a password reset email."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [PasswordResetRequestThrottle]

    @extend_schema(summary="Request password reset email", request=PasswordResetRequestSerializer, responses={204: None})
    def post(self, request, *args, **kwargs):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        send_password_reset_email(serializer.validated_data["email"])
        # Always return 204 — do not reveal whether the account exists
        return Response(status=status.HTTP_204_NO_CONTENT)


class PasswordResetConfirmView(APIView):
    """Confirm a password reset."""

    permission_classes = [permissions.AllowAny]

    @extend_schema(summary="Confirm password reset", request=PasswordResetConfirmSerializer, responses={204: None})
    def post(self, request, *args, **kwargs):
        from django.contrib.auth.tokens import default_token_generator

        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            uid = force_str(urlsafe_base64_decode(serializer.validated_data["uid"]))
            user = User.objects.get(pk=uid)
        except (User.DoesNotExist, ValueError, TypeError):
            return Response(
                {"error": {"code": "INVALID_RESET_LINK", "message": "Reset link is invalid.", "details": {}}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not default_token_generator.check_token(user, serializer.validated_data["token"]):
            return Response(
                {"error": {"code": "INVALID_RESET_TOKEN", "message": "Reset token is invalid or expired.", "details": {}}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])

        # Revoke all outstanding refresh tokens so a stolen token cannot be
        # used after the user resets their password.
        from apps.accounts.services import blacklist_all_refresh_tokens
        blacklist_all_refresh_tokens(user)

        return Response(status=status.HTTP_204_NO_CONTENT)


class VerifyEmailView(APIView):
    """Verify a user's email address."""

    permission_classes = [permissions.AllowAny]

    @extend_schema(summary="Verify email address", request=EmailVerificationSerializer, responses={204: None})
    def post(self, request, *args, **kwargs):
        serializer = EmailVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            uid = force_str(urlsafe_base64_decode(serializer.validated_data["uid"]))
            user = User.objects.get(pk=uid)
        except (User.DoesNotExist, ValueError, TypeError):
            return Response(
                {"error": {"code": "INVALID_VERIFICATION_LINK", "message": "Verification link is invalid.", "details": {}}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if verify_email(user, serializer.validated_data["token"]):
            return Response(status=status.HTTP_204_NO_CONTENT)

        return Response(
            {"error": {"code": "INVALID_VERIFICATION_TOKEN", "message": "Verification token is invalid or expired.", "details": {}}},
            status=status.HTTP_400_BAD_REQUEST,
        )


class ResendVerificationEmailView(APIView):
    """Resend the email verification link.

    Intentionally unauthenticated so that users who registered but never
    verified their email (and are therefore blocked from logging in) can
    still request a new link.  The response is always 204 regardless of
    whether the account exists, to prevent email enumeration.
    """

    permission_classes = [permissions.AllowAny]
    throttle_classes = [ResendVerificationThrottle]

    @extend_schema(
        summary="Resend verification email",
        request=ResendVerificationSerializer,
        responses={204: None},
    )
    def post(self, request, *args, **kwargs):
        serializer = ResendVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        try:
            user = User.objects.get(email=email, is_active=True)
            if not user.is_email_verified:
                send_verification_email(user)
        except User.DoesNotExist:
            pass  # Do not reveal whether the account exists

        # Always 204 — no enumeration of account existence or verified state
        return Response(status=status.HTTP_204_NO_CONTENT)


class AddressListCreateView(generics.ListCreateAPIView):
    """List or create addresses for the authenticated user."""

    serializer_class = AddressSerializer

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user).order_by("-is_default", "-created_at")

    def perform_create(self, serializer):
        is_default = serializer.validated_data.get("is_default", False)
        address = serializer.save(user=self.request.user)
        if is_default:
            set_default_address(self.request.user, address)


class AddressDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a specific address."""

    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)

    def perform_update(self, serializer):
        address = serializer.save()
        if serializer.validated_data.get("is_default", False):
            set_default_address(self.request.user, address)


class SetDefaultAddressView(APIView):
    """Set an address as the user's default."""

    @extend_schema(summary="Set default address", responses={200: AddressSerializer})
    def post(self, request, pk, *args, **kwargs):
        try:
            address = Address.objects.get(pk=pk, user=request.user)
        except Address.DoesNotExist:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": "Address not found.", "details": {}}},
                status=status.HTTP_404_NOT_FOUND,
            )
        updated = set_default_address(request.user, address)
        return Response(AddressSerializer(updated).data)


class AdminUserListView(generics.ListAPIView):
    """Staff-only: list all users."""

    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        from django.db.models import Q

        qs = User.objects.all().order_by("-date_joined")
        search = self.request.query_params.get("search", "")
        if search:
            qs = qs.filter(
                Q(email__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
            )
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == "true")
        is_staff = self.request.query_params.get("is_staff")
        if is_staff is not None:
            qs = qs.filter(is_staff=is_staff.lower() == "true")
        return qs


class AdminUserDetailView(generics.RetrieveAPIView):
    """Staff-only: retrieve a specific user."""

    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = User.objects.all()


class AdminUserUpdateView(generics.UpdateAPIView):
    """Staff-only: partial update of a user's safe fields."""

    serializer_class = AdminUserUpdateSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = User.objects.all()
    http_method_names = ["patch"]

    @extend_schema(
        summary="Admin: update user fields",
        request=AdminUserUpdateSerializer,
        responses={200: AdminUserDetailSerializer},
    )
    def patch(self, request, *args, **kwargs):
        user = self.get_object()
        # Prevent self-demotion
        if user == request.user and request.data.get("is_staff") is False:
            return Response(
                {"error": {"code": "SELF_DEMOTION", "message": "You cannot remove your own staff status.", "details": {}}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = self.get_serializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return Response(AdminUserDetailSerializer(updated).data)


class AdminUserActivateView(APIView):
    """Staff-only: activate a user account."""

    permission_classes = [permissions.IsAdminUser]

    @extend_schema(summary="Admin: activate user", responses={200: AdminUserDetailSerializer})
    def post(self, request, pk, *args, **kwargs):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": "User not found.", "details": {}}},
                status=status.HTTP_404_NOT_FOUND,
            )
        user.is_active = True
        user.save(update_fields=["is_active"])
        return Response(AdminUserDetailSerializer(user).data)


class AdminUserDeactivateView(APIView):
    """Staff-only: deactivate a user account. Cannot deactivate self."""

    permission_classes = [permissions.IsAdminUser]

    @extend_schema(summary="Admin: deactivate user", responses={200: AdminUserDetailSerializer})
    def post(self, request, pk, *args, **kwargs):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": "User not found.", "details": {}}},
                status=status.HTTP_404_NOT_FOUND,
            )
        if user == request.user:
            return Response(
                {"error": {"code": "SELF_DEACTIVATION", "message": "You cannot deactivate your own account.", "details": {}}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.is_active = False
        user.save(update_fields=["is_active"])
        return Response(AdminUserDetailSerializer(user).data)


class AdminUserSuspendView(APIView):
    """Staff-only: suspend a user account (maps to is_active=False). Cannot suspend self."""

    permission_classes = [permissions.IsAdminUser]

    @extend_schema(summary="Admin: suspend user", responses={200: AdminUserDetailSerializer})
    def post(self, request, pk, *args, **kwargs):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": "User not found.", "details": {}}},
                status=status.HTTP_404_NOT_FOUND,
            )
        if user == request.user:
            return Response(
                {"error": {"code": "SELF_SUSPENSION", "message": "You cannot suspend your own account.", "details": {}}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.is_active = False
        user.save(update_fields=["is_active"])
        data = dict(AdminUserDetailSerializer(user).data)
        data["note"] = "User account has been suspended (is_active set to False)."
        return Response(data)


class AdminUserPromoteStaffView(APIView):
    """Staff-only: promote a user to staff."""

    permission_classes = [permissions.IsAdminUser]

    @extend_schema(summary="Admin: promote user to staff", responses={200: AdminUserDetailSerializer})
    def post(self, request, pk, *args, **kwargs):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": "User not found.", "details": {}}},
                status=status.HTTP_404_NOT_FOUND,
            )
        user.is_staff = True
        user.save(update_fields=["is_staff"])
        return Response(AdminUserDetailSerializer(user).data)


class AdminUserRemoveStaffView(APIView):
    """Staff-only: remove staff status from a user. Cannot remove own staff."""

    permission_classes = [permissions.IsAdminUser]

    @extend_schema(summary="Admin: remove staff status from user", responses={200: AdminUserDetailSerializer})
    def post(self, request, pk, *args, **kwargs):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": "User not found.", "details": {}}},
                status=status.HTTP_404_NOT_FOUND,
            )
        if user == request.user:
            return Response(
                {"error": {"code": "SELF_DEMOTION", "message": "You cannot remove your own staff status.", "details": {}}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.is_staff = False
        user.save(update_fields=["is_staff"])
        return Response(AdminUserDetailSerializer(user).data)


class AdminUserResetPasswordView(APIView):
    """Staff-only: trigger a password reset email for a user."""

    permission_classes = [permissions.IsAdminUser]

    @extend_schema(summary="Admin: trigger password reset email for user", responses={204: None})
    def post(self, request, pk, *args, **kwargs):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": "User not found.", "details": {}}},
                status=status.HTTP_404_NOT_FOUND,
            )
        send_password_reset_email(user.email)
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminUserForceVerifyEmailView(APIView):
    """Staff-only: force-verify a user's email address."""

    permission_classes = [permissions.IsAdminUser]

    @extend_schema(summary="Admin: force-verify user email", responses={200: AdminUserDetailSerializer})
    def post(self, request, pk, *args, **kwargs):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": "User not found.", "details": {}}},
                status=status.HTTP_404_NOT_FOUND,
            )
        user.is_email_verified = True
        user.save(update_fields=["is_email_verified"])
        return Response(AdminUserDetailSerializer(user).data)


class AdminUserBulkActionView(APIView):
    """Staff-only: apply an action to multiple users at once."""

    permission_classes = [permissions.IsAdminUser]

    @extend_schema(
        summary="Admin: bulk action on users",
        request=AdminBulkActionSerializer,
        responses={200: None},
    )
    def post(self, request, *args, **kwargs):
        serializer = AdminBulkActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        action = serializer.validated_data["action"]
        ids = serializer.validated_data["ids"]

        ACTION_MAP = {
            "activate": {"is_active": True},
            "deactivate": {"is_active": False},
            "promote_staff": {"is_staff": True},
            "remove_staff": {"is_staff": False},
        }
        update_fields = ACTION_MAP[action]
        errors = []
        updated = 0

        for uid in ids:
            try:
                user = User.objects.get(pk=uid)
            except User.DoesNotExist:
                errors.append({"id": uid, "error": "User not found."})
                continue

            # Guard: cannot remove own staff or deactivate self
            if user == request.user:
                if action in ("remove_staff", "deactivate"):
                    errors.append({"id": uid, "error": f"Cannot apply '{action}' to your own account."})
                    continue

            for field, value in update_fields.items():
                setattr(user, field, value)
            user.save(update_fields=list(update_fields.keys()))
            updated += 1

        return Response({"updated": updated, "errors": errors})
