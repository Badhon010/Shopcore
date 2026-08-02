"""End-to-end journey tests spanning the full customer lifecycle.

These tests exercise the public API the way a real customer would:

1. Guest adds to cart (X-Cart-Token header) and checks out → guest order.
2. Guest tracks the order and pays by bank-transfer submission.
3. The account owner registers, verifies their email (claims guest orders),
   and logs in — which claims remaining guest orders AND merges the guest
   cart into their account cart in the same step (audit H-4).
4. Registered checkout → COD payment, manual-submission payment with staff
   review, graceful unconfigured-gateway failure, and refund with inventory
   restock.

Every step goes through the public API (rest_framework.test.APIClient), so
serializers, permissions, the error envelope, and business logic are all
exercised together.
"""
from __future__ import annotations

import pytest
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.test import APIClient

from apps.accounts.models import Address
from apps.accounts.tests.factories import StaffUserFactory, UserFactory
from apps.cart.models import Cart
from apps.inventory.models import StockItem
from apps.inventory.tests.factories import StockItemFactory
from apps.orders.constants import OrderStatus
from apps.orders.models import Order
from apps.payments.constants import PaymentStatus as GatewayPaymentStatus
from apps.payments.models import ManualPaymentSubmission, Payment, PaymentMethod

PASSWORD = "TestPass1234!"

GUEST_ADDRESS = {
    "full_name": "Guest User",
    "phone_number": "+8801711111111",
    "address_line_1": "12 Dhanmondi",
    "address_line_2": "",
    "city": "Dhaka",
    "state_province": "Dhaka",
    "postal_code": "1205",
    "country": "BD",
}


def _default_warehouse():
    # Queried fresh on every call — each pytest-django test runs in its own
    # transaction, so a cached Warehouse instance would be stale (its PK may
    # belong to a previous test's rolled-back DB).
    from apps.inventory.models import Warehouse
    wh = Warehouse.objects.filter(is_default=True).first()
    if wh is None:
        wh = Warehouse.objects.create(name="E2E WH", code="WH-E2E", is_default=True)
    return wh


def _stocked_variant(qty: int = 10):
    return StockItemFactory(
        quantity_on_hand=qty, quantity_reserved=0, warehouse=_default_warehouse()
    ).variant


def _guest_checkout_payload(email: str, phone: str = "+8801711111111", key: str = "e2e-idem-1"):
    return {
        "guest_name": "Guest User",
        "guest_email": email,
        "guest_phone": phone,
        "shipping_address": dict(GUEST_ADDRESS, phone_number=phone),
        "idempotency_key": key,
    }


def _add_guest_item(client: APIClient, token: str, variant, qty: int = 1):
    return client.post(
        reverse("cart:cart-item-list"),
        {"variant_id": variant.pk, "quantity": qty},
        HTTP_X_CART_TOKEN=token,
        format="json",
    )


def _place_guest_order(client: APIClient, token: str, email: str, key: str):
    """Create a guest cart with one item and check out."""
    variant = _stocked_variant()
    assert _add_guest_item(client, token, variant).status_code == 201
    return variant, client.post(
        reverse("orders:order-checkout"),
        _guest_checkout_payload(email, key=key),
        HTTP_X_CART_TOKEN=token,
        format="json",
    )


def _register(client: APIClient, email: str):
    return client.post(
        reverse("accounts:register"),
        {
            "email": email,
            "password": PASSWORD,
            "password_confirm": PASSWORD,
            "first_name": "Alice",
            "last_name": "Example",
        },
        format="json",
    )


def _verify_email(client: APIClient, user) -> None:
    from apps.accounts.services import email_verification_token_generator
    token = email_verification_token_generator.make_token(user)
    response = client.post(
        reverse("accounts:verify-email"),
        {"uid": urlsafe_base64_encode(force_bytes(user.pk)), "token": token},
        format="json",
    )
    assert response.status_code == 204, response.data


def _login(client: APIClient, email: str, guest_token: str | None = None):
    kwargs = {}
    if guest_token:
        kwargs["HTTP_X_CART_TOKEN"] = guest_token
    return client.post(
        reverse("accounts:login"),
        {"email": email, "password": PASSWORD},
        format="json",
        **kwargs,
    )


def _bank_transfer_method() -> PaymentMethod:
    return PaymentMethod.objects.get(provider="BANK_TRANSFER")


def _create_user_address(client: APIClient, user) -> Address:
    response = client.post(
        reverse("accounts:address-list"),
        {
            "full_name": user.full_name or user.email,
            "phone_number": "+8801711111111",
            "address_line_1": "12 Dhanmondi",
            "address_line_2": "",
            "city": "Dhaka",
            "state_province": "Dhaka",
            "postal_code": "1205",
            "country": "BD",
            "address_type": "SHIPPING",
            "is_default": True,
        },
        format="json",
    )
    assert response.status_code == 201, response.data
    return Address.objects.get(pk=response.data["id"])


