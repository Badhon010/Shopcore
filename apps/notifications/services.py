"""Notification services — wraps Django's EmailMultiAlternatives.

Design principles:
- Every send attempt writes a NotificationLog row regardless of success/failure.
- Email failure NEVER raises an exception to the caller — it is caught, logged,
  and written to NotificationLog. Order placement must succeed even if email fails.
- All functions accept plain arguments so they can be trivially wrapped with
  @shared_task when Celery is added (see config/celery.py).
"""
from __future__ import annotations

import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from apps.notifications.constants import NotificationStatus, NotificationType
from apps.notifications.models import NotificationLog

logger = logging.getLogger("shopcore.notifications.services")


def _site_url() -> str:
    """Return the configured frontend URL for use in email links."""
    return getattr(settings, "FRONTEND_URL", "http://localhost:5000").rstrip("/")


def _admin_url() -> str:
    """Return the Django admin URL base for use in staff notification emails."""
    return getattr(settings, "FRONTEND_URL", "http://localhost:8000").rstrip("/")


def _send_email(
    user,
    notification_type: str,
    recipient_email: str,
    subject: str,
    html_template: str,
    txt_template: str,
    context: dict,
) -> None:
    """Internal helper that sends email and always logs the result.

    Args:
        user: User instance (or None for staff alerts).
        notification_type: NotificationType choice string.
        recipient_email: The destination email address.
        subject: Email subject line.
        html_template: Path to the HTML email template.
        txt_template: Path to the plain-text email template.
        context: Template context dict.
    """
    # Always inject site_url so every template can build absolute links.
    context.setdefault("site_url", _site_url())

    html_content = render_to_string(html_template, context)
    txt_content = render_to_string(txt_template, context)

    status = NotificationStatus.SENT
    error_message = ""

    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=txt_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[recipient_email],
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=False)
    except Exception as exc:
        logger.error(
            "Failed to send %s to %s: %s",
            notification_type,
            recipient_email,
            exc,
            exc_info=True,
        )
        status = NotificationStatus.FAILED
        error_message = str(exc)

    try:
        NotificationLog.objects.create(
            user=user,
            notification_type=notification_type,
            recipient=recipient_email,
            subject=subject,
            status=status,
            error_message=error_message,
        )
    except Exception as log_exc:
        # Log-table write must never cause the caller to treat a successful
        # send as a failure (e.g. stale schema before migrations are run).
        logger.warning(
            "Could not write NotificationLog for %s to %s: %s — "
            "run 'python manage.py migrate' if this is a schema error.",
            notification_type,
            recipient_email,
            log_exc,
        )


def send_welcome_email(user) -> None:
    """Send a welcome + email verification email to a newly registered user."""
    from apps.accounts.services import email_verification_token_generator

    token = email_verification_token_generator.make_token(user)
    uid = urlsafe_base64_encode(force_bytes(user.pk))

    _send_email(
        user=user,
        notification_type=NotificationType.WELCOME,
        recipient_email=user.email,
        subject="Welcome to ShopCore — Please Verify Your Email",
        html_template="emails/welcome.html",
        txt_template="emails/welcome.txt",
        context={"user": user, "uid": uid, "token": token},
    )


def send_email_verification(user) -> None:
    """Send (or resend) an email verification link."""
    from apps.accounts.services import email_verification_token_generator

    token = email_verification_token_generator.make_token(user)
    uid = urlsafe_base64_encode(force_bytes(user.pk))

    _send_email(
        user=user,
        notification_type=NotificationType.EMAIL_VERIFICATION,
        recipient_email=user.email,
        subject="Verify Your Email Address — ShopCore",
        html_template="emails/email_verification.html",
        txt_template="emails/email_verification.txt",
        context={"user": user, "uid": uid, "token": token},
    )


def send_password_reset_email(user) -> None:
    """Send a password reset link to the user."""
    from apps.accounts.services import password_reset_token_generator

    token = password_reset_token_generator.make_token(user)
    uid = urlsafe_base64_encode(force_bytes(user.pk))

    _send_email(
        user=user,
        notification_type=NotificationType.PASSWORD_RESET,
        recipient_email=user.email,
        subject="Password Reset — ShopCore",
        html_template="emails/password_reset.html",
        txt_template="emails/password_reset.txt",
        context={"user": user, "uid": uid, "token": token},
    )


