"""Generic file upload endpoint for ShopCore admin."""
from __future__ import annotations

import logging
import os
import uuid

from django.conf import settings
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsStaffUser
from apps.uploads.serializers import FileUploadSerializer

logger = logging.getLogger("shopcore.uploads.views")

# Sub-directory within MEDIA_ROOT where uploads land
_UPLOAD_DIRS = {
    "product": "uploads/products",
    "brand": "uploads/brands",
    "category": "uploads/categories",
    "banner": "uploads/banners",
    "other": "uploads/misc",
}


@extend_schema(
    summary="Upload an image file",
    description=(
        "Upload a single image and receive back its URL. "
        "Accepted types: JPEG, PNG, WebP, GIF. Maximum size: 10 MB. "
        "Use the `context_type` field to organise uploads by where they will be used "
        "(product, brand, category, banner, other). "
        "This endpoint writes to MEDIA_ROOT; configure cloud storage for production HA deployments."
    ),
    tags=["Uploads"],
)
class FileUploadView(APIView):
    """Staff-only: accept an image upload and return its URL."""

    permission_classes = [IsStaffUser]
    parser_classes = [MultiPartParser]

    def post(self, request, *args, **kwargs):
        serializer = FileUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        file_obj = serializer.validated_data["file"]
        context_type = serializer.validated_data.get("context_type", "other")
        width = serializer.validated_data.get("_width")
        height = serializer.validated_data.get("_height")

        # Build a collision-free storage path
        ext = os.path.splitext(file_obj.name)[1].lower() or ".jpg"
        unique_name = f"{uuid.uuid4().hex}{ext}"
        relative_dir = _UPLOAD_DIRS.get(context_type, "uploads/misc")
        relative_path = os.path.join(relative_dir, unique_name)

        # Use Django's default storage so cloud backends (S3/GCS/R2) work transparently
        from django.core.files.storage import default_storage
        saved_path = default_storage.save(relative_path, file_obj)
        url = request.build_absolute_uri(settings.MEDIA_URL + saved_path)

        logger.info(
            "File uploaded: %s → %s (context: %s, size: %d bytes)",
            file_obj.name,
            saved_path,
            context_type,
            file_obj.size,
        )

        payload = {
            "url": url,
            "path": saved_path,
            "filename": unique_name,
            "original_filename": file_obj.name,
            "content_type": getattr(file_obj, "content_type", ""),
            "size_bytes": file_obj.size,
            "context_type": context_type,
        }
        if width is not None:
            payload["width"] = width
            payload["height"] = height

        return Response(payload, status=status.HTTP_201_CREATED)
