"""Business logic services for the orders app."""
from __future__ import annotations

import logging
from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings
from django.db import IntegrityError, transaction

from apps.cart.models import Cart
from apps.common.utils import generate_order_number, round_money
from apps.orders.constants import ALLOWED_TRANSITIONS, OrderStatus, PaymentStatus
from apps.orders.exceptions import (
    CheckoutError,
    EmptyCartError,
    InvalidOrderTransitionError,
    OrderNotFoundError,
)
from apps.orders.models import Order, OrderItem, OrderStatusHistory

logger = logging.getLogger("shopcore.orders.services")


class FlatRateShippingCalculator:
    """Simple flat-rate shipping calculator (v1 implementation).

    Pluggable: replace or extend by changing the calculator used in place_order().
    """

    def calculate(self, cart: Cart, address: dict) -> Decimal:
        """Return the shipping cost for a given cart and address."""
        return round_money(Decimal(str(settings.FLAT_SHIPPING_RATE)))


class FlatPercentageTaxCalculator:
    """Simple flat-percentage tax calculator (v1 implementation)."""

    def calculate(self, subtotal: Decimal, address: dict) -> Decimal:
        """Return the tax amount for a given subtotal and address."""
        rate = Decimal(str(settings.DEFAULT_TAX_RATE_PERCENT)) / Decimal("100")
        return round_money(subtotal * rate)


def place_order(
    user,
    cart: Cart,
    shipping_address,
    billing_address=None,
    coupon_code: str | None = None,
    notes: str = "",
    idempotency_key: str | None = None,
) -> Order:
    """Convert a Cart into an immutable Order.

    Steps (all within one atomic transaction):
    1. Check idempotency key for duplicate requests.
    2. Validate the cart is non-empty.
    3. Reserve stock for each line item.
    4. Validate and apply coupon server-side.
    5. Compute shipping and tax via pluggable calculators.
    6. Create Order + OrderItems with all snapshots frozen.
    7. Deactivate the cart.
    8. Increment coupon usage if applicable.
    9. Send order confirmation email (synchronous, non-blocking on failure).

    Args:
        user: The authenticated User placing the order.
        cart: The user's active Cart.
        shipping_address: Address instance for delivery.
        billing_address: Optional separate billing address (defaults to shipping).
        coupon_code: Optional coupon code string.
        notes: Customer notes for the order.
        idempotency_key: Optional client-provided key for deduplication.

    Returns:
        The created Order instance.

    Raises:
        CheckoutError: If idempotency key already used, cart is empty, or other errors.
        EmptyCartError: If the cart has no items.
        InsufficientStockError: If any item is out of stock.
    """
    # Idempotency check — MUST be scoped to (user, idempotency_key). A key alone
    # is never sufficient: looking up by idempotency_key alone would let one
    # user retrieve another user's order if a key were ever reused or guessed.
    if idempotency_key:
        existing = Order.objects.filter(user=user, idempotency_key=idempotency_key).first()
        if existing:
            logger.info("Idempotency hit: returning existing order %s", existing.order_number)
            return existing

    try:
        order = _place_order_atomic(
            user=user,
            cart=cart,
            shipping_address=shipping_address,
            billing_address=billing_address,
            coupon_code=coupon_code,
            notes=notes,
            idempotency_key=idempotency_key,
        )
    except IntegrityError:
        # Two concurrent requests with the same (user, idempotency_key) can both
        # pass the pre-check above and race to insert; the DB constraint on
        # (user, idempotency_key) rejects the loser. Return the winner's order
        # rather than surfacing a 500 — this is still scoped to the same user.
        if idempotency_key:
            existing = Order.objects.filter(user=user, idempotency_key=idempotency_key).first()
            if existing:
                logger.info(
                    "Idempotency race resolved: returning existing order %s", existing.order_number
                )
                return existing
        raise

    # Send confirmation email (outside transaction — email failure must not roll back order)
    try:
        from apps.notifications.services import send_order_confirmation_email
        send_order_confirmation_email(order)
    except Exception:
        logger.warning("Failed to send order confirmation email for %s", order.order_number, exc_info=True)

    logger.info("Order %s placed for user %s", order.order_number, user.email)
    return order


