from __future__ import annotations
from django.db import models
from apps.common.models import TimeStampedModel


class Cart(TimeStampedModel):
    """Shopping cart — works for authenticated users and anonymous guests.

    Stock is NOT reserved merely by being in a cart (v1 design decision).
    Stock reservation happens at checkout submission. This means 'add to cart'
    never fails for stock reasons, but checkout can fail if stock ran out.
    See: services.place_order() for the reservation logic.
    """
    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="carts",
    )
    session_key = models.CharField(max_length=40, null=True, blank=True, db_index=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user"],
                condition=models.Q(is_active=True, user__isnull=False),
                name="unique_active_cart_per_user",
            ),
            models.UniqueConstraint(
                fields=["session_key"],
                condition=models.Q(is_active=True, session_key__isnull=False),
                name="unique_active_cart_per_session",
            ),
        ]

    def __str__(self) -> str:
        owner = self.user.email if self.user else f"guest:{self.session_key}"
        return f"Cart({owner}, active={self.is_active})"


class CartItem(TimeStampedModel):
    """A line item in a shopping cart."""
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    variant = models.ForeignKey("catalog.ProductVariant", on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    unit_price_snapshot = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Price at the time this item was added. "
                  "Recomputed at checkout to detect price changes.",
    )

    class Meta:
        unique_together = [("cart", "variant")]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(quantity__gte=1),
                name="cart_item_quantity_gte_1",
            )
        ]

    def __str__(self) -> str:
        return f"{self.quantity}x {self.variant.sku} in cart {self.cart_id}"
