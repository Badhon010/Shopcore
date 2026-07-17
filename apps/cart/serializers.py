from __future__ import annotations
from decimal import Decimal
from rest_framework import serializers
from apps.cart.models import Cart, CartItem
from apps.catalog.serializers import ProductImageSerializer, ProductVariantSerializer


class CartProductSerializer(serializers.Serializer):
    """Minimal product representation nested in a cart line item.

    The frontend cart UI (CartLineItem, CartDrawer) links to the product page
    and renders its name/thumbnail directly off ``item.product`` — it must be
    present on every cart item, not just reachable via ``item.variant``.
    """
    id = serializers.IntegerField()
    name = serializers.CharField()
    slug = serializers.CharField()
    images = serializers.SerializerMethodField()

    def get_images(self, obj) -> list[dict]:
        return ProductImageSerializer(obj.images.all(), many=True).data


class CartItemSerializer(serializers.ModelSerializer):
    variant = ProductVariantSerializer(read_only=True)
    variant_id = serializers.IntegerField(write_only=True)
    product = serializers.SerializerMethodField()
    unit_price = serializers.DecimalField(source="unit_price_snapshot", max_digits=10, decimal_places=2, read_only=True)
    line_total = serializers.SerializerMethodField()
    total_price = serializers.SerializerMethodField()
    price_changed = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = [
            "id", "product", "variant", "variant_id", "quantity", "unit_price_snapshot",
            "unit_price", "line_total", "total_price", "price_changed",
        ]
        read_only_fields = ["id", "unit_price_snapshot"]

    def get_product(self, obj) -> dict:
        return CartProductSerializer(obj.variant.product).data

    def get_line_total(self, obj) -> str:
        return str(obj.variant.effective_price * obj.quantity)

    # Alias of line_total using the frontend's expected field name.
    def get_total_price(self, obj) -> str:
        return self.get_line_total(obj)

    def get_price_changed(self, obj) -> bool:
        return obj.variant.effective_price != obj.unit_price_snapshot


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    subtotal = serializers.SerializerMethodField()
    # No coupon/shipping/tax is persisted on the cart resource — coupons are
    # a stateless preview (POST /coupons/apply/) and shipping/tax are
    # computed at checkout. `total` defaults to `subtotal`; the frontend
    # merges the coupon preview into its own cache on top of this value.
    total = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()
    price_changed_items = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = [
            "id", "items", "subtotal", "total", "item_count", "price_changed_items",
            "created_at", "updated_at",
        ]

    def get_subtotal(self, obj) -> str:
        total = sum(item.variant.effective_price * item.quantity for item in obj.items.all())
        return str(total)

    def get_total(self, obj) -> str:
        return self.get_subtotal(obj)

    def get_item_count(self, obj) -> int:
        return sum(item.quantity for item in obj.items.all())

    def get_price_changed_items(self, obj) -> list:
        changed = []
        for item in obj.items.all():
            if item.variant.effective_price != item.unit_price_snapshot:
                changed.append({
                    "variant_sku": item.variant.sku,
                    "old_price": str(item.unit_price_snapshot),
                    "new_price": str(item.variant.effective_price),
                })
        return changed


class AddToCartSerializer(serializers.Serializer):
    variant_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)

    def validate_variant_id(self, value: int) -> int:
        from apps.catalog.models import ProductVariant
        try:
            ProductVariant.objects.get(pk=value, is_active=True)
        except ProductVariant.DoesNotExist:
            raise serializers.ValidationError("Product variant not found or not active.")
        return value


class UpdateCartItemSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1)
