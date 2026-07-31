"""Tests for the coupon serializer: date defaults, date-only input, partial updates."""
from __future__ import annotations

from datetime import timedelta

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.coupons.models import Coupon
from apps.coupons.tests.factories import CouponFactory


@pytest.fixture
def staff_client(db):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    user = User.objects.create_user(
        email="coupon-admin@example.com",
        password="pass",
        is_staff=True,
    )
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
class TestCouponSerializerDateHandling:
    def test_create_without_dates_defaults_to_now_plus_30_days(self, staff_client):
        url = reverse("coupons:coupon-list-create")
        response = staff_client.post(
            url,
            {"code": "NODATE1", "discount_type": "PERCENTAGE", "discount_value": "10.00"},
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED
        coupon = Coupon.objects.get(code="NODATE1")
        now = timezone.now()
        assert coupon.valid_from <= now + timedelta(seconds=10)
        assert coupon.valid_until >= now + timedelta(days=29)
        assert coupon.valid_until <= now + timedelta(days=31)

    def test_create_with_date_only_input_parses(self, staff_client):
        url = reverse("coupons:coupon-list-create")
        response = staff_client.post(
            url,
            {
                "code": "DATED1",
                "discount_type": "PERCENTAGE",
                "discount_value": "10.00",
                "valid_from": "2026-08-01",
                "valid_until": "2026-08-31",
            },
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED
        coupon = Coupon.objects.get(code="DATED1")
        assert coupon.valid_from.date().isoformat() == "2026-08-01"
        assert coupon.valid_until.date().isoformat() == "2026-08-31"

    def test_create_rejects_invalid_window(self, staff_client):
        url = reverse("coupons:coupon-list-create")
        response = staff_client.post(
            url,
            {
                "code": "BADWINDOW",
                "discount_type": "PERCENTAGE",
                "discount_value": "10.00",
                "valid_from": "2026-09-01",
                "valid_until": "2026-08-01",
            },
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_partial_patch_preserves_existing_window(self, staff_client):
        coupon = CouponFactory(
            code="PATCHP",
            valid_from=timezone.now() - timedelta(days=10),
            valid_until=timezone.now() + timedelta(days=10),
        )
        url = reverse("coupons:coupon-detail", kwargs={"pk": coupon.pk})
        response = staff_client.patch(url, {"is_active": False}, format="json")
        assert response.status_code == status.HTTP_200_OK
        coupon.refresh_from_db()
        # The existing window must not be clobbered by the now→+30d default.
        assert coupon.valid_until >= timezone.now() + timedelta(days=9)
        assert coupon.valid_until <= timezone.now() + timedelta(days=11)
        assert not coupon.is_active

    def test_partial_patch_with_null_dates_keeps_existing(self, staff_client):
        coupon = CouponFactory(code="PATCHNULL")
        url = reverse("coupons:coupon-detail", kwargs={"pk": coupon.pk})
        original_from = coupon.valid_from
        original_until = coupon.valid_until
        response = staff_client.patch(
            url, {"valid_from": None, "valid_until": None}, format="json"
        )
        assert response.status_code == status.HTTP_200_OK
        coupon.refresh_from_db()
        assert coupon.valid_from == original_from
        assert coupon.valid_until == original_until
