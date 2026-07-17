"""Seed realistic dummy products for development and demo purposes.

Creates categories, brands, and products with variants and stock.
Safe to re-run — skips products that already exist (keyed on slug).

Usage:
    python manage.py seed_products
    python manage.py seed_products --clear   # wipe existing products first
"""
from __future__ import annotations

import random
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.catalog.constants import ProductStatus
from apps.catalog.models import Brand, Category, Product, ProductImage, ProductVariant
from apps.catalog.selectors import CATEGORY_TREE_CACHE_KEY
from apps.inventory.models import StockItem, Warehouse

try:
    from django.core.cache import cache
    HAS_CACHE = True
except Exception:
    HAS_CACHE = False

# ---------------------------------------------------------------------------
# Seed data
# ---------------------------------------------------------------------------

CATEGORIES = [
    {"name": "Electronics",   "slug": "electronics"},
    {"name": "Fashion",       "slug": "fashion"},
    {"name": "Home & Living", "slug": "home-living"},
    {"name": "Beauty",        "slug": "beauty"},
    {"name": "Sports",        "slug": "sports"},
    {"name": "Watches",       "slug": "watches"},
]

BRANDS = [
    {"name": "Apex Tech",     "slug": "apex-tech"},
    {"name": "Luxe Studio",   "slug": "luxe-studio"},
    {"name": "Urban Drift",   "slug": "urban-drift"},
    {"name": "PureGlow",      "slug": "pureglow"},
    {"name": "SwiftGear",     "slug": "swiftgear"},
    {"name": "Prestige Co.",  "slug": "prestige-co"},
]

