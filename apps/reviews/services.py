from __future__ import annotations
import logging
from apps.orders.constants import OrderStatus

logger = logging.getLogger("shopcore.reviews.services")


def can_user_review(user, product) -> bool:
    """Check if a user is eligible to leave a review for a product.

    Policy (v1): Any authenticated user may review, but verified-purchase
    status is set based on actual order history. This function is the single
    place to tighten the policy (e.g. restrict to verified buyers only).

    Args:
        user: The User attempting to review.
        product: The Product being reviewed.

    Returns:
        True always in v1 (open review policy).
    """
    return True


def is_verified_purchase(user, product) -> bool:
    """Check if the user has a delivered/paid order containing this product.

    Args:
        user: The User.
        product: The Product.

    Returns:
        True if the user has a qualifying order item.
    """
    from apps.orders.models import OrderItem
    return OrderItem.objects.filter(
        order__user=user,
        order__status__in=[OrderStatus.DELIVERED, OrderStatus.PAID],
        variant__product=product,
    ).exists()
