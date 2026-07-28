"""Views for the catalog app."""
from __future__ import annotations

import logging

from django.core.cache import cache
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, extend_schema_view
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, permissions, status
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalog.filters import ProductFilterSet
from apps.catalog.models import Banner, Brand, Category, Product, ProductImage, ProductVariant
from apps.catalog.selectors import get_category_tree, get_product_detail, get_product_list
from apps.catalog.serializers import (
    AdminProductListSerializer,
    BannerSerializer,
    BannerWriteSerializer,
    BrandSerializer,
    BrandWriteSerializer,
    CategoryDetailSerializer,
    CategoryListSerializer,
    CategoryWriteSerializer,
    ProductCreateUpdateSerializer,
    ProductDetailSerializer,
    ProductImageSerializer,
    ProductImageUpdateSerializer,
    ProductImageUploadSerializer,
    ProductListSerializer,
    ProductVariantSerializer,
    ProductVariantWriteSerializer,
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


# ── Admin views (staff only) ───────────────────────────────────────────────────


class AdminProductListView(generics.ListCreateAPIView):
    """Admin: list all products (any status) and create new ones."""

    permission_classes = [IsStaffUser]
    pagination_class = StandardResultsSetPagination
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["name", "sku", "description"]
    ordering_fields = ["base_price", "created_at", "name", "status"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ProductCreateUpdateSerializer
        return AdminProductListSerializer

    def get_queryset(self):
        # Product.objects.all() uses ProductManager which filters is_active=True
        # so we see DRAFT/PUBLISHED/ARCHIVED but not soft-deleted records.
        qs = (
            Product.objects.all()
            .select_related("category", "brand")
            .prefetch_related("images")
        )
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)
        category_param = self.request.query_params.get("category")
        if category_param:
            try:
                qs = qs.filter(category_id=int(category_param))
            except (ValueError, TypeError):
                pass
        brand_param = self.request.query_params.get("brand")
        if brand_param:
            try:
                qs = qs.filter(brand_id=int(brand_param))
            except (ValueError, TypeError):
                pass
        return qs


class AdminProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin: retrieve, update, or delete a product by slug."""

    permission_classes = [IsStaffUser]
    lookup_field = "slug"

    def get_serializer_class(self):
        if self.request.method == "GET":
            return ProductDetailSerializer
        return ProductCreateUpdateSerializer

    def get_queryset(self):
        return (
            Product.objects.all()
            .select_related("category", "brand")
            .prefetch_related(
                "images",
                "variants__attribute_values__attribute",
                "variants__stock_items",
            )
        )


class AdminCategoryListView(generics.ListCreateAPIView):
    """Admin: list all categories and create new ones."""

    permission_classes = [IsStaffUser]
    pagination_class = StandardResultsSetPagination
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["name", "slug"]
    ordering = ["display_order", "name"]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return CategoryWriteSerializer
        return CategoryListSerializer

    def get_queryset(self):
        return Category.objects.all().select_related("parent").order_by("display_order", "name")


class AdminCategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin: retrieve, update, or delete a category by ID."""

    permission_classes = [IsStaffUser]
    lookup_field = "pk"

    def get_serializer_class(self):
        if self.request.method == "GET":
            return CategoryDetailSerializer
        return CategoryWriteSerializer

    def get_queryset(self):
        return Category.objects.all().prefetch_related("children__children")


class AdminBrandListView(generics.ListCreateAPIView):
    """Admin: list all brands and create new ones."""

    permission_classes = [IsStaffUser]
    pagination_class = StandardResultsSetPagination
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["name", "slug"]
    ordering = ["name"]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return BrandWriteSerializer
        return BrandSerializer

    def get_queryset(self):
        return Brand.objects.all().order_by("name")


class AdminBrandDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin: retrieve, update, or delete a brand by ID."""

    permission_classes = [IsStaffUser]
    lookup_field = "pk"

    def get_serializer_class(self):
        if self.request.method == "GET":
            return BrandSerializer
        return BrandWriteSerializer

    def get_queryset(self):
        return Brand.objects.all()


# ── Admin: Product Variants ────────────────────────────────────────────────────


@extend_schema(tags=["Admin – Variants"])
class AdminProductVariantListView(generics.ListCreateAPIView):
    """Admin: list and create variants for a product (nested by product slug)."""

    permission_classes = [IsStaffUser]
    pagination_class = StandardResultsSetPagination

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ProductVariantWriteSerializer
        return ProductVariantSerializer

    def get_product(self):
        return get_object_or_404(Product.objects.all(), slug=self.kwargs["product_slug"])

    def get_queryset(self):
        return (
            ProductVariant.objects.filter(product__slug=self.kwargs["product_slug"])
            .prefetch_related("attribute_values__attribute", "stock_items")
        )

    def perform_create(self, serializer):
        product = self.get_product()
        serializer.save(product=product)


@extend_schema(tags=["Admin – Variants"])
class AdminProductVariantDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin: retrieve, update, or delete a product variant by PK."""

    permission_classes = [IsStaffUser]

    def get_serializer_class(self):
        if self.request.method == "GET":
            return ProductVariantSerializer
        return ProductVariantWriteSerializer

    def get_queryset(self):
        return (
            ProductVariant.objects.filter(product__slug=self.kwargs["product_slug"])
            .prefetch_related("attribute_values__attribute", "stock_items")
        )


# ── Admin: Product Images ──────────────────────────────────────────────────────


@extend_schema(tags=["Admin – Images"])
class AdminProductImageListView(generics.ListCreateAPIView):
    """Admin: list and upload images for a product (nested by product slug)."""

    permission_classes = [IsStaffUser]
    pagination_class = StandardResultsSetPagination

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ProductImageUploadSerializer
        return ProductImageSerializer

    def get_product(self):
        return get_object_or_404(Product.objects.all(), slug=self.kwargs["product_slug"])

    def get_queryset(self):
        return ProductImage.objects.filter(product__slug=self.kwargs["product_slug"]).order_by(
            "display_order"
        )

    def perform_create(self, serializer):
        product = self.get_product()
        is_primary = serializer.validated_data.get("is_primary", False)
        if is_primary:
            ProductImage.objects.filter(product=product, is_primary=True).update(is_primary=False)
        serializer.save(product=product)


@extend_schema(tags=["Admin – Images"])
class AdminProductImageDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin: retrieve, update, or hard-delete a product image."""

    permission_classes = [IsStaffUser]

    def get_serializer_class(self):
        if self.request.method == "GET":
            return ProductImageSerializer
        return ProductImageUpdateSerializer

    def get_queryset(self):
        return ProductImage.objects.filter(product__slug=self.kwargs["product_slug"])

    def perform_update(self, serializer):
        is_primary = serializer.validated_data.get("is_primary", None)
        if is_primary:
            instance = serializer.instance
            ProductImage.objects.filter(product=instance.product, is_primary=True).exclude(
                pk=instance.pk
            ).update(is_primary=False)
        serializer.save()


# ── Admin: Banners ─────────────────────────────────────────────────────────────


@extend_schema(tags=["Admin – Banners"])
class AdminBannerListView(generics.ListCreateAPIView):
    """Admin: list all banners and create new ones."""

    permission_classes = [IsStaffUser]
    pagination_class = StandardResultsSetPagination
    filter_backends = [OrderingFilter]
    ordering = ["display_order", "-created_at"]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return BannerWriteSerializer
        return BannerSerializer

    def get_queryset(self):
        return Banner.objects.all().order_by("display_order", "-created_at")


@extend_schema(tags=["Admin – Banners"])
class AdminBannerDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin: retrieve, update, or hard-delete a banner by ID."""

    permission_classes = [IsStaffUser]
    lookup_field = "pk"

    def get_serializer_class(self):
        if self.request.method == "GET":
            return BannerSerializer
        return BannerWriteSerializer

    def get_queryset(self):
        return Banner.objects.all()
