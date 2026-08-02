"""Seed default payment methods.

MANUAL (Cash on Delivery) and BANK_TRANSFER ship enabled because their flows
are fully wired in v1 (MANUAL via the ManualGateway / initiate endpoint,
BANK_TRANSFER via the manual payment submission + staff verification flow).
All gateway-backed methods (BKASH, NAGAD, ROCKET, SSLCOMMERZ, STRIPE, PAYPAL)
ship disabled until their gateways are integrated — enabling a method in the
admin exposes it to the storefront, so gateways must be real before that.
"""

from django.db import migrations

SEED_METHODS = [
    {
        "provider": "MANUAL",
        "name": "Cash on Delivery",
        "description": "Pay in cash when your order is delivered.",
        "is_enabled": True,
        "sort_order": 10,
        "instructions": "Keep the exact amount ready when your order arrives.",
        "is_sandbox": True,
    },
    {
        "provider": "BANK_TRANSFER",
        "name": "Bank Transfer",
        "description": "Pay directly to our bank account, then submit your reference for verification.",
        "is_enabled": True,
        "sort_order": 20,
        "instructions": (
            "Transfer the order total to the account shown below, then submit "
            "your transaction reference on the order page so we can verify it."
        ),
        "is_sandbox": True,
    },
    {
        "provider": "BKASH",
        "name": "bKash",
        "description": "Pay instantly from your bKash wallet.",
        "is_enabled": False,
        "sort_order": 30,
        "instructions": "Send money to the bKash number shown below and submit your TrxID.",
        "is_sandbox": True,
    },
    {
        "provider": "NAGAD",
        "name": "Nagad",
        "description": "Pay instantly from your Nagad wallet.",
        "is_enabled": False,
        "sort_order": 40,
        "instructions": "Send money to the Nagad number shown below and submit your TrxID.",
        "is_sandbox": True,
    },
    {
        "provider": "ROCKET",
        "name": "Rocket",
        "description": "Pay instantly from your Rocket wallet.",
        "is_enabled": False,
        "sort_order": 50,
        "instructions": "Send money to the Rocket number shown below and submit your TrxID.",
        "is_sandbox": True,
    },
    {
        "provider": "SSLCOMMERZ",
        "name": "SSLCommerz",
        "description": "Secure online card / banking payment via SSLCommerz.",
        "is_enabled": False,
        "sort_order": 60,
        "instructions": "You will be redirected to SSLCommerz to complete payment.",
        "is_sandbox": True,
    },
    {
        "provider": "STRIPE",
        "name": "Stripe",
        "description": "Pay by card through Stripe.",
        "is_enabled": False,
        "sort_order": 70,
        "instructions": "You will be redirected to Stripe to complete payment.",
        "is_sandbox": True,
    },
    {
        "provider": "PAYPAL",
        "name": "PayPal",
        "description": "Pay with your PayPal account.",
        "is_enabled": False,
        "sort_order": 80,
        "instructions": "You will be redirected to PayPal to complete payment.",
        "is_sandbox": True,
    },
]


def seed_payment_methods(apps, schema_editor):
    PaymentMethod = apps.get_model("payments", "PaymentMethod")
    for entry in SEED_METHODS:
        PaymentMethod.objects.get_or_create(
            provider=entry["provider"],
            defaults={
                "name": entry["name"],
                "description": entry["description"],
                "is_enabled": entry["is_enabled"],
                "sort_order": entry["sort_order"],
                "instructions": entry["instructions"],
                "is_sandbox": entry["is_sandbox"],
            },
        )


def unseed_payment_methods(apps, schema_editor):
    PaymentMethod = apps.get_model("payments", "PaymentMethod")
    PaymentMethod.objects.filter(
        provider__in=[entry["provider"] for entry in SEED_METHODS]
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("payments", "0003_paymentmethod_alter_payment_provider_and_more"),
    ]

    operations = [
        migrations.RunPython(seed_payment_methods, unseed_payment_methods),
    ]