def _place_order_atomic(
    user,
    cart: Cart,
    shipping_address,
    billing_address,
    coupon_code: str | None,
    notes: str,
    idempotency_key: str | None,
) -> Order:
    """Run the actual order-creation transaction. Split out of place_order() so
    the IntegrityError raised by a concurrent idempotency-key collision can be
    caught by the caller without also swallowing errors from the email step."""
    with transaction.atomic():
        # Lock and validate cart
        items = list(cart.items.select_related("variant__product").select_for_update())
        if not items:
            raise EmptyCartError()

        # Reserve stock for each line item
        from apps.inventory.services import reserve_stock
        from apps.inventory.exceptions import InsufficientStockError

        order_number = generate_order_number()

        reserved_variants = []
        try:
            for item in items:
                reserve_stock(item.variant, item.quantity, reference=order_number)
                reserved_variants.append((item.variant, item.quantity))
        except InsufficientStockError:
            # Release any already-reserved items
            from apps.inventory.services import release_reservation
            for variant, qty in reserved_variants:
                try:
                    release_reservation(variant, qty, reference=order_number)
                except Exception:
                    pass
            raise

        # Compute subtotal from current variant prices (not snapshots)
        subtotal = round_money(
            sum(item.variant.effective_price * item.quantity for item in items)
        )

        # Validate and apply coupon server-side.
        # Uses validate_and_lock_coupon() (NOT the plain preview function) — it
        # locks the coupon row with select_for_update() for the remainder of
        # this transaction, so the limit checks below and the usage increment
        # after order creation are race-free against concurrent checkouts.
        discount_total = Decimal("0.00")
        applied_coupon = None
        coupon_code_snapshot = ""
        if coupon_code:
            from apps.coupons.services import validate_and_lock_coupon
            try:
                discount_total, applied_coupon = validate_and_lock_coupon(
                    subtotal=subtotal,
                    cart_items=items,
                    code=coupon_code,
                    user=user,
                )
                coupon_code_snapshot = coupon_code.upper()
            except Exception as exc:
                logger.warning("Coupon '%s' invalid at checkout: %s", coupon_code, exc)
                # Non-fatal: proceed without coupon rather than blocking checkout
                discount_total = Decimal("0.00")

        # Shipping and tax
        address_snapshot = _serialize_address(shipping_address)
        billing_snapshot = _serialize_address(billing_address or shipping_address)

        shipping_calculator = FlatRateShippingCalculator()
        tax_calculator = FlatPercentageTaxCalculator()

        shipping_cost = shipping_calculator.calculate(cart, address_snapshot)
        taxable_amount = max(Decimal("0.00"), subtotal - discount_total)
        tax_total = tax_calculator.calculate(taxable_amount, address_snapshot)
        grand_total = round_money(subtotal - discount_total + shipping_cost + tax_total)

        # Create Order
        order = Order.objects.create(
            order_number=order_number,
            user=user,
            status=OrderStatus.PENDING_PAYMENT,
            payment_status=PaymentStatus.PENDING,
            shipping_address=shipping_address,
            shipping_address_snapshot=address_snapshot,
            billing_address_snapshot=billing_snapshot,
            subtotal=subtotal,
            discount_total=discount_total,
            shipping_cost=shipping_cost,
            tax_total=tax_total,
            grand_total=grand_total,
            coupon=applied_coupon,
            coupon_code_snapshot=coupon_code_snapshot,
            notes=notes,
            idempotency_key=idempotency_key or None,
        )

        # Create OrderItems with snapshots
        for item in items:
            attrs_snapshot = {
                av.attribute.name: av.value
                for av in item.variant.attribute_values.select_related("attribute").all()
            }
            OrderItem.objects.create(
                order=order,
                variant=item.variant,
                product_name_snapshot=item.variant.product.name,
                variant_attributes_snapshot=attrs_snapshot,
                unit_price_snapshot=item.variant.effective_price,
                quantity=item.quantity,
                line_total=round_money(item.variant.effective_price * item.quantity),
            )

        # Initial status history entry
        OrderStatusHistory.objects.create(
            order=order,
            from_status="",
            to_status=OrderStatus.PENDING_PAYMENT,
            note="Order placed.",
        )

        # Deactivate cart (keep items for 'buy again' history)
        cart.is_active = False
        cart.save(update_fields=["is_active"])

        # Record coupon redemption — atomic F() increment, still inside the
        # transaction that holds the coupon row lock acquired above.
        if applied_coupon:
            from apps.coupons.services import record_coupon_redemption
            record_coupon_redemption(applied_coupon, user, order)

    return order


