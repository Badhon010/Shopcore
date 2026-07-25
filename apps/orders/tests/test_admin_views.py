"""Regression tests for the staff order listing endpoint."""
from __future__ import annotations

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.tests.factories import StaffUserFactory, UserFactory
from apps.orders.tests.factories import OrderFactory


@pytest.mark.django_db
class TestAdminOrderListView:
    def test_staff_can_list_all_orders(self):
        staff = StaffUserFactory()
        customer = UserFactory()
        OrderFactory(user=customer)
        client = APIClient()
        client.force_authenticate(user=staff)

        response = client.get(reverse("orders:order-admin-list"), {"page_size": 10})

        assert response.status_code == 200
        assert response.data["count"] == 1
        order = response.data["results"][0]
        assert order["user_email"] == customer.email
        assert order["created_at"]
        assert order["placed_at"]

    def test_non_staff_cannot_list_all_orders(self):
        client = APIClient()
        client.force_authenticate(user=UserFactory())

        response = client.get(reverse("orders:order-admin-list"))

        assert response.status_code == 403