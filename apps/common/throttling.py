"""Custom DRF throttle classes for sensitive endpoints."""
from __future__ import annotations

from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class LoginRateThrottle(UserRateThrottle):
    """Tight throttle for login endpoint: 5 per minute."""

    scope = "login"


class RegisterRateThrottle(AnonRateThrottle):
    """Throttle for registration endpoint: 10 per hour."""

    scope = "register"


class PasswordResetRequestThrottle(AnonRateThrottle):
    """Throttle for password-reset-request endpoint: 5 per hour."""

    scope = "password_reset_request"


class ResendVerificationThrottle(AnonRateThrottle):
    """Throttle for resend-verification endpoint: 5 per hour."""

    scope = "resend_verification"


class CouponApplyThrottle(UserRateThrottle):
    """Throttle for coupon application endpoint: 20 per minute."""

    scope = "coupon_apply"
