from __future__ import annotations

import logging

from django.db import transaction
from django.db.models import Case, F, IntegerField, Q, Sum, When, Window
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.pagination import StandardResultsSetPagination
from apps.common.permissions import IsStaffUser
from apps.inventory.constants import MovementType
from apps.inventory.models import StockItem, StockMovement, Warehouse
from apps.inventory.serializers import (
    ManualAdjustmentSerializer,
    RestockSerializer,
    StockItemSerializer,
    StockMovementSerializer,
    StockThresholdSerializer,
    WarehouseSerializer,
)
from apps.inventory.services import restock

logger = logging.getLogger("shopcore.inventory.views")


@extend_schema(
    summary="List stock items",
    description=(
        "Staff-only: paginated stock items across warehouses. Supports `search` "
        "(SKU or product name), `low_stock_only`, `out_of_stock_only`, and "
        "`warehouse` (ID) filters."
    ),
    parameters=[
        OpenApiParameter("search", str, description="Search SKU or product name"),
        OpenApiParameter(
            "low_stock_only",
            str,
            description="true — only items whose available quantity is at or below their low-stock threshold",
        ),
        OpenApiParameter(
            "out_of_stock_only",
            str,
            description="true — only items with 0 on hand",
        ),
        OpenApiParameter("warehouse", int, description="Filter by warehouse ID"),
    ],
    tags=["Inventory"],
)
class StockItemListView(generics.ListAPIView):
    serializer_class = StockItemSerializer
    permission_classes = [IsStaffUser]

    def get_queryset(self):
        qs = StockItem.objects.select_related("variant__product", "warehouse")

        search = self.request.query_params.get("search", "")
        if search:
            qs = qs.filter(
                Q(variant__sku__icontains=search)
                | Q(variant__product__name__icontains=search)
            )

        # Boolean toggles — sent by the admin UI as "true"/"false" strings.
        if self.request.query_params.get("out_of_stock_only", "").lower() == "true":
            qs = qs.filter(quantity_on_hand=0)
        elif self.request.query_params.get("low_stock_only", "").lower() == "true":
            # Match the is_low_stock property the admin UI badge relies on:
            # available (= on_hand - reserved) at or below the threshold.
            qs = qs.annotate(
                _available=F("quantity_on_hand") - F("quantity_reserved")
            ).filter(_available__lte=F("low_stock_threshold"))

        warehouse = self.request.query_params.get("warehouse", "")
        if warehouse:
            try:
                qs = qs.filter(warehouse_id=int(warehouse))
            except ValueError:
                pass  # ignore malformed values rather than 500

        return qs.order_by("variant__sku")


class StockItemDetailView(generics.RetrieveAPIView):
    serializer_class = StockItemSerializer
    permission_classes = [IsStaffUser]

    def get_queryset(self):
        return StockItem.objects.select_related("variant__product", "warehouse")


class RestockView(APIView):
    permission_classes = [IsStaffUser]

    def post(self, request, pk, *args, **kwargs):
        try:
            stock_item = StockItem.objects.select_related("variant").get(pk=pk)
        except StockItem.DoesNotExist:
            return Response({"error": {"code": "NOT_FOUND", "message": "Stock item not found.", "details": {}}}, status=404)
        serializer = RestockSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        updated = restock(
            stock_item.variant,
            quantity=serializer.validated_data["quantity"],
            reference=serializer.validated_data.get("reference", ""),
            note=serializer.validated_data.get("note", ""),
            actor=request.user,
        )
        return Response(StockItemSerializer(updated).data)


class StockThresholdUpdateView(APIView):
    """Staff-only: update the low_stock_threshold of a StockItem."""

    permission_classes = [IsStaffUser]

    @extend_schema(
        summary="Update stock low threshold",
        request=StockThresholdSerializer,
        responses={200: StockItemSerializer},
    )
    def patch(self, request, pk, *args, **kwargs):
        try:
            stock_item = StockItem.objects.select_related("variant__product", "warehouse").get(pk=pk)
        except StockItem.DoesNotExist:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": "Stock item not found.", "details": {}}},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = StockThresholdSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        stock_item.low_stock_threshold = serializer.validated_data["low_stock_threshold"]
        stock_item.save(update_fields=["low_stock_threshold"])
        return Response(StockItemSerializer(stock_item).data)


