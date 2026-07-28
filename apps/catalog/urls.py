"""URL configuration for the catalog app."""
from __future__ import annotations

from django.urls import path

from apps.catalog.views import (
    AdminBannerDetailView,
    AdminBannerListView,
    AdminBrandDetailView,
    AdminBrandListView,
    AdminCategoryDetailView,
    AdminCategoryListView,
    AdminProductDetailView,
    AdminProductImageDetailView,
    AdminProductImageListView,
    AdminProductListView,
    AdminProductVariantDetailView,
    AdminProductVariantListView,
    BannerListView,
    BrandDetailView,
    BrandListView,
    CategoryDetailView,
    CategoryListView,
    CategoryTreeView,
    ProductDetailView,
    ProductListView,
)

app_name = "catalog"

urlpatterns = [
    # Banners
    path("banners/", BannerListView.as_view(), name="banner-list"),
    # Categories (public, slug-based)
    path("categories/tree/", CategoryTreeView.as_view(), name="category-tree"),
    path("categories/", CategoryListView.as_view(), name="category-list"),
    path("categories/<slug:slug>/", CategoryDetailView.as_view(), name="category-detail"),
    # Brands (public, slug-based)
    path("brands/", BrandListView.as_view(), name="brand-list"),
    path("brands/<slug:slug>/", BrandDetailView.as_view(), name="brand-detail"),
    # Products (public)
    path("products/", ProductListView.as_view(), name="product-list"),
    path("products/<slug:slug>/", ProductDetailView.as_view(), name="product-detail"),
    # ── Admin endpoints (staff only, ID-based for categories/brands) ──────────
    path("admin/products/", AdminProductListView.as_view(), name="admin-product-list"),
    path("admin/products/<slug:slug>/", AdminProductDetailView.as_view(), name="admin-product-detail"),
    path("admin/categories/", AdminCategoryListView.as_view(), name="admin-category-list"),
    path("admin/categories/<int:pk>/", AdminCategoryDetailView.as_view(), name="admin-category-detail"),
    path("admin/brands/", AdminBrandListView.as_view(), name="admin-brand-list"),
    path("admin/brands/<int:pk>/", AdminBrandDetailView.as_view(), name="admin-brand-detail"),
    # Admin: Product Variants (nested under product)
    path(
        "admin/products/<slug:product_slug>/variants/",
        AdminProductVariantListView.as_view(),
        name="admin-product-variant-list",
    ),
    path(
        "admin/products/<slug:product_slug>/variants/<int:pk>/",
        AdminProductVariantDetailView.as_view(),
        name="admin-product-variant-detail",
    ),
    # Admin: Product Images (nested under product)
    path(
        "admin/products/<slug:product_slug>/images/",
        AdminProductImageListView.as_view(),
        name="admin-product-image-list",
    ),
    path(
        "admin/products/<slug:product_slug>/images/<int:pk>/",
        AdminProductImageDetailView.as_view(),
        name="admin-product-image-detail",
    ),
    # Admin: Banners
    path("admin/banners/", AdminBannerListView.as_view(), name="admin-banner-list"),
    path("admin/banners/<int:pk>/", AdminBannerDetailView.as_view(), name="admin-banner-detail"),
]
