from __future__ import annotations
from django.urls import path
from apps.reviews.views import (
    AdminReviewDetailView,
    AdminReviewListView,
    MyReviewDetailView,
    ProductReviewCreateView,
    ProductReviewListView,
)

app_name = "reviews"

urlpatterns = [
    path("products/<slug:product_slug>/reviews/", ProductReviewListView.as_view(), name="product-review-list"),
    path("products/<slug:product_slug>/reviews/create/", ProductReviewCreateView.as_view(), name="product-review-create"),
    path("my-reviews/<int:pk>/", MyReviewDetailView.as_view(), name="my-review-detail"),
    path("admin/", AdminReviewListView.as_view(), name="admin-review-list"),
    path("admin/<int:pk>/", AdminReviewDetailView.as_view(), name="admin-review-detail"),
]
