from __future__ import annotations

from django.db import models


class MovementType(models.TextChoices):
    RESTOCK = "RESTOCK", "Restock"
    SALE = "SALE", "Sale"
    RESERVATION = "RESERVATION", "Reservation"
    RESERVATION_RELEASE = "RESERVATION_RELEASE", "Reservation Release"
    RETURN = "RETURN", "Return"
    ADJUSTMENT = "ADJUSTMENT", "Manual Adjustment"
