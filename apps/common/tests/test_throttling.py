"""Regression tests for storefront throttling.

Covers the two design rules in ``apps/common/throttling.py``:
1. CORS preflight (OPTIONS) requests never consume throttle budget.
2. The global ``anon``/``user`` buckets stay generous while narrow
   per-endpoint scopes (login, token refresh, …) remain active.
"""
from __future__ import annotations

import pytest
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory
from rest_framework.views import APIView

from apps.common.throttling import (
    LoginRateThrottle,
    StorefrontAnonRateThrottle,
    StorefrontUserRateThrottle,
    TokenRefreshThrottle,
)

pytestmark = pytest.mark.django_db


class DummyView(APIView):
    pass


def _request(method: str, path: str) -> Request:
    return Request(getattr(APIRequestFactory(), method)(path))


class TestPreflightBypass:
    def test_options_never_throttled_even_when_bucket_exhausted(self):
        class Tiny(StorefrontAnonRateThrottle):
            rate = "1/min"
            scope = "test_preflight_anon"

        tiny = Tiny()
        view = DummyView()

        # Consume the only GET slot…
        assert tiny.allow_request(_request("get", "/x/"), view) is True
        # …a second GET is denied…
        assert tiny.allow_request(_request("get", "/x/"), view) is False
        # …but an OPTIONS preflight is always allowed and does not help or
        # hurt the bucket (it is never recorded).
        assert tiny.allow_request(_request("options", "/x/"), view) is True
        assert tiny.allow_request(_request("options", "/x/"), view) is True

    def test_options_bypass_for_user_and_scoped_throttles(self):
        view = DummyView()
        for throttle in (
            StorefrontUserRateThrottle(),
            LoginRateThrottle(),
        ):
            assert throttle.allow_request(_request("options", "/x/"), view) is True


class TestBucketStillEnforces:
    def test_get_requests_are_counted_and_denied_over_rate(self):
        class Tiny(StorefrontAnonRateThrottle):
            rate = "2/min"
            scope = "test_bucket_anon"

        tiny = Tiny()
        view = DummyView()
        assert tiny.allow_request(_request("get", "/x/"), view) is True
        assert tiny.allow_request(_request("get", "/x/"), view) is True
        assert tiny.allow_request(_request("get", "/x/"), view) is False


class TestWiring:
    def test_storefront_default_classes_map_to_anon_and_user_scopes(self):
        # The exact string paths live in config/settings/base.py
        # (DEFAULT_THROTTLE_CLASSES); test settings deliberately disable the
        # global classes, so assert the classes themselves are wired to the
        # right scopes instead.
        assert StorefrontAnonRateThrottle().scope == "anon"
        assert StorefrontUserRateThrottle().scope == "user"

    def test_all_required_scopes_are_defined(self):
        from django.conf import settings

        rates = settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]
        for scope in (
            "anon",
            "user",
            "login",
            "register",
            "password_reset_request",
            "resend_verification",
            "coupon_apply",
            "order_track",
            "token_refresh",
        ):
            assert scope in rates, f"missing throttle scope {scope!r}"

    def test_token_refresh_view_uses_dedicated_scope(self):
        from apps.accounts.views import ThrottledTokenRefreshView

        assert ThrottledTokenRefreshView.throttle_classes == [TokenRefreshThrottle]
        assert TokenRefreshThrottle().scope == "token_refresh"
