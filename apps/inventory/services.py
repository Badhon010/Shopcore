"""Stock mutation services — the ONLY place stock numbers should change.

Concurrency rule (enforced here):
1. Open transaction.atomic()
2. select_for_update() to lock the StockItem row
3. Validate sufficient quantity_available
4. Mutate and write a StockMovement in the same transaction
5. Raise InsufficientStockError if unavailable
"""
from __future__ import annotations

import logging

from django.db import transaction

from apps.inventory.constants import MovementType
from apps.inventory.exceptions import InsufficientStockError
from apps.inventory.models import StockItem, StockMovement, Warehouse

logger = logging.getLogger("shopcore.inventory.services")


def _get_default_warehouse() -> Warehouse:
    return Warehouse.objects.filter(is_default=True).first() or Warehouse.objects.first()


def get_or_create_stock_item(variant, warehouse=None) -> StockItem:
    """Get or create a StockItem for a variant/warehouse pair."""
    if warehouse is None:
        warehouse = _get_default_warehouse()
    if warehouse is None:
        raise ValueError("No warehouse configured. Create a default warehouse first.")
    item, _ = StockItem.objects.get_or_create(variant=variant, warehouse=warehouse)
    return item


def reserve_stock(variant, quantity: int, reference: str = "", warehouse=None) -> StockItem:
    """Reserve stock for a pending order.

    Args:
        variant: ProductVariant instance.
        quantity: Number of units to reserve.
        reference: Order number or other reference string.
        warehouse: Warehouse instance (uses default if None).

    Returns:
        The updated StockItem.

    Raises:
        InsufficientStockError: If available quantity is insufficient.
    """
    if quantity <= 0:
        raise ValueError("Quantity must be greater than zero.")

    if warehouse is None:
        warehouse = _get_default_warehouse()

    with transaction.atomic():
        stock = StockItem.objects.select_for_update().get(variant=variant, warehouse=warehouse)
        if stock.quantity_available < quantity:
            raise InsufficientStockError(variant.sku, quantity, stock.quantity_available)

        stock.quantity_reserved += quantity
        stock.save(update_fields=["quantity_reserved", "updated_at"])

        StockMovement.objects.create(
            stock_item=stock,
            movement_type=MovementType.RESERVATION,
            quantity_delta=-quantity,
            reference=reference,
            note=f"Reserved {quantity} unit(s) for order {reference}",
        )

    logger.info("Reserved %d unit(s) of %s (ref: %s)", quantity, variant.sku, reference)
    return stock


def release_reservation(variant, quantity: int, reference: str = "", warehouse=None) -> StockItem:
    """Release a previously reserved quantity (e.g. on order cancellation).

    Args:
        variant: ProductVariant instance.
        quantity: Number of reserved units to release.
        reference: Order number or other reference.
        warehouse: Warehouse instance (uses default if None).

    Returns:
        The updated StockItem.
    """
    if warehouse is None:
        warehouse = _get_default_warehouse()

    with transaction.atomic():
        stock = StockItem.objects.select_for_update().get(variant=variant, warehouse=warehouse)

        # Idempotency guard: if this exact release was already recorded for this
        # reference, skip re-applying it. This makes the operation safe to call
        # more than once for the same order/reference (e.g. a retried request).
        if reference and StockMovement.objects.filter(
            stock_item=stock, movement_type=MovementType.RESERVATION_RELEASE, reference=reference
        ).exists():
            logger.info(
                "Reservation release for %s (ref: %s) already recorded; skipping duplicate.",
                variant.sku, reference,
            )
            return stock

        stock.quantity_reserved = max(0, stock.quantity_reserved - quantity)
        stock.save(update_fields=["quantity_reserved", "updated_at"])

        StockMovement.objects.create(
            stock_item=stock,
            movement_type=MovementType.RESERVATION_RELEASE,
            quantity_delta=quantity,
            reference=reference,
            note=f"Released reservation of {quantity} unit(s) for {reference}",
        )

    logger.info("Released reservation of %d unit(s) of %s", quantity, variant.sku)
    return stock


def commit_sale(variant, quantity: int, reference: str = "", warehouse=None) -> StockItem:
    """Commit a reservation to an actual sale (on payment confirmation).

    Decrements both quantity_on_hand and quantity_reserved.

    Args:
        variant: ProductVariant instance.
        quantity: Number of units sold.
        reference: Order number.
        warehouse: Warehouse instance (uses default if None).

    Returns:
        The updated StockItem.
    """
    if warehouse is None:
        warehouse = _get_default_warehouse()

    with transaction.atomic():
        stock = StockItem.objects.select_for_update().get(variant=variant, warehouse=warehouse)

        # Idempotency guard: if this sale was already committed for this
        # reference, skip re-applying it. This makes the operation safe to call
        # more than once for the same order/reference (e.g. a retried request
        # or a status-transition retry).
        if reference and StockMovement.objects.filter(
            stock_item=stock, movement_type=MovementType.SALE, reference=reference
        ).exists():
            logger.info(
                "Sale for %s (ref: %s) already committed; skipping duplicate.",
                variant.sku, reference,
            )
            return stock

        stock.quantity_on_hand = max(0, stock.quantity_on_hand - quantity)
        stock.quantity_reserved = max(0, stock.quantity_reserved - quantity)
        stock.save(update_fields=["quantity_on_hand", "quantity_reserved", "updated_at"])

        StockMovement.objects.create(
            stock_item=stock,
            movement_type=MovementType.SALE,
            quantity_delta=-quantity,
            reference=reference,
            note=f"Sale of {quantity} unit(s) confirmed for {reference}",
        )

    logger.info("Committed sale of %d unit(s) of %s", quantity, variant.sku)
    return stock


def restock(
    variant,
    quantity: int,
    reference: str = "",
    note: str = "",
    warehouse=None,
    actor=None,
    movement_type=None,
) -> StockItem:
    """Add stock to a variant.

    Args:
        variant: ProductVariant instance.
        quantity: Number of units to add.
        reference: Purchase order, order number, or other reference.
        note: Optional note for the stock movement.
        warehouse: Warehouse instance (uses default if None).
        actor: User who performed the restock (for audit).
        movement_type: MovementType to record. Defaults to RESTOCK (admin
            restock). Pass MovementType.RETURN for refund/return restocks so
            the ledger distinguishes the two.

    Returns:
        The updated StockItem.

    Idempotency: when ``reference`` and ``movement_type`` are both provided
    and an identical movement (same stock item, type, reference) already
    exists, the operation is skipped — this makes order-return restocks safe
    against duplicate application (e.g. a retried refund transition).
    """
    if warehouse is None:
        warehouse = _get_default_warehouse()
    if movement_type is None:
        movement_type = MovementType.RESTOCK

    with transaction.atomic():
        stock, _ = StockItem.objects.select_for_update().get_or_create(
            variant=variant, warehouse=warehouse
        )

        if reference and StockMovement.objects.filter(
            stock_item=stock, movement_type=movement_type, reference=reference
        ).exists():
            logger.info(
                "Restock (%s) for %s (ref: %s) already recorded; skipping duplicate.",
                movement_type, variant.sku, reference,
            )
            return stock

        stock.quantity_on_hand += quantity
        stock.save(update_fields=["quantity_on_hand", "updated_at"])

        StockMovement.objects.create(
            stock_item=stock,
            movement_type=movement_type,
            quantity_delta=quantity,
            reference=reference,
            note=note or f"Restocked {quantity} unit(s)",
            created_by=actor,
        )

    logger.info("Restocked %d unit(s) of %s", quantity, variant.sku)
    return stock
