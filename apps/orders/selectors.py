from __future__ import annotations
from django.db.models import QuerySet


def get_orders_for_user(user) -> QuerySet:
    from apps.orders.models import Order
    return (
        Order.objects.filter(user=user)
        .prefetch_related(
            "items__variant__product",
            "status_history__changed_by",  # was "status_history" — prefetch user to avoid N+1
        )
        .order_by("-placed_at")
    )


def get_order_by_number(user, order_number: str):
    from apps.orders.models import Order
    return (
        Order.objects.filter(user=user, order_number=order_number)
        .prefetch_related(
            "items__variant__product",
            "status_history__changed_by",  # was "status_history" — prefetch user to avoid N+1
        )
        .get()
    )
