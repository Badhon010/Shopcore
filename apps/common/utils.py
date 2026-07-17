"""Shared utility functions for ShopCore."""
from __future__ import annotations

import io
import re
import unicodedata
from decimal import ROUND_HALF_UP, Decimal
from typing import TYPE_CHECKING

from django.utils import timezone
from django.utils.text import slugify

if TYPE_CHECKING:
    from PIL import Image as PILImage


def generate_unique_slug(model_class, name: str, slug_field: str = "slug") -> str:
    """Generate a unique, URL-safe slug for a model instance.

    Appends a numeric suffix if the base slug already exists, e.g.
    ``wireless-mouse`` → ``wireless-mouse-2`` → ``wireless-mouse-3``.

    Args:
        model_class: The Django model class to check for uniqueness.
        name: The string to slugify.
        slug_field: The name of the slug field on the model.

    Returns:
        A unique slug string.
    """
    base_slug = slugify(name)
    if not base_slug:
        base_slug = "item"

    slug = base_slug
    counter = 2
    while model_class.all_objects.filter(**{slug_field: slug}).exists():
        slug = f"{base_slug}-{counter}"
        counter += 1
    return slug


def generate_order_number() -> str:
    """Generate a human-readable, date-prefixed order number.

    Format: ``ORD-YYYYMMDD-NNNNNN`` where NNNNNN is a zero-padded
    microsecond-resolution counter (monotonically increasing within a day).

    Returns:
        A unique order number string, e.g. ``ORD-20260711-000123``.
    """
    now = timezone.now()
    # Use microseconds for uniqueness within the same day
    micro = now.microsecond
    sequence = (now.hour * 3600 + now.minute * 60 + now.second) * 1000 + now.microsecond // 1000
    return f"ORD-{now.strftime('%Y%m%d')}-{sequence:06d}"


def format_currency(amount: Decimal, currency: str = "USD") -> str:
    """Format a Decimal amount as a currency string.

    Args:
        amount: The monetary amount.
        currency: ISO 4217 currency code.

    Returns:
        Formatted string, e.g. ``"USD 10.00"``.
    """
    return f"{currency} {amount:.2f}"


def round_money(amount: Decimal) -> Decimal:
    """Round a Decimal to 2 decimal places using ROUND_HALF_UP.

    Args:
        amount: The amount to round.

    Returns:
        Rounded Decimal.
    """
    return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def validate_image(file_obj, max_size_bytes: int, max_dimension_px: int) -> None:
    """Validate an uploaded image file.

    Checks MIME type via Pillow (not file extension), max file size,
    max dimensions, and rejects SVG files.

    Args:
        file_obj: The uploaded file object.
        max_size_bytes: Maximum allowed file size in bytes.
        max_dimension_px: Maximum allowed width/height in pixels.

    Raises:
        ValueError: With a descriptive message if validation fails.
    """
    from PIL import Image, UnidentifiedImageError

    # Check file size
    file_obj.seek(0, 2)  # Seek to end
    size = file_obj.tell()
    file_obj.seek(0)
    if size > max_size_bytes:
        max_mb = max_size_bytes / (1024 * 1024)
        raise ValueError(f"File size {size / (1024*1024):.1f}MB exceeds maximum of {max_mb}MB.")

    # Reject SVG by reading the first bytes
    header = file_obj.read(512)
    file_obj.seek(0)
    if b"<svg" in header.lower() or b"<!doctype svg" in header.lower():
        raise ValueError("SVG files are not allowed for security reasons.")

    # Validate MIME type via Pillow
    try:
        img = Image.open(file_obj)
        img.verify()  # Verify it's a valid image
        file_obj.seek(0)
        img = Image.open(file_obj)  # Re-open after verify (verify closes it)
    except UnidentifiedImageError:
        raise ValueError("File is not a valid image.")
    except Exception as exc:
        raise ValueError(f"Image validation failed: {exc}") from exc
    finally:
        file_obj.seek(0)

    # Check dimensions
    width, height = img.size
    if width > max_dimension_px or height > max_dimension_px:
        raise ValueError(
            f"Image dimensions {width}×{height} exceed maximum of "
            f"{max_dimension_px}×{max_dimension_px} px."
        )


def strip_exif(image_bytes: bytes) -> bytes:
    """Strip EXIF data from image bytes (privacy protection).

    Args:
        image_bytes: Raw image data.

    Returns:
        Image bytes with EXIF data removed.
    """
    from PIL import Image

    img = Image.open(io.BytesIO(image_bytes))
    # Create a new image without EXIF
    output = io.BytesIO()
    # Convert to RGB if needed (e.g. RGBA PNG)
    if img.mode in ("RGBA", "P"):
        img.save(output, format="PNG")
    else:
        img.save(output, format=img.format or "JPEG")
    return output.getvalue()


def create_thumbnail(image_field, size: tuple[int, int] = (400, 400)) -> bytes:
    """Create a web-optimized thumbnail from an image field.

    Args:
        image_field: Django ImageField value.
        size: (width, height) tuple for the thumbnail.

    Returns:
        Thumbnail image bytes.
    """
    from PIL import Image

    image_field.seek(0)
    img = Image.open(image_field)
    img.thumbnail(size, Image.LANCZOS)
    output = io.BytesIO()
    fmt = "JPEG" if img.mode not in ("RGBA", "P") else "PNG"
    if img.mode == "RGBA" and fmt == "JPEG":
        img = img.convert("RGB")
    img.save(output, format=fmt, quality=85, optimize=True)
    return output.getvalue()
