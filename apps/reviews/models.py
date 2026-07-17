from __future__ import annotations
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from apps.common.models import TimeStampedModel


class Review(TimeStampedModel):
    """A product review with optional verified-purchase flag.

    Policy (v1): Any authenticated user may leave a review. The
    ``is_verified_purchase`` flag is set automatically at creation time
    by checking whether the user has a DELIVERED/PAID order containing
    this product. This policy is centralized in ``services.can_user_review()``
    so it can be tightened later without touching views.
    """
    product = models.ForeignKey(
        "catalog.Product", on_delete=models.CASCADE, related_name="reviews"
    )
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="reviews")
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    title = models.CharField(max_length=255)
    body = models.TextField()
    is_verified_purchase = models.BooleanField(default=False)
    is_approved = models.BooleanField(
        default=True,
        help_text="Staff can set to False to hide abusive reviews without deleting them.",
    )

    class Meta:
        unique_together = [("product", "user")]
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["product", "is_approved"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(rating__gte=1) & models.Q(rating__lte=5),
                name="review_rating_1_to_5",
            )
        ]

    def __str__(self) -> str:
        return f"{self.user.email} → {self.product.name}: {self.rating}/5"
