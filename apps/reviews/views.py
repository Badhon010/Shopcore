from __future__ import annotations
import logging
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from apps.catalog.models import Product
from apps.reviews.models import Review
from apps.reviews.serializers import ReviewCreateSerializer, ReviewSerializer
from apps.reviews.services import can_user_review, is_verified_purchase
from apps.common.pagination import StandardResultsSetPagination

logger = logging.getLogger("shopcore.reviews.views")


class ProductReviewListView(generics.ListAPIView):
    """List approved reviews for a product."""
    serializer_class = ReviewSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        return (
            Review.objects.filter(
                product__slug=self.kwargs["product_slug"],
                is_approved=True,
            )
            .select_related("user")
            .order_by("-created_at")
        )


class ProductReviewCreateView(generics.CreateAPIView):
    """Create a review for a product."""
    serializer_class = ReviewCreateSerializer

    def create(self, request, *args, **kwargs):
        product_slug = self.kwargs["product_slug"]
        try:
            product = Product.objects.get(slug=product_slug)
        except Product.DoesNotExist:
            return Response({"error": {"code": "NOT_FOUND", "message": "Product not found.", "details": {}}}, status=404)

        if Review.objects.filter(product=product, user=request.user).exists():
            return Response({"error": {"code": "ALREADY_REVIEWED", "message": "You have already reviewed this product.", "details": {}}}, status=400)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        verified = is_verified_purchase(request.user, product)
        review = serializer.save(
            product=product,
            user=request.user,
            is_verified_purchase=verified,
        )
        return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED)


class MyReviewDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete the current user's review."""
    serializer_class = ReviewCreateSerializer

    def get_queryset(self):
        return Review.objects.filter(user=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        return Response(ReviewSerializer(instance).data)


class AdminReviewListView(generics.ListAPIView):
    """Staff-only: list all reviews."""

    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        from django.db.models import Q

        qs = Review.objects.select_related("user", "product").order_by("-created_at")
        search = self.request.query_params.get("search", "")
        if search:
            qs = qs.filter(
                Q(user__email__icontains=search)
                | Q(product__name__icontains=search)
                | Q(title__icontains=search)
            )
        is_approved = self.request.query_params.get("is_approved")
        if is_approved is not None:
            qs = qs.filter(is_approved=is_approved.lower() == "true")
        rating = self.request.query_params.get("rating")
        if rating:
            qs = qs.filter(rating=rating)
        return qs


class AdminReviewDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Staff-only: approve, reject, or delete a review."""

    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = Review.objects.select_related("user", "product").all()
