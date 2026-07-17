from __future__ import annotations
from django.db import models
from apps.common.models import TimeStampedModel


class Wishlist(models.Model):
    """One implicit wishlist per user, auto-created via get_or_create."""
    user = models.OneToOneField(
        "accounts.User", on_delete=models.CASCADE, related_name="wishlist"
    )

    def __str__(self) -> str:
        return f"Wishlist({self.user.email})"


class WishlistItem(TimeStampedModel):
    """A product added to a user's wishlist."""
    wishlist = models.ForeignKey(Wishlist, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey("catalog.Product", on_delete=models.CASCADE)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("wishlist", "product")]
        ordering = ["-added_at"]

    def __str__(self) -> str:
        return f"{self.product.name} in {self.wishlist}"