def _auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def _place_registered_order(client: APIClient, address_id: int, variant) -> dict:
    add = client.post(
        reverse("cart:cart-item-list"),
        {"variant_id": variant.pk, "quantity": 1},
        format="json",
    )
    assert add.status_code == 201, add.data
    response = client.post(
        reverse("orders:order-checkout"),
        {"shipping_address_id": address_id, "billing_address_id": address_id},
        format="json",
    )
    assert response.status_code == 201, response.data
    return response.data


@pytest.mark.django_db
class TestGuestIdentityJourney:
    """Guest orders get claimed and the guest cart merged on login (H-4)."""

    def test_verify_claims_order_then_login_claims_second_and_merges_cart(self):
        client = APIClient()
        email = "alice@e2e.example.com"

        # --- Guest journey 1: place a guest order with the future account email
        _, resp_a = _place_guest_order(client, "e2e-token-a", email, key="e2e-key-a")
        assert resp_a.status_code == 201, resp_a.data
        order_a = Order.objects.get(order_number=resp_a.data["order_number"])
        assert order_a.user_id is None
        assert order_a.status == OrderStatus.PENDING_PAYMENT

        # --- Register + verify → the order is claimed automatically
        assert _register(client, email).status_code == 201
        from django.contrib.auth import get_user_model
        user = get_user_model().objects.get(email=email)
        _verify_email(client, user)
        order_a.refresh_from_db()
        assert order_a.user_id == user.pk

        # --- Guest journey 2: a second guest order placed BEFORE login
        _, resp_b = _place_guest_order(client, "e2e-token-b", email, key="e2e-key-b")
        assert resp_b.status_code == 201, resp_b.data
        order_b = Order.objects.get(order_number=resp_b.data["order_number"])
        assert order_b.user_id is None

        # Add a further item to the guest cart AFTER checkout (creates a fresh
        # active guest cart for the same token) so the merge has something to
        # bring over on login.
        variant_c = _stocked_variant()
        assert _add_guest_item(client, "e2e-token-b", variant_c, qty=2).status_code == 201

        # --- Login with the guest cart token: claims order B + merges cart
        login = _login(client, email, guest_token="e2e-token-b")
        assert login.status_code == 200, login.data
        assert login.data["guest_orders_claimed"] == 1
        order_b.refresh_from_db()
        assert order_b.user_id == user.pk

        # User cart contains the post-checkout guest items (merged), not the
        # items already consumed by order B.
        user_cart = Cart.objects.get(user=user, is_active=True)
        assert user_cart.items.count() == 1
        merged = user_cart.items.first()
        assert merged.variant_id == variant_c.pk
        assert merged.quantity == 2

        # The active guest cart was deactivated by the merge.
        assert not Cart.objects.filter(
            session_key="e2e-token-b", user=None, is_active=True
        ).exists()

    def test_unverified_user_cannot_login(self):
        client = APIClient()
        email = "blocked@e2e.example.com"
        assert _register(client, email).status_code == 201
        login = _login(client, email)
        assert login.status_code == 400
        assert login.data["error"]["code"] == "VALIDATION_ERROR"
        assert login.data["error"]["details"]["code"] == ["EMAIL_NOT_VERIFIED"]


@pytest.mark.django_db
class TestGuestManualPayment:
    """A guest pays via bank-transfer submission before the account exists."""

    def test_guest_submission_and_admin_approval(self):
        client = APIClient()
        email = "guestpay@e2e.example.com"
        variant, resp = _place_guest_order(client, "e2e-token-pay", email, key="e2e-key-pay")
        assert resp.status_code == 201, resp.data
        order = Order.objects.get(order_number=resp.data["order_number"])
        lookup_token = resp.data["guest_lookup_token"]

        # Guest tracks the order by phone
        track = client.post(
            reverse("orders:order-track"),
            {"order_number": order.order_number, "phone_number": "+8801711111111"},
            format="json",
        )
        assert track.status_code == 200, track.data

        # Guest submits a manual payment with the lookup secret (phone)
        submit = client.post(
            reverse("payments:payment-submit"),
            {
                "order_number": order.order_number,
                "method_id": _bank_transfer_method().pk,
                "reference_number": "TRX-GUEST-001",
                "notes": "Paid from mobile banking",
                "phone_number": "+8801711111111",
            },
            format="json",
        )
        assert submit.status_code == 201, submit.data
        submission = ManualPaymentSubmission.objects.get(pk=submit.data["id"])
        assert submission.status == ManualPaymentSubmission.Status.PENDING
        assert submission.user_id is None

        # Wrong secret cannot submit for the order
        wrong = client.post(
            reverse("payments:payment-submit"),
            {
                "order_number": order.order_number,
                "method_id": _bank_transfer_method().pk,
                "reference_number": "TRX-GUEST-BAD",
                "phone_number": "+8801799999999",
            },
            format="json",
        )
        assert wrong.status_code == 400
        assert wrong.data["error"]["code"] == "PAYMENT_SUBMISSION_ERROR"

        # Staff approves → order paid, submission approved, Payment recorded
        staff = StaffUserFactory()
        review = _auth_client(staff).post(
            reverse("payments:payment-submission-admin-review", args=[submission.pk]),
            {"approve": True, "admin_note": "Confirmed with bank."},
            format="json",
        )
        assert review.status_code == 200, review.data
        submission.refresh_from_db()
        order.refresh_from_db()
        assert submission.status == ManualPaymentSubmission.Status.APPROVED
        assert order.payment_status == "PAID"
        assert order.status == OrderStatus.PAID
        assert Payment.objects.filter(order=order, status=GatewayPaymentStatus.SUCCEEDED).exists()

        # lookup_token was never persisted in plain text
        assert order.guest_lookup_token != lookup_token