# Unsplash images — free, no auth required, consistent for each product
PRODUCTS = [
    # ── Electronics ──────────────────────────────────────────────────────
    {
        "name": "ProSound Wireless Headphones",
        "slug": "prosound-wireless-headphones",
        "sku": "PROD-001",
        "category": "electronics",
        "brand": "apex-tech",
        "description": "Premium over-ear headphones with active noise cancellation, 30-hour battery, and crystal-clear Hi-Fi audio. Bluetooth 5.3 with multipoint connection.",
        "base_price": "129.99",
        "compare_at_price": "179.99",
        "is_featured": True,
        "images": [
            {"url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80", "is_primary": True},
            {"url": "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&q=80"},
        ],
        "variants": [
            {"sku": "PSH-BLK", "name": "Midnight Black", "stock": 25},
            {"sku": "PSH-WHT", "name": "Pearl White",    "stock": 15},
            {"sku": "PSH-NVY", "name": "Navy Blue",      "stock": 10},
        ],
    },
    {
        "name": "UltraSlim Laptop Stand",
        "slug": "ultraslim-laptop-stand",
        "sku": "PROD-002",
        "category": "electronics",
        "brand": "apex-tech",
        "description": "Adjustable aluminium laptop stand with six height settings, anti-slip pads, and a foldable design that fits in your bag. Compatible with laptops 10-17 inches.",
        "base_price": "49.99",
        "compare_at_price": None,
        "is_featured": False,
        "images": [
            {"url": "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&q=80", "is_primary": True},
        ],
        "variants": [
            {"sku": "ULS-SLV", "name": "Silver", "stock": 40},
            {"sku": "ULS-SPC", "name": "Space Grey", "stock": 30},
        ],
    },
    {
        "name": "Compact Mechanical Keyboard",
        "slug": "compact-mechanical-keyboard",
        "sku": "PROD-003",
        "category": "electronics",
        "brand": "apex-tech",
        "description": "75% layout mechanical keyboard with hot-swappable switches, RGB backlighting, and a durable aluminium frame. Wired USB-C and Bluetooth 5.0.",
        "base_price": "89.99",
        "compare_at_price": "109.99",
        "is_featured": True,
        "images": [
            {"url": "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=800&q=80", "is_primary": True},
        ],
        "variants": [
            {"sku": "CMK-RED", "name": "Red Switches", "stock": 20},
            {"sku": "CMK-BRN", "name": "Brown Switches", "stock": 20},
            {"sku": "CMK-BLU", "name": "Blue Switches", "stock": 12},
        ],
    },
    {
        "name": "4K Webcam Pro",
        "slug": "4k-webcam-pro",
        "sku": "PROD-004",
        "category": "electronics",
        "brand": "apex-tech",
        "description": "4K 30fps webcam with autofocus, built-in dual microphone array, and HDR. Plug-and-play USB-C. Perfect for streaming, video calls, and content creation.",
        "base_price": "74.99",
        "compare_at_price": "99.99",
        "is_featured": False,
        "images": [
            {"url": "https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=800&q=80", "is_primary": True},
        ],
        "variants": [
            {"sku": "WCP-BLK", "name": "Black", "stock": 18},
        ],
    },

    # ── Fashion ───────────────────────────────────────────────────────────
    {
        "name": "Classic Linen Shirt",
        "slug": "classic-linen-shirt",
        "sku": "PROD-005",
        "category": "fashion",
        "brand": "urban-drift",
        "description": "Relaxed-fit linen shirt made from 100% European flax. Breathable, lightweight, and wrinkle-resistant. Perfect for warm weather.",
        "base_price": "59.99",
        "compare_at_price": None,
        "is_featured": True,
        "images": [
            {"url": "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&q=80", "is_primary": True},
            {"url": "https://images.unsplash.com/photo-1589310243389-96a5483213a8?w=800&q=80"},
        ],
        "variants": [
            {"sku": "CLS-WHT-S",  "name": "White / S",  "stock": 12},
            {"sku": "CLS-WHT-M",  "name": "White / M",  "stock": 18},
            {"sku": "CLS-WHT-L",  "name": "White / L",  "stock": 10},
            {"sku": "CLS-BLU-M",  "name": "Sky Blue / M", "stock": 8},
            {"sku": "CLS-BLU-L",  "name": "Sky Blue / L", "stock": 6},
        ],
    },
    {
        "name": "Slim-Fit Chino Trousers",
        "slug": "slim-fit-chino-trousers",
        "sku": "PROD-006",
        "category": "fashion",
        "brand": "urban-drift",
        "description": "Clean-cut chinos in a stretch-cotton blend. Slim fit, mid-rise, with a zip fly and two back pockets. Machine washable.",
        "base_price": "69.99",
        "compare_at_price": "89.99",
        "is_featured": False,
        "images": [
            {"url": "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&q=80", "is_primary": True},
        ],
        "variants": [
            {"sku": "SFC-KHK-30", "name": "Khaki / 30", "stock": 10},
            {"sku": "SFC-KHK-32", "name": "Khaki / 32", "stock": 15},
            {"sku": "SFC-NVY-32", "name": "Navy / 32",  "stock": 12},
            {"sku": "SFC-NVY-34", "name": "Navy / 34",  "stock": 8},
        ],
    },
    {
        "name": "Merino Wool Crewneck",
        "slug": "merino-wool-crewneck",
        "sku": "PROD-007",
        "category": "fashion",
        "brand": "luxe-studio",
        "description": "Lightweight 100% merino wool crewneck sweater. Naturally temperature-regulating, soft against skin, and machine washable on a gentle cycle.",
        "base_price": "119.99",
        "compare_at_price": "149.99",
        "is_featured": True,
        "images": [
            {"url": "https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=800&q=80", "is_primary": True},
        ],
        "variants": [
            {"sku": "MWC-CRM-S", "name": "Cream / S",   "stock": 8},
            {"sku": "MWC-CRM-M", "name": "Cream / M",   "stock": 12},
            {"sku": "MWC-CHR-M", "name": "Charcoal / M","stock": 10},
            {"sku": "MWC-CHR-L", "name": "Charcoal / L","stock": 7},
        ],
    },

    # ── Home & Living ─────────────────────────────────────────────────────
    {
        "name": "Ceramic Pour-Over Coffee Set",
        "slug": "ceramic-pour-over-coffee-set",
        "sku": "PROD-008",
        "category": "home-living",
        "brand": "luxe-studio",
        "description": "Handcrafted ceramic dripper and carafe set for the perfect pour-over. Includes a stainless steel filter, coaster, and cotton carrying bag. 600 ml capacity.",
        "base_price": "44.99",
        "compare_at_price": None,
        "is_featured": True,
        "images": [
            {"url": "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80", "is_primary": True},
            {"url": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&q=80"},
        ],
        "variants": [
            {"sku": "CPO-WHT", "name": "Matte White",  "stock": 20},
            {"sku": "CPO-TER", "name": "Terracotta",   "stock": 15},
            {"sku": "CPO-SLT", "name": "Slate Grey",   "stock": 10},
        ],
    },
    {
        "name": "Linen Throw Blanket",
        "slug": "linen-throw-blanket",
        "sku": "PROD-009",
        "category": "home-living",
        "brand": "luxe-studio",
        "description": "Oversized stonewashed linen throw. 100% pure linen, pre-washed for extra softness. 140 × 200 cm — large enough to wrap around two.",
        "base_price": "79.99",
        "compare_at_price": "99.99",
        "is_featured": False,
        "images": [
            {"url": "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&q=80", "is_primary": True},
        ],
        "variants": [
            {"sku": "LTB-SND", "name": "Sand",         "stock": 14},
            {"sku": "LTB-MOS", "name": "Moss Green",   "stock": 9},
            {"sku": "LTB-DUS", "name": "Dusty Rose",   "stock": 11},
        ],
    },
    {
        "name": "Minimalist Desk Lamp",
        "slug": "minimalist-desk-lamp",
        "sku": "PROD-010",
        "category": "home-living",
        "brand": "apex-tech",
        "description": "Architect-style LED desk lamp with touch dimmer (3 brightness levels), USB-A charging port, and a 360° adjustable arm. 10W, 5000K daylight.",
        "base_price": "64.99",
        "compare_at_price": "84.99",
        "is_featured": True,
        "images": [
            {"url": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80", "is_primary": True},
        ],
        "variants": [
            {"sku": "MDL-BLK", "name": "Matte Black", "stock": 22},
            {"sku": "MDL-WHT", "name": "White",        "stock": 18},
        ],
    },

    # ── Beauty ────────────────────────────────────────────────────────────
    {
        "name": "Vitamin C Brightening Serum",
        "slug": "vitamin-c-brightening-serum",
        "sku": "PROD-011",
        "category": "beauty",
        "brand": "pureglow",
        "description": "15% L-ascorbic acid serum with hyaluronic acid and vitamin E. Brightens, evens skin tone, and reduces signs of ageing. 30 ml. Fragrance-free.",
        "base_price": "34.99",
        "compare_at_price": "44.99",
        "is_featured": True,
        "images": [
            {"url": "https://images.unsplash.com/photo-1570194065650-d99fb4b8ccb0?w=800&q=80", "is_primary": True},
        ],
        "variants": [
            {"sku": "VCS-30ML", "name": "30 ml", "stock": 50},
        ],
    },
    {
        "name": "Hydrating Face Mask Set",
        "slug": "hydrating-face-mask-set",
        "sku": "PROD-012",
        "category": "beauty",
        "brand": "pureglow",
        "description": "Pack of 10 biodegradable sheet masks infused with hyaluronic acid, aloe vera, and ceramides. Dermatologist-tested, suitable for all skin types.",
        "base_price": "24.99",
        "compare_at_price": None,
        "is_featured": False,
        "images": [
            {"url": "https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=800&q=80", "is_primary": True},
        ],
        "variants": [
            {"sku": "HFM-10PK", "name": "10-pack", "stock": 60},
        ],
    },
    {
        "name": "Rose Gold Facial Roller",
        "slug": "rose-gold-facial-roller",
        "sku": "PROD-013",
        "category": "beauty",
        "brand": "pureglow",
        "description": "Dual-ended facial roller with rose quartz head and nephrite jade smaller end. Reduces puffiness, improves circulation, and helps serums absorb. Comes with a velvet pouch.",
        "base_price": "19.99",
        "compare_at_price": "29.99",
        "is_featured": True,
        "images": [
            {"url": "https://images.unsplash.com/photo-1625772452859-1c03d884dcd7?w=800&q=80", "is_primary": True},
        ],
        "variants": [
            {"sku": "RGR-STD", "name": "Standard", "stock": 35},
        ],
    },

    # ── Sports ────────────────────────────────────────────────────────────
    {
        "name": "Adjustable Dumbbell Set",
        "slug": "adjustable-dumbbell-set",
        "sku": "PROD-014",
        "category": "sports",
        "brand": "swiftgear",
        "description": "Space-saving adjustable dumbbells with quick-lock dial. Each dumbbell adjusts from 2.5 kg to 25 kg in 2.5 kg increments — replaces 10 pairs. Includes storage tray.",
        "base_price": "189.99",
        "compare_at_price": "249.99",
        "is_featured": True,
        "images": [
            {"url": "https://images.unsplash.com/photo-1534368959876-26bf04f2c947?w=800&q=80", "is_primary": True},
        ],
        "variants": [
            {"sku": "ADS-SET", "name": "2 × 25 kg set", "stock": 8},
        ],
    },
    {
        "name": "Non-Slip Yoga Mat",
        "slug": "non-slip-yoga-mat",
        "sku": "PROD-015",
        "category": "sports",
        "brand": "swiftgear",
        "description": "6 mm thick natural rubber yoga mat with open-cell surface for maximum grip. Includes alignment lines, carry strap, and microfibre towel. 183 × 68 cm.",
        "base_price": "54.99",
        "compare_at_price": None,
        "is_featured": False,
        "images": [
            {"url": "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800&q=80", "is_primary": True},
        ],
        "variants": [
            {"sku": "NYM-PRP", "name": "Indigo",        "stock": 30},
            {"sku": "NYM-GRN", "name": "Forest Green",  "stock": 25},
            {"sku": "NYM-BLK", "name": "Black",         "stock": 20},
        ],
    },
    {
        "name": "Insulated Sports Water Bottle",
        "slug": "insulated-sports-water-bottle",
        "sku": "PROD-016",
        "category": "sports",
        "brand": "swiftgear",
        "description": "Double-wall vacuum-insulated stainless steel bottle. Keeps drinks cold 24 h or hot 12 h. Leak-proof lid with carry loop. BPA-free. Dishwasher safe.",
        "base_price": "29.99",
        "compare_at_price": "39.99",
        "is_featured": False,
        "images": [
            {"url": "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&q=80", "is_primary": True},
        ],
        "variants": [
            {"sku": "ISB-500-BLK", "name": "500 ml / Black",   "stock": 40},
            {"sku": "ISB-750-BLK", "name": "750 ml / Black",   "stock": 35},
            {"sku": "ISB-500-WHT", "name": "500 ml / White",   "stock": 30},
            {"sku": "ISB-750-TEL", "name": "750 ml / Teal",    "stock": 20},
        ],
    },

    # ── Watches ───────────────────────────────────────────────────────────
    {
        "name": "Heritage Automatic Watch",
        "slug": "heritage-automatic-watch",
        "sku": "PROD-017",
        "category": "watches",
        "brand": "prestige-co",
        "description": "Swiss-inspired automatic movement visible through a sapphire caseback. 40 mm stainless steel case, 100 m water resistance, genuine leather strap.",
        "base_price": "299.99",
        "compare_at_price": "399.99",
        "is_featured": True,
        "images": [
            {"url": "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=800&q=80", "is_primary": True},
            {"url": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80"},
        ],
        "variants": [
            {"sku": "HAW-BRN", "name": "Brown Leather",  "stock": 6},
            {"sku": "HAW-BLK", "name": "Black Leather",  "stock": 5},
        ],
    },
    {
        "name": "Minimalist Field Watch",
        "slug": "minimalist-field-watch",
        "sku": "PROD-018",
        "category": "watches",
        "brand": "prestige-co",
        "description": "Clean-dial field watch with Japanese quartz movement, 38 mm brushed case, and interchangeable 20 mm nylon strap. 50 m water resistant.",
        "base_price": "149.99",
        "compare_at_price": None,
        "is_featured": True,
        "images": [
            {"url": "https://images.unsplash.com/photo-1434056886845-dac89ffe9b56?w=800&q=80", "is_primary": True},
        ],
        "variants": [
            {"sku": "MFW-OLV", "name": "Olive Nylon",   "stock": 12},
            {"sku": "MFW-TAN", "name": "Tan Nylon",     "stock": 10},
            {"sku": "MFW-BLK", "name": "Black Nylon",   "stock": 9},
        ],
    },
    {
        "name": "Smart Fitness Tracker",
        "slug": "smart-fitness-tracker",
        "sku": "PROD-019",
        "category": "watches",
        "brand": "apex-tech",
        "description": "Always-on AMOLED display, heart rate, SpO2, sleep tracking, 7-day battery, GPS. 5 ATM water resistance. Works with iOS and Android.",
        "base_price": "99.99",
        "compare_at_price": "129.99",
        "is_featured": False,
        "images": [
            {"url": "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=800&q=80", "is_primary": True},
        ],
        "variants": [
            {"sku": "SFT-BLK", "name": "Midnight Black", "stock": 22},
            {"sku": "SFT-PNK", "name": "Blush Pink",     "stock": 14},
            {"sku": "SFT-WHT", "name": "Arctic White",   "stock": 16},
        ],
    },
]


class Command(BaseCommand):
    help = "Seed realistic dummy products for development and testing."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete all existing products, variants, images, and stock before seeding.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options["clear"]:
            self.stdout.write(self.style.WARNING("Clearing existing catalog data…"))
            StockItem.objects.all().delete()
            ProductImage.objects.all().delete()
            ProductVariant.objects.all().delete()
            Product.objects.all().delete()
            Brand.objects.all().delete()
            self.stdout.write(self.style.WARNING("Cleared."))

        # Ensure warehouse exists
        warehouse, _ = Warehouse.objects.get_or_create(
            code="WH-001",
            defaults={"name": "Main Warehouse", "is_default": True},
        )

        # Upsert categories
        category_map: dict[str, Category] = {}
        for cat_data in CATEGORIES:
            cat, _ = Category.objects.get_or_create(
                slug=cat_data["slug"],
                defaults={"name": cat_data["name"], "is_active": True, "display_order": 0},
            )
            category_map[cat_data["slug"]] = cat

        # Upsert brands
        brand_map: dict[str, Brand] = {}
        for brand_data in BRANDS:
            brand, _ = Brand.objects.get_or_create(
                slug=brand_data["slug"],
                defaults={"name": brand_data["name"], "is_active": True},
            )
            brand_map[brand_data["slug"]] = brand

        created = skipped = 0

        for p_data in PRODUCTS:
            if Product.objects.filter(slug=p_data["slug"]).exists():
                self.stdout.write(f"  skip  {p_data['name']}")
                skipped += 1
                continue

            product = Product.objects.create(
                name=p_data["name"],
                slug=p_data["slug"],
                sku=p_data["sku"],
                category=category_map[p_data["category"]],
                brand=brand_map[p_data["brand"]],
                description=p_data["description"],
                base_price=Decimal(p_data["base_price"]),
                compare_at_price=(
                    Decimal(p_data["compare_at_price"]) if p_data["compare_at_price"] else None
                ),
                status=ProductStatus.PUBLISHED,
                is_active=True,
                is_featured=p_data.get("is_featured", False),
            )

            # Images — stored as external_url for dev/demo (no file upload needed)
            for idx, img in enumerate(p_data["images"]):
                ProductImage.objects.create(
                    product=product,
                    external_url=img["url"],
                    alt_text=product.name,
                    display_order=idx,
                    is_primary=img.get("is_primary", False),
                )

            # Variants + stock
            for v_data in p_data["variants"]:
                variant = ProductVariant.objects.create(
                    product=product,
                    sku=v_data["sku"],
                    is_active=True,
                )
                StockItem.objects.create(
                    variant=variant,
                    warehouse=warehouse,
                    quantity_on_hand=v_data["stock"],
                    quantity_reserved=0,
                )

            created += 1
            self.stdout.write(self.style.SUCCESS(f"  ✓     {product.name}"))

        # Clear category tree cache
        if HAS_CACHE:
            try:
                cache.delete(CATEGORY_TREE_CACHE_KEY)
            except Exception:
                pass

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone — {created} product(s) created, {skipped} skipped."
            )
        )
