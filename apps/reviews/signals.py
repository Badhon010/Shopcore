"""Signals for the reviews app.

On Review post_save/post_delete, recompute Product.average_rating and
Product.review_count using an aggregate query (not incremental math) to
avoid drift. This is cheap at v1 scale; documented as a future async job.
"""
from __future__ import annotations

import logging

from django.db.models import Avg, Count
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

logger = logging.getLogger("shopcore.reviews.signals")


@receiver(post_save, sender="reviews.Review")
@receiver(post_delete, sender="reviews.Review")
def update_product_rating(sender, instance, **kwargs) -> None:
    """Recompute Product.average_rating and review_count on review change."""
    from apps.reviews.models import Review

    product = instance.product
    agg = Review.objects.filter(product=product, is_approved=True).aggregate(
        avg_rating=Avg("rating"),
        count=Count("id"),
    )
    product.average_rating = agg["avg_rating"] or 0
    product.review_count = agg["count"] or 0
    product.save(update_fields=["average_rating", "review_count"])
    logger.debug(
        "Updated ratings for product %s: avg=%.2f count=%d",
        product.slug,
        float(product.average_rating),
        product.review_count,
    )