@pytest.mark.django_db
class TestRegisteredPaymentFlows:
    """Registered checkout, COD, duplicate guard, manual review, refund."""

    def _user_with_address(self):
        user = UserFactory()
        client = _auth_client(user)
        address = _create_user_address(client, user)
        return user, client, address

    def test_cod_payment_and_duplicate_guard(self):
        user, client, address = self._user_with_address()
        variant = _stocked_variant()
        order_data = _place_registered_order(client, address.pk, variant)
        order = Order.objects.get(order_number=order_data["order_number"])

        initiate = client.post(
            reverse("payments:payment-initiate"),
            {"order_number": order.order_number, "provider": "MANUAL"},
            format="json",
        )
        assert initiate.status_code == 200, initiate.data
        order.refresh_from_db()
        assert order.status == OrderStatus.PAID
        assert order.payment_status == "PAID"

        # Duplicate initiate is rejected
        dup = client.post(
            reverse("payments:payment-initiate"),
            {"order_number": order.order_number, "provider": "MANUAL"},
            format="json",
        )
        assert dup.status_code in (400, 409)
        assert dup.data["error"]["code"] == "DUPLICATE_PAYMENT"

    def test_manual_submission_review_and_refund_restocks(self):
        user, client, address = self._user_with_address()
        variant = _stocked_variant(qty=5)
        order_data = _place_registered_order(client, address.pk, variant)
        order = Order.objects.get(order_number=order_data["order_number"])

        submit = client.post(
            reverse("payments:payment-submit"),
            {
                "order_number": order.order_number,
                "method_id": _bank_transfer_method().pk,
                "reference_number": "TRX-REG-002",
                "notes": "Bank transfer reference",
            },
            format="json",
        )
        assert submit.status_code == 201, submit.data
        submission = ManualPaymentSubmission.objects.get(pk=submit.data["id"])
        assert submission.user_id == user.pk

        # Non-owner cannot review or submit
        stranger = _auth_client(UserFactory())
        forbidden = stranger.post(
            reverse("payments:payment-submit"),
            {
                "order_number": order.order_number,
                "method_id": _bank_transfer_method().pk,
                "reference_number": "TRX-EVIL",
            },
            format="json",
        )
        assert forbidden.status_code == 404  # same envelope as missing order

        # Staff approve → paid
        staff = StaffUserFactory()
        review = _auth_client(staff).post(
            reverse("payments:payment-submission-admin-review", args=[submission.pk]),
            {"approve": True},
            format="json",
        )
        assert review.status_code == 200, review.data
        order.refresh_from_db()
        assert order.status == OrderStatus.PAID

        stock = StockItem.objects.get(variant=variant)
        assert stock.quantity_on_hand == 4  # 5 - 1 committed

        # Refund → order REFUNDED and stock restored (return movement)
        refund = _auth_client(staff).post(
            reverse("orders:order-refund", args=[order.order_number]), {}, format="json"
        )
        assert refund.status_code == 201, refund.data
        order.refresh_from_db()
        assert order.status == OrderStatus.REFUNDED
        stock.refresh_from_db()
        assert stock.quantity_on_hand == 5
        assert stock.quantity_reserved == 0

    def test_gateway_failures_are_graceful(self):
        user, client, address = self._user_with_address()
        variant = _stocked_variant()
        order_data = _place_registered_order(client, address.pk, variant)
        order = Order.objects.get(order_number=order_data["order_number"])

        # 1) Disabled gateway method → graceful 400, order untouched.
        initiate = client.post(
            reverse("payments:payment-initiate"),
            {"order_number": order.order_number, "provider": "STRIPE"},
            format="json",
        )
        assert initiate.status_code == 400, initiate.data
        assert initiate.data["error"]["code"] == "PAYMENT_METHOD_NOT_AVAILABLE"
        order.refresh_from_db()
        assert order.status == OrderStatus.PENDING_PAYMENT
        assert order.payment_status == "PENDING"

        # 2) Enabled method but no env credentials (H-3) → GATEWAY_NOT_CONFIGURED.
        PaymentMethod.objects.filter(provider="STRIPE").update(is_enabled=True)
        initiate2 = client.post(
            reverse("payments:payment-initiate"),
            {"order_number": order.order_number, "provider": "STRIPE"},
            format="json",
        )
        assert initiate2.status_code == 400, initiate2.data
        assert initiate2.data["error"]["code"] == "GATEWAY_NOT_CONFIGURED"
        order.refresh_from_db()
        assert order.status == OrderStatus.PENDING_PAYMENT
        assert order.payment_status == "PENDING"
