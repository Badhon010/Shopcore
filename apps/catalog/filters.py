"""Django-filter FilterSet classes for the catalog app."""
from __future__ import annotations

import django_filters
from django.db.models import Exists, OuterRef

from apps.catalog.models import Brand, Category, Product


class ProductFilterSet(django_filters.FilterSet):
    """Filter set for the product list endpoint.

    Supports filtering by:
    - category (expands to include descendants)
    - brand slug
    - price range
    - is_featured
    - in_stock
    - attribute values (e.g. ?attribute__color=red)
    """

    category = django_filters.CharFilter(method="filter_category", label="Category slug")
    brand = django_filters.CharFilter(field_name="brand__slug", label="Brand slug")
    brands = django_filters.BaseInFilter(field_name="brand__slug", lookup_expr="in", label="Brand slugs (comma-separated)")
    price_min = django_filters.NumberFilter(field_name="base_price", lookup_expr="gte")
    price_max = django_filters.NumberFilter(field_name="base_price", lookup_expr="lte")
    is_featured = django_filters.BooleanFilter(field_name="is_featured")
    in_stock = django_filters.BooleanFilter(method="filter_in_stock", label="In stock")
    min_rating = django_filters.NumberFilter(field_name="average_rating", lookup_expr="gte", label="Minimum rating")

    class Meta:
        model = Product
        fields = ["category", "brand", "brands", "price_min", "price_max", "is_featured", "in_stock", "min_rating"]

    def filter_category(self, queryset, name, value):
        """Expand category filter to include all descendant categories."""
        try:
            category = Category.objects.get(slug=value, is_active=True)
            descendant_ids = category.get_descendants()
            return queryset.filter(category_id__in=descendant_ids)
        except Category.DoesNotExist:
            return queryset.none()

    def filter_in_stock(self, queryset, name, value):
        """Filter products by stock availability.

        Uses an EXISTS subquery rather than a multi-level JOIN.  The original
        JOIN approach (variants__stock_items__quantity_on_hand__gt=F("variants__
        stock_items__quantity_reserved")) lets Django generate two independent
        JOIN paths for the is_active condition and the quantity comparison,
        which silently breaks the correlation and returns wrong results.

        An EXISTS subquery with .extra() keeps the comparison inside a single
        correlated subquery row, which is both correct and efficient.
        """
        from apps.inventory.models import StockItem

        if value is None:
            return queryset

        # EXISTS (SELECT 1 FROM inventory_stockitem si
        #           JOIN catalog_productvariant v ON si.variant_id = v.id
        #          WHERE v.product_id = catalog_product.id
        #            AND v.is_active = true
        #            AND si.quantity_on_hand > si.quantity_reserved)
        has_stock = StockItem.objects.filter(
            variant__product=OuterRef("pk"),
            variant__is_active=True,
        ).extra(where=["quantity_on_hand > quantity_reserved"])

        if value:
            return queryset.filter(Exists(has_stock))
        # in_stock=false → show only products with no available stock
        return queryset.exclude(Exists(has_stock))
