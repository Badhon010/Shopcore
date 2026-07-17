from __future__ import annotations
from rest_framework import serializers
from apps.reviews.models import Review


class ReviewSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Review
        fields = [
            "id", "product", "user_email", "rating", "title", "body",
            "is_verified_purchase", "is_approved", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "user_email", "is_verified_purchase", "is_approved", "created_at", "updated_at"]


class ReviewCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ["rating", "title", "body"]

    def validate_rating(self, value: int) -> int:
        if not (1 <= value <= 5):
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value

    def validate_title(self, value: str) -> str:
        if not value.strip():
            raise serializers.ValidationError("Review title cannot be blank.")
        return value
