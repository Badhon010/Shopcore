"""Views for the catalog app."""
from __future__ import annotations

import logging

from django.core.cache import cache
from drf_spectacular.utils import extend_schema, extend_schema_view
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, permissions, status
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalog.filters import ProductFilterSet
from apps.catalog.models import Banner, Brand, Category, Product, ProductVariant
from apps.catalog.selectors import get_category_tree, get_product_detail, get_product_list
from apps.catalog.serializers import (
    BannerSerializer,
    BrandSerializer,
    CategoryDetailSerializer,
    CategoryListSerializer,
    ProductDetailSerializer,
    ProductListSerializer,
)
from apps.common.pagination import StandardResultsSetPagination
from apps.common.permissions import IsAdminOrReadOnly, IsStaffUser

logger = logging.getLogger("shopcore.catalog.views")


class CategoryTreeView(APIView):
    """Return the full category tree (cached)."""

    permission_classes = [permissions.AllowAny]

    @extend_schema(summary="Get category tree")
    def get(self, request, *args, **kwargs):
        tree = get_category_tree()
        return Response(tree)


class CategoryListView(generics.ListAPIView):
    """List all active root categories."""

    serializer_class = CategoryListSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return Category.objects.filter(parent__isnull=True).order_by("display_order", "name")


class CategoryDetailView(generics.RetrieveAPIView):
    """Retrieve a category by slug."""

    serializer_class = CategoryDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        return Category.objects.prefetch_related("children__children")


class BrandListView(generics.ListAPIView):
    """List all active brands."""

    serializer_class = BrandSerializer
    permission_classes = [permissions.AllowAny]
    queryset = Brand.objects.all().order_by("name")


class BannerListView(generics.ListAPIView):
    """List active homepage hero banners, ordered for the slider."""

    serializer_class = BannerSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None
    queryset = Banner.objects.filter(is_active=True).order_by("display_order", "-created_at")


class BrandDetailView(generics.RetrieveAPIView):
    """Retrieve a brand by slug."""

    serializer_class = BrandSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"
    queryset = Brand.objects.all()


class ProductListView(generics.ListAPIView):
    """List published products with filtering, search, and ordering."""

    serializer_class = ProductListSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = StandardResultsSetPagination
    filterset_class = ProductFilterSet
    filter_backends = [
        DjangoFilterBackend,
        OrderingFilter,
        SearchFilter,
    ]
    search_fields = ["name", "description", "sku"]
    ordering_fields = ["base_price", "created_at", "average_rating", "name"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return get_product_list()


class ProductDetailView(generics.RetrieveAPIView):
    """Retrieve a product by slug."""

    serializer_class = ProductDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        return get_product_list()
