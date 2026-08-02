from __future__ import annotations

from django.db import models


class PaymentProvider(models.TextChoices):
    MANUAL = "MANUAL", "Manual / Cash on Delivery"
    BANK_TRANSFER = "BANK_TRANSFER", "Bank Transfer"
    BKASH = "BKASH", "bKash"
    NAGAD = "NAGAD", "Nagad"
    ROCKET = "ROCKET", "Rocket"
    SSLCOMMERZ = "SSLCOMMERZ", "SSLCommerz"
    STRIPE = "STRIPE", "Stripe"
    PAYPAL = "PAYPAL", "PayPal"


class PaymentStatus(models.TextChoices):
    INITIATED = "INITIATED", "Initiated"
    SUCCEEDED = "SUCCEEDED", "Succeeded"
    FAILED = "FAILED", "Failed"
    REFUNDED = "REFUNDED", "Refunded"
