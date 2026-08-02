from __future__ import annotations

from django.db import models


class NotificationType(models.TextChoices):
    ORDER_CONFIRMATION = "ORDER_CONFIRMATION", "Order Confirmation"
    ORDER_SHIPPED = "ORDER_SHIPPED", "Order Shipped"
    ORDER_DELIVERED = "ORDER_DELIVERED", "Order Delivered"
    PASSWORD_RESET = "PASSWORD_RESET", "Password Reset"
    EMAIL_VERIFICATION = "EMAIL_VERIFICATION", "Email Verification"
    WELCOME = "WELCOME", "Welcome"
    LOW_STOCK_ALERT = "LOW_STOCK_ALERT", "Low Stock Alert"
    NEWSLETTER_CONFIRMATION = "NEWSLETTER_CONFIRMATION", "Newsletter Confirmation"
    CONTACT_RECEIVED = "CONTACT_RECEIVED", "Contact Form Received"
    PAYMENT_SUBMISSION = "PAYMENT_SUBMISSION", "Manual Payment Submission"


class NotificationChannel(models.TextChoices):
    EMAIL = "EMAIL", "Email"


class NotificationStatus(models.TextChoices):
    SENT = "SENT", "Sent"
    FAILED = "FAILED", "Failed"