class ManualStockAdjustmentView(APIView):
    """Staff-only: manually adjust stock quantity (positive or negative)."""

    permission_classes = [IsStaffUser]

    @extend_schema(
        summary="Manual stock adjustment",
        request=ManualAdjustmentSerializer,
        responses={200: StockItemSerializer},
    )
    def post(self, request, pk, *args, **kwargs):
        serializer = ManualAdjustmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        quantity_delta = serializer.validated_data["quantity_delta"]
        reason = serializer.validated_data.get("reason", "")
        note = serializer.validated_data.get("note", "")

        try:
            with transaction.atomic():
                stock_item = StockItem.objects.select_for_update().select_related(
                    "variant__product", "warehouse"
                ).get(pk=pk)

                new_quantity_on_hand = stock_item.quantity_on_hand + quantity_delta
                if new_quantity_on_hand < 0:
                    return Response(
                        {
                            "error": {
                                "code": "NEGATIVE_STOCK",
                                "message": "Adjustment would result in negative stock on hand.",
                                "details": {
                                    "quantity_on_hand": stock_item.quantity_on_hand,
                                    "quantity_delta": quantity_delta,
                                    "would_result_in": new_quantity_on_hand,
                                },
                            }
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                new_available = new_quantity_on_hand - stock_item.quantity_reserved
                if new_available < 0:
                    return Response(
                        {
                            "error": {
                                "code": "INSUFFICIENT_AVAILABLE",
                                "message": "Adjustment would result in availability below reserved quantity.",
                                "details": {
                                    "quantity_on_hand": stock_item.quantity_on_hand,
                                    "quantity_reserved": stock_item.quantity_reserved,
                                    "quantity_delta": quantity_delta,
                                    "would_result_in_available": new_available,
                                },
                            }
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                stock_item.quantity_on_hand = new_quantity_on_hand
                stock_item.save(update_fields=["quantity_on_hand", "updated_at"])

                StockMovement.objects.create(
                    stock_item=stock_item,
                    movement_type=MovementType.ADJUSTMENT,
                    quantity_delta=quantity_delta,
                    reference=reason,
                    note=note or reason,
                    created_by=request.user,
                )

        except StockItem.DoesNotExist:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": "Stock item not found.", "details": {}}},
                status=status.HTTP_404_NOT_FOUND,
            )

        logger.info(
            "Manual adjustment of %+d on StockItem#%d by user %s (%s)",
            quantity_delta, pk, request.user.pk, reason,
        )
        stock_item.refresh_from_db()
        return Response(StockItemSerializer(stock_item).data)


class StockMovementHistoryView(generics.ListAPIView):
    """Staff-only: paginated movement history for a StockItem."""

    serializer_class = StockMovementSerializer
    permission_classes = [IsStaffUser]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        pk = self.kwargs["pk"]
        # Running on-hand total across this stock item's history. Only
        # movement types that actually change quantity_on_hand count toward
        # the total (reservations/releases only touch quantity_reserved).
        on_hand_delta = Case(
            When(
                movement_type__in=[
                    MovementType.RESTOCK,
                    MovementType.ADJUSTMENT,
                    MovementType.SALE,
                ],
                then=F("quantity_delta"),
            ),
            default=0,
            output_field=IntegerField(),
        )
        return (
            StockMovement.objects
            .filter(stock_item_id=pk)
            .select_related("created_by")
            .annotate(
                _running_after=Window(
                    expression=Sum(on_hand_delta),
                    partition_by=[F("stock_item_id")],
                    order_by=[F("id")],
                ),
                _row_delta=on_hand_delta,
            )
            .order_by("-created_at", "-id")
        )


class WarehouseListView(generics.ListAPIView):
    """Staff-only: list all warehouses."""

    serializer_class = WarehouseSerializer
    permission_classes = [IsStaffUser]
    queryset = Warehouse.objects.all().order_by("name")
