"""Demo data seeding script for ShopCore.

Usage:
    cd shopcore
    python manage.py shell < scripts/seed_demo_data.py

Or run directly:
    python manage.py runscript seed_demo_data  (if django-extensions installed)

Creates:
- 1 superuser admin account
- 1 warehouse
- 3 categories (Electronics > Phones, Electronics > Laptops)
- 2 brands (Apple, Samsung)
- 3 products with variants and stock
- 1 coupon (10% off)
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

# Ensure the shopcore directory is on the Python path
_BASE = Path(__file__).resolve().parent.parent
if str(_BASE) not in sys.path:
    sys.path.insert(0, str(_BASE))

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from decimal import Decimal
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

from apps.accounts.models import Address
from apps.catalog.models import Attribute, AttributeValue, Brand, Category, Product, ProductVariant
from apps.coupons.constants import DiscountType
from apps.coupons.models import Coupon
from apps.inventory.models import StockItem, Warehouse
from apps.inventory.services import restock

User = get_user_model()

print("Seeding demo data...")

# Superuser
admin, created = User.objects.get_or_create(
    email="admin@shopcore.example",
    defaults={
        "first_name": "Admin",
        "last_name": "User",
        "is_staff": True,
        "is_superuser": True,
        "is_email_verified": True,
    },
)
if created:
    admin.set_password("admin1234!")
    admin.save()
    print(f"  Created admin: admin@shopcore.example / admin1234!")

# Regular customer
customer, created = User.objects.get_or_create(
    email="customer@shopcore.example",
    defaults={"first_name": "Jane", "last_name": "Doe", "is_email_verified": True},
)
if created:
    customer.set_password("customer1234!")
    customer.save()
    print(f"  Created customer: customer@shopcore.example / customer1234!")

# Customer address
addr, _ = Address.objects.get_or_create(
    user=customer,
    defaults={
        "full_name": "Jane Doe",
        "phone_number": "+15551234567",
        "address_line_1": "123 Main St",
        "city": "San Francisco",
        "state_province": "CA",
        "postal_code": "94105",
        "country": "US",
        "is_default": True,
    },
)

# Warehouse
warehouse, _ = Warehouse.objects.get_or_create(
    code="MAIN",
    defaults={"name": "Main Warehouse", "city": "San Francisco", "country": "US", "is_default": True},
)

# Categories
electronics, _ = Category.all_objects.get_or_create(
    slug="electronics",
    defaults={"name": "Electronics", "display_order": 1},
)
phones, _ = Category.all_objects.get_or_create(
    slug="phones",
    defaults={"name": "Phones", "parent": electronics, "display_order": 1},
)
laptops, _ = Category.all_objects.get_or_create(
    slug="laptops",
    defaults={"name": "Laptops", "parent": electronics, "display_order": 2},
)

# Brands
apple, _ = Brand.all_objects.get_or_create(slug="apple", defaults={"name": "Apple"})
samsung, _ = Brand.all_objects.get_or_create(slug="samsung", defaults={"name": "Samsung"})

# Attributes
storage_attr, _ = Attribute.objects.get_or_create(slug="storage", defaults={"name": "Storage"})
color_attr, _ = Attribute.objects.get_or_create(slug="color", defaults={"name": "Color"})

storage_256, _ = AttributeValue.objects.get_or_create(attribute=storage_attr, value="256GB")
storage_512, _ = AttributeValue.objects.get_or_create(attribute=storage_attr, value="512GB")
color_black, _ = AttributeValue.objects.get_or_create(attribute=color_attr, value="Black")
color_white, _ = AttributeValue.objects.get_or_create(attribute=color_attr, value="White")

# Products
from apps.catalog.constants import ProductStatus

iphone, created = Product.all_objects.get_or_create(
    slug="iphone-16-pro",
    defaults={
        "name": "iPhone 16 Pro",
        "category": phones,
        "brand": apple,
        "description": "The latest iPhone with advanced AI features and titanium design.",
        "short_description": "Apple iPhone 16 Pro — titanium, AI-powered.",
        "base_price": Decimal("999.00"),
        "compare_at_price": Decimal("1099.00"),
        "sku": "APPLE-IP16P",
        "status": ProductStatus.PUBLISHED,
        "is_featured": True,
        "is_active": True,
    },
)
if created:
    print("  Created product: iPhone 16 Pro")

galaxy, created = Product.all_objects.get_or_create(
    slug="samsung-galaxy-s25",
    defaults={
        "name": "Samsung Galaxy S25",
        "category": phones,
        "brand": samsung,
        "description": "Samsung's flagship Android phone with Snapdragon 8 Elite.",
        "short_description": "Samsung Galaxy S25 — flagship Android.",
        "base_price": Decimal("799.00"),
        "sku": "SAM-GS25",
        "status": ProductStatus.PUBLISHED,
        "is_active": True,
    },
)
if created:
    print("  Created product: Samsung Galaxy S25")

macbook, created = Product.all_objects.get_or_create(
    slug="macbook-pro-16",
    defaults={
        "name": "MacBook Pro 16",
        "category": laptops,
        "brand": apple,
        "description": "Apple M4 Pro chip, 18-hour battery, Liquid Retina XDR display.",
        "short_description": "MacBook Pro 16 — M4 Pro chip.",
        "base_price": Decimal("2499.00"),
        "sku": "APPLE-MBP16",
        "status": ProductStatus.PUBLISHED,
        "is_featured": True,
        "is_active": True,
    },
)
if created:
    print("  Created product: MacBook Pro 16")

# Add variants and stock
def ensure_variant_with_stock(product, sku, attrs, price_override, qty):
    variant, _ = ProductVariant.objects.get_or_create(
        sku=sku,
        defaults={"product": product, "price_override": price_override, "is_active": True},
    )
    if attrs:
        variant.attribute_values.set(attrs)
    stock, _ = StockItem.objects.get_or_create(variant=variant, warehouse=warehouse)
    if stock.quantity_on_hand < qty:
        restock(variant, qty, reference="SEED", warehouse=warehouse, actor=admin)
    return variant

# Remove auto-created default variants for products we're adding real variants to
for product in [iphone, galaxy, macbook]:
    product.variants.filter(sku__endswith="-DEFAULT").delete()

ensure_variant_with_stock(iphone, "APPLE-IP16P-256-BLK", [storage_256, color_black], None, 50)
ensure_variant_with_stock(iphone, "APPLE-IP16P-512-WHT", [storage_512, color_white], Decimal("1099.00"), 30)
ensure_variant_with_stock(galaxy, "SAM-GS25-256-BLK", [storage_256, color_black], None, 40)
ensure_variant_with_stock(macbook, "APPLE-MBP16-512", [storage_512], None, 20)

# Coupon
now = timezone.now()
coupon, created = Coupon.objects.get_or_create(
    code="WELCOME10",
    defaults={
        "discount_type": DiscountType.PERCENTAGE,
        "discount_value": Decimal("10"),
        "valid_from": now,
        "valid_until": now + timedelta(days=365),
        "usage_limit_total": 1000,
        "usage_limit_per_user": 1,
        "is_active": True,
    },
)
if created:
    print("  Created coupon: WELCOME10 (10% off)")

print("\nDemo data seeded successfully!")
print("\nAdmin credentials: admin@shopcore.example / admin1234!")
print("Customer credentials: customer@shopcore.example / customer1234!")
print("Coupon: WELCOME10 (10% off, one-time per user)")
print("\nStart the server: python manage.py runserver")
print("API docs: http://localhost:8000/api/docs/")
print("Admin: http://localhost:8000/admin/")
