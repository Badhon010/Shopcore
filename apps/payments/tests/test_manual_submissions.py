"""Tests for audit H-2: manual payment submission & staff verification.

- POST /payments/submit/          (customer) — creates a PENDING submission.
- GET  /payments/admin/submissions/           (staff) — queue with filters.
- POST /payments/admin/submissions/<pk>/review/ (staff) — approve marks the
  order PAID (records a SUCCEEDED Payment), reject leaves it unpaid.
"""
from __future__ import annotations

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.tests.factories import StaffUserFactory, UserFactory
from apps.orders.constants import OrderStatus, PaymentStatus
from apps.orders.tests.factories import OrderFactory
from apps.payments.constants import PaymentProvider
from apps.payments.constants import PaymentStatus as GatewayPaymentStatus
from apps.payments.models import ManualPaymentSubmission, Payment, PaymentMethod


@pytest.mark.django_db
class TestSubmitManualPayment:
    def _bank_method(self):
        return PaymentMethod.objects.get(provider=PaymentProvider.BANK_TRANSFER)

    def test_customer_submits_reference(self):
        user = UserFactory()
        order = OrderFactory(
            user=user, status=OrderStatus.PENDING_PAYMENT, payment_status=PaymentStatus.PENDING
        )
        method = self._bank_method()
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.post(
            reverse("payments:payment-submit"),
            {
                "order_number": order.order_number,
                "method_id": method.pk,
                "reference_number": "TX-20260711-0001",
                "notes": "Paid from bKash",
            },
            format="json",
        )

        assert response.status_code == 201
        submission = ManualPaymentSubmission.objects.get(order=order)
        assert submission.reference_number == "TX-20260711-0001"
        assert submission.status == ManualPaymentSubmission.Status.PENDING
        assert submission.method_id == method.pk

    def test_customer_submits_with_receipt_upload(self):
        user = UserFactory()
        order = OrderFactory(user=user, status=OrderStatus.PENDING_PAYMENT)
        client = APIClient()
        client.force_authenticate(user=user)
        receipt = SimpleUploadedFile(
            "receipt.png", b"fake-image-bytes", content_type="image/png"
        )

        response = client.post(
            reverse("payments:payment-submit"),
            {
                "order_number": order.order_number,
                "reference_number": "TX-RECEIPT-1",
                "receipt": receipt,
            },
            format="multipart",
        )

        assert response.status_code == 201
        submission = ManualPaymentSubmission.objects.get(order=order)
        assert submission.receipt.name.endswith(".png")

    def test_cannot_submit_for_paid_order(self):
        user = UserFactory()
        order = OrderFactory(
            user=user, status=OrderStatus.PAID, payment_status=PaymentStatus.PAID
        )
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.post(
            reverse("payments:payment-submit"),
            {"order_number": order.order_number, "reference_number": "TX-1"},
            format="json",
        )

        assert response.status_code == 400
        assert response.data["error"]["code"] == "PAYMENT_SUBMISSION_ERROR"

    def test_cannot_submit_for_someone_elses_order(self):
        owner = UserFactory()
        other = UserFactory()
        order = OrderFactory(user=owner, status=OrderStatus.PENDING_PAYMENT)
        client = APIClient()
        client.force_authenticate(user=other)

        response = client.post(
            reverse("payments:payment-submit"),
            {"order_number": order.order_number, "reference_number": "TX-1"},
            format="json",
        )

        assert response.status_code == 404
        assert response.data["error"]["code"] == "ORDER_NOT_FOUND"

    def test_cannot_submit_with_disabled_method(self):
        user = UserFactory()
        order = OrderFactory(user=user, status=OrderStatus.PENDING_PAYMENT)
        stripe = PaymentMethod.objects.get(provider=PaymentProvider.STRIPE)  # disabled
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.post(
            reverse("payments:payment-submit"),
            {
                "order_number": order.order_number,
                "method_id": stripe.pk,
                "reference_number": "TX-1",
            },
            format="json",
        )

        assert response.status_code == 400
        assert response.data["error"]["code"] == "PAYMENT_SUBMISSION_ERROR"


