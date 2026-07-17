from __future__ import annotations
from django.db import models


class PaymentProvider(models.TextChoices):
    MANUAL = "MANUAL", "Manual / Cash on Delivery"
    STRIPE = "STRIPE", "Stripe"
    SSLCOMMERZ = "SSLCOMMERZ", "SSLCommerz"
    BKASH = "BKASH", "bKash"


class PaymentStatus(models.TextChoices):
    INITIATED = "INITIATED", "Initiated"
    SUCCEEDED = "SUCCEEDED", "Succeeded"
    FAILED = "FAILED", "Failed"
    REFUNDED = "REFUNDED", "Refunded"
