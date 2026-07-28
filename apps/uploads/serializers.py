"""Serializers for the uploads app."""
from __future__ import annotations

from rest_framework import serializers

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"}
MAX_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
MIN_DIMENSION = 10  # px
MAX_DIMENSION = 8000  # px


class FileUploadSerializer(serializers.Serializer):
    """Validate and accept a single image upload."""

    file = serializers.ImageField(help_text="Image file to upload (JPEG, PNG, WebP, GIF — max 10 MB).")
    context_type = serializers.ChoiceField(
        choices=["product", "brand", "category", "banner", "other"],
        default="other",
        help_text="Where this image will be used (for organisational purposes only).",
    )

    def validate_file(self, value):
        content_type = getattr(value, "content_type", "")
        if content_type not in ALLOWED_CONTENT_TYPES:
            raise serializers.ValidationError(
                f"Unsupported file type '{content_type}'. "
                f"Allowed: JPEG, PNG, WebP, GIF."
            )
        if value.size > MAX_SIZE_BYTES:
            raise serializers.ValidationError(
                f"File size {value.size // (1024 * 1024)} MB exceeds the 10 MB limit."
            )
        return value

    def validate(self, attrs):
        img = attrs.get("file")
        if img:
            try:
                from PIL import Image as PilImage
                img.seek(0)
                pil = PilImage.open(img)
                w, h = pil.size
                if w < MIN_DIMENSION or h < MIN_DIMENSION:
                    raise serializers.ValidationError(
                        {"file": f"Image is too small ({w}x{h}). Minimum dimension is {MIN_DIMENSION}px."}
                    )
                if w > MAX_DIMENSION or h > MAX_DIMENSION:
                    raise serializers.ValidationError(
                        {"file": f"Image is too large ({w}x{h}). Maximum dimension is {MAX_DIMENSION}px."}
                    )
                attrs["_width"] = w
                attrs["_height"] = h
                img.seek(0)
            except Exception as exc:
                if isinstance(exc, serializers.ValidationError):
                    raise
                # Non-fatal: skip dimension check if PIL can't open it
                pass
        return attrs
