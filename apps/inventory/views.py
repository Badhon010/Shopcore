from __future__ import annotations
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.inventory.models import StockItem, Warehouse
from apps.inventory.serializers import RestockSerializer, StockItemSerializer, WarehouseSerializer
from apps.inventory.services import restock
from apps.common.permissions import IsStaffUser


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