def _order_recipient_email(order) -> str:
    """Return the email an order notification should go to.

    Registered orders use the account email; guest orders (user=None) use the
    guest email captured at checkout (audit H-4).
    """
    if order.user is not None:
        return order.user.email
    return order.guest_email or ""


def send_order_confirmation_email(order) -> None:
    """Send an order confirmation email to the customer (registered or guest)."""
    recipient = _order_recipient_email(order)
    if not recipient:
        return
    _send_email(
        user=order.user,
        notification_type=NotificationType.ORDER_CONFIRMATION,
        recipient_email=recipient,
        subject=f"Order Confirmed — {order.order_number}",
        html_template="emails/order_confirmation.html",
        txt_template="emails/order_confirmation.txt",
        context={"order": order, "user": order.user},
    )


def send_order_status_notification(order, new_status: str) -> None:
    """Send a status update email when an order is shipped or delivered."""
    from apps.orders.constants import OrderStatus

    type_map = {
        OrderStatus.SHIPPED: (
            NotificationType.ORDER_SHIPPED,
            f"Your Order Has Shipped — {order.order_number}",
            "emails/order_shipped.html",
            "emails/order_shipped.txt",
        ),
        OrderStatus.DELIVERED: (
            NotificationType.ORDER_DELIVERED,
            f"Your Order Has Been Delivered — {order.order_number}",
            "emails/order_delivered.html",
            "emails/order_delivered.txt",
        ),
    }

    entry = type_map.get(new_status)
    if not entry:
        return

    recipient = _order_recipient_email(order)
    if not recipient:
        return

    notification_type, subject, html_template, txt_template = entry
    _send_email(
        user=order.user,
        notification_type=notification_type,
        recipient_email=recipient,
        subject=subject,
        html_template=html_template,
        txt_template=txt_template,
        context={"order": order, "user": order.user},
    )


def send_newsletter_confirmation(email: str) -> None:
    """Send a subscription confirmation email to a new newsletter subscriber."""
    _send_email(
        user=None,
        notification_type=NotificationType.NEWSLETTER_CONFIRMATION,
        recipient_email=email,
        subject="You're subscribed to ShopCore",
        html_template="emails/newsletter_confirmation.html",
        txt_template="emails/newsletter_confirmation.txt",
        context={"email": email},
    )


def send_contact_received(message) -> None:
    """Send an admin notification email when a contact form is submitted.

    Sends to ADMIN_EMAIL if configured; skips silently otherwise.
    """
    admin_email = getattr(settings, "ADMIN_EMAIL", "")
    if not admin_email:
        logger.debug(
            "ADMIN_EMAIL not set — skipping contact notification for message from %s",
            message.email,
        )
        return

    _send_email(
        user=None,
        notification_type=NotificationType.CONTACT_RECEIVED,
        recipient_email=admin_email,
        subject=f"New Contact Message — {message.subject}",
        html_template="emails/contact_received.html",
        txt_template="emails/contact_received.txt",
        context={"message": message, "site_url": _admin_url()},
    )


def send_payment_submission_notification(submission) -> None:
    """Send an admin notification email when a customer submits a manual
    payment for verification.

    Sends to ADMIN_EMAIL if configured; skips silently otherwise.
    """
    admin_email = getattr(settings, "ADMIN_EMAIL", "")
    if not admin_email:
        logger.debug(
            "ADMIN_EMAIL not set — skipping payment-submission notification for %s",
            submission.order.order_number,
        )
        return

    _send_email(
        user=None,
        notification_type=NotificationType.PAYMENT_SUBMISSION,
        recipient_email=admin_email,
        subject=f"Manual Payment Submitted — {submission.order.order_number}",
        html_template="emails/payment_submission.html",
        txt_template="emails/payment_submission.txt",
        context={"submission": submission, "site_url": _admin_url()},
    )
