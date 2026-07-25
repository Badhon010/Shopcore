"""URL configuration for the accounts app."""
from __future__ import annotations

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from apps.accounts.views import (
    AddressDetailView,
    AddressListCreateView,
    AdminUserDetailView,
    AdminUserListView,
    ChangePasswordView,
    LoginView,
    LogoutView,
    MeView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    RegisterView,
    ResendVerificationEmailView,
    SetDefaultAddressView,
    VerifyEmailView,
)

app_name = "accounts"

urlpatterns = [
    # Auth
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    # Profile
    path("me/", MeView.as_view(), name="me"),
    path("me/change-password/", ChangePasswordView.as_view(), name="change-password"),
    # Password reset
    path("password-reset/", PasswordResetRequestView.as_view(), name="password-reset-request"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    # Email verification
    path("verify-email/", VerifyEmailView.as_view(), name="verify-email"),
    path("resend-verification/", ResendVerificationEmailView.as_view(), name="resend-verification"),
    # Addresses
    path("addresses/", AddressListCreateView.as_view(), name="address-list"),
    path("addresses/<int:pk>/", AddressDetailView.as_view(), name="address-detail"),
    path("addresses/<int:pk>/set-default/", SetDefaultAddressView.as_view(), name="address-set-default"),
    # Admin
    path("admin/users/", AdminUserListView.as_view(), name="admin-user-list"),
    path("admin/users/<int:pk>/", AdminUserDetailView.as_view(), name="admin-user-detail"),
]