@pytest.mark.django_db
class TestReviewManualPayment:
    def _pending_submission(self, user):
        order = OrderFactory(
            user=user, status=OrderStatus.PENDING_PAYMENT, payment_status=PaymentStatus.PENDING
        )
        method = PaymentMethod.objects.get(provider=PaymentProvider.BANK_TRANSFER)
        return ManualPaymentSubmission.objects.create(
            order=order,
            user=user,
            method=method,
            reference_number="TX-REV-1",
            status=ManualPaymentSubmission.Status.PENDING,
        )

    def test_approve_marks_order_paid(self):
        staff = StaffUserFactory()
        user = UserFactory()
        submission = self._pending_submission(user)
        client = APIClient()
        client.force_authenticate(user=staff)

        response = client.post(
            reverse("payments:payment-submission-admin-review", args=[submission.pk]),
            {"approve": True, "admin_note": "Verified from bank statement."},
            format="json",
        )

        assert response.status_code == 200
        submission.refresh_from_db()
        assert submission.status == ManualPaymentSubmission.Status.APPROVED
        assert submission.admin_note == "Verified from bank statement."

        order = submission.order
        order.refresh_from_db()
        assert order.status == OrderStatus.PAID
        assert order.payment_status == PaymentStatus.PAID

        payment = Payment.objects.get(order=order)
        assert payment.status == GatewayPaymentStatus.SUCCEEDED
        assert payment.provider == PaymentProvider.BANK_TRANSFER

    def test_reject_leaves_order_unpaid(self):
        staff = StaffUserFactory()
        user = UserFactory()
        submission = self._pending_submission(user)
        client = APIClient()
        client.force_authenticate(user=staff)

        response = client.post(
            reverse("payments:payment-submission-admin-review", args=[submission.pk]),
            {"approve": False, "admin_note": "Reference not found."},
            format="json",
        )

        assert response.status_code == 200
        submission.refresh_from_db()
        assert submission.status == ManualPaymentSubmission.Status.REJECTED

        order = submission.order
        order.refresh_from_db()
        assert order.status == OrderStatus.PENDING_PAYMENT
        assert not Payment.objects.filter(order=order).exists()

    def test_non_staff_cannot_review(self):
        user = UserFactory()
        submission = self._pending_submission(user)
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.post(
            reverse("payments:payment-submission-admin-review", args=[submission.pk]),
            {"approve": True},
            format="json",
        )
        assert response.status_code == 403

    def test_double_review_blocked(self):
        staff = StaffUserFactory()
        user = UserFactory()
        submission = self._pending_submission(user)
        client = APIClient()
        client.force_authenticate(user=staff)

        first = client.post(
            reverse("payments:payment-submission-admin-review", args=[submission.pk]),
            {"approve": True},
            format="json",
        )
        assert first.status_code == 200

        second = client.post(
            reverse("payments:payment-submission-admin-review", args=[submission.pk]),
            {"approve": True},
            format="json",
        )
        assert second.status_code == 409
        assert second.data["error"]["code"] == "SUBMISSION_ALREADY_REVIEWED"

    def test_staff_can_list_and_filter_submissions(self):
        staff = StaffUserFactory()
        user = UserFactory()
        submission = self._pending_submission(user)
        client = APIClient()
        client.force_authenticate(user=staff)

        response = client.get(reverse("payments:payment-submission-admin-list"))
        assert response.status_code == 200
        assert response.data["count"] == 1
        assert response.data["results"][0]["reference_number"] == "TX-REV-1"

        response = client.get(
            reverse("payments:payment-submission-admin-list"), {"status": "APPROVED"}
        )
        assert response.data["count"] == 0

        response = client.get(
            reverse("payments:payment-submission-admin-list"),
            {"order_number": submission.order.order_number},
        )
        assert response.data["count"] == 1
