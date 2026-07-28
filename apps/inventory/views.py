from __future__ import annotations

import logging

from django.db import transaction
from drf_spectacular.utils import extend_schema
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


class StockItemListView(generics.ListAPIView):
    serializer_class = StockItemSerializer
    permission_classes = [IsStaffUser]

    def get_queryset(self):
        return StockItem.objects.select_related("variant__product", "warehouse").order_by(
            "variant__sku"
        )


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
        reason = serializer.validated_data["reason"]
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
        return StockMovement.objects.filter(stock_item_id=pk).order_by("-created_at")


class WarehouseListView(generics.ListAPIView):
    """Staff-only: list all warehouses."""

    serializer_class = WarehouseSerializer
    permission_classes = [IsStaffUser]
    queryset = Warehouse.objects.all().order_by("name")
