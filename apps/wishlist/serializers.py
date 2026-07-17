from __future__ import annotations
from rest_framework import serializers
from apps.catalog.serializers import ProductListSerializer
from apps.wishlist.models import WishlistItem


class WishlistItemSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)
    product_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = WishlistItem
        fields = ["id", "product", "product_id", "added_at"]
        read_only_fields = ["id", "added_at"]


class MoveToCartSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    variant_id = serializers.IntegerField(required=False)
