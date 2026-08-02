"""Custom DRF throttle classes for sensitive endpoints.

Two design rules used everywhere in this module:

1. **CORS preflight (OPTIONS) requests never consume throttle budget.**
   DRF's ``APIView.initial()`` calls ``check_throttles()`` for every HTTP
   method, including the ``OPTIONS`` preflights the browser fires before
   cross-origin requests that carry custom headers (``X-Cart-Token``,
   ``Content-Type: application/json``). A storefront triggers one preflight
   per real request, so counting them doubles traffic and exhausts the
   per-IP anonymous bucket for no security benefit — preflights carry no
   business payload. Every throttle in this module skips them.

2. **The narrow per-endpoint scopes are the real anti-abuse controls.**
   The global ``anon``/``user`` buckets are deliberately generous (a single
   home-page load issues several anonymous GETs: banners, category tree,
   brands, featured products, cart …). Tight rates belong on the scopes
   below (login, register, password reset, coupon, order track, refresh).
"""
from __future__ import annotations

from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class _SkipPreflightMixin:
    """Never throttle browser CORS preflight (OPTIONS) requests."""

    def allow_request(self, request, view) -> bool:
        if request.method == "OPTIONS":
            return True
        return super().allow_request(request, view)


class StorefrontAnonRateThrottle(_SkipPreflightMixin, AnonRateThrottle):
    """Default anonymous bucket (per IP) — preflights excluded."""


class StorefrontUserRateThrottle(_SkipPreflightMixin, UserRateThrottle):
    """Default authenticated bucket (per user) — preflights excluded."""


class LoginRateThrottle(_SkipPreflightMixin, UserRateThrottle):
    """Tight throttle for login endpoint: 5 per minute."""

    scope = "login"


class RegisterRateThrottle(_SkipPreflightMixin, AnonRateThrottle):
    """Throttle for registration endpoint: 10 per hour."""

    scope = "register"


class PasswordResetRequestThrottle(_SkipPreflightMixin, AnonRateThrottle):
    """Throttle for password-reset-request endpoint: 5 per hour."""

    scope = "password_reset_request"


class ResendVerificationThrottle(_SkipPreflightMixin, AnonRateThrottle):
    """Throttle for resend-verification endpoint: 5 per hour."""

    scope = "resend_verification"


class CouponApplyThrottle(_SkipPreflightMixin, UserRateThrottle):
    """Throttle for coupon application endpoint: 20 per minute."""

    scope = "coupon_apply"


class OrderTrackThrottle(_SkipPreflightMixin, AnonRateThrottle):
    """Throttle for guest order tracking to prevent order-number probing."""

    scope = "order_track"


class TokenRefreshThrottle(_SkipPreflightMixin, AnonRateThrottle):
    """Throttle for the JWT refresh endpoint.

    Dedicated scope so token refresh is never starved by (or able to
    exhaust) the shared anonymous bucket that also covers catalog reads
    and guest cart traffic. The rate is generous for a real client (one
    refresh per page load at most) while still blocking refresh-token
    brute force.
    """

    scope = "token_refresh"
