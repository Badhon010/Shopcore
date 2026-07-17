"""URL configuration for the catalog app."""
from __future__ import annotations

from django.urls import path

from apps.catalog.views import (
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
    # Categories
    path("categories/tree/", CategoryTreeView.as_view(), name="category-tree"),
    path("categories/", CategoryListView.as_view(), name="category-list"),
    path("categories/<slug:slug>/", CategoryDetailView.as_view(), name="category-detail"),
    # Brands
    path("brands/", BrandListView.as_view(), name="brand-list"),
    path("brands/<slug:slug>/", BrandDetailView.as_view(), name="brand-detail"),
    # Products
    path("products/", ProductListView.as_view(), name="product-list"),
    path("products/<slug:slug>/", ProductDetailView.as_view(), name="product-detail"),
]