def transition_order_status(order: Order, new_status: str, actor=None, note: str = "") -> Order:
    """Transition an order to a new status using the allowed-transitions map.

    Args:
        order: The Order to transition.
        new_status: The target OrderStatus value.
        actor: The User performing the transition (or None for system).
        note: Optional note for the status history record.

    Returns:
        The updated Order.

    Raises:
        InvalidOrderTransitionError: If the transition is not in the allowed map.
    """
    with transaction.atomic():
        # Lock the order row and re-read its status AFTER acquiring the lock.
        # This is required for correctness: two concurrent transitions (e.g.
        # PAID and CANCELLED, or two callers both racing to mark PAID) must be
        # serialized so the second one is validated against the *post-first*
        # status, not a stale in-memory value read before either lock was held.
        locked_order = Order.objects.select_for_update().get(pk=order.pk)

        allowed = ALLOWED_TRANSITIONS.get(locked_order.status, [])
        if new_status not in allowed:
            raise InvalidOrderTransitionError(
                message=(
                    f"Cannot transition order from '{locked_order.status}' to '{new_status}'. "
                    f"Allowed: {allowed}"
                ),
                details={
                    "current_status": locked_order.status,
                    "new_status": new_status,
                    "allowed": allowed,
                },
            )

        old_status = locked_order.status
        locked_order.status = new_status
        if new_status == OrderStatus.PAID:
            locked_order.payment_status = PaymentStatus.PAID
        elif new_status == OrderStatus.REFUNDED:
            locked_order.payment_status = PaymentStatus.REFUNDED
        locked_order.save(update_fields=["status", "payment_status", "updated_at"])

        OrderStatusHistory.objects.create(
            order=locked_order,
            from_status=old_status,
            to_status=new_status,
            changed_by=actor,
            note=note,
        )

        # Inventory side effects happen inside the SAME transaction as the
        # status change (and while the order row lock is held), so a partial
        # failure rolls back the status change too instead of leaving stock
        # and order status inconsistent.
        if new_status == OrderStatus.PAID:
            _commit_sale_for_order(locked_order)
        if new_status == OrderStatus.CANCELLED:
            _release_reservations_for_order(locked_order)

    order = locked_order

    # Send notification on shipping/delivery (outside the transaction — a
    # notification failure must not roll back an already-committed transition)
    try:
        from apps.notifications.services import send_order_status_notification
        send_order_status_notification(order, new_status)
    except Exception:
        logger.warning("Failed to send status notification for order %s", order.order_number, exc_info=True)

    logger.info("Order %s: %s → %s (actor=%s)", order.order_number, old_status, new_status, actor)
    return order


def _commit_sale_for_order(order: Order) -> None:
    """Commit stock for all items in a paid order.

    Any unexpected exception propagates to the caller (transition_order_status),
    rolling back the entire transition — including the order-status update.
    This guarantees the order is never left in PAID state with uncommitted stock.

    The idempotency guard inside commit_sale() handles duplicate calls silently
    (returns without raising), so only genuine failures reach this level.
    """
    from apps.inventory.services import commit_sale
    for item in order.items.select_related("variant").all():
        commit_sale(item.variant, item.quantity, reference=order.order_number)


def _release_reservations_for_order(order: Order) -> None:
    """Release stock reservations for all items in a cancelled order.

    Any unexpected exception propagates to the caller (transition_order_status),
    rolling back the entire transition — including the order-status update.
    This guarantees the order is never left in CANCELLED state with unreleased
    reservations.

    The idempotency guard inside release_reservation() handles duplicate calls
    silently (returns without raising), so only genuine failures reach this level.
    """
    from apps.inventory.services import release_reservation
    for item in order.items.select_related("variant").all():
        release_reservation(item.variant, item.quantity, reference=order.order_number)


def _serialize_address(address) -> dict:
    """Snapshot an address into a plain dict for JSON storage."""
    if address is None:
        return {}
    return {
        "full_name": address.full_name,
        "phone_number": address.phone_number,
        "address_line_1": address.address_line_1,
        "address_line_2": address.address_line_2,
        "city": address.city,
        "state_province": address.state_province,
        "postal_code": address.postal_code,
        "country": address.country,
    }
