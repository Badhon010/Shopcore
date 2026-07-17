"""Seed baseline homepage hero banners.

Populates the hero slider shown on the homepage with a few starter
slides so the frontend has real data to render. Safe to re-run — uses
get_or_create keyed on title, so it won't create duplicates.
"""
from __future__ import annotations

from pathlib import Path

from django.core.files import File
from django.core.management.base import BaseCommand

from apps.catalog.models import Banner

BASE_DIR = Path(__file__).resolve().parents[2]

BANNERS = [
    {
        "title": "Discover premium products, every day",
        "eyebrow": "Exclusive Collection",
        "subtitle": "Shop the latest tech, curated with care. Quality you can trust, prices you'll love.",
        "image": BASE_DIR / "seed_banner_1.jpg",
        "cta_text": "Shop now",
        "cta_link": "/products",
        "secondary_cta_text": "Explore categories",
        "secondary_cta_link": "#categories",
        "display_order": 0,
    },
    {
        "title": "Fresh styles just landed",
        "eyebrow": "New Season",
        "subtitle": "Explore the newest arrivals across fashion, tech, and home — updated weekly.",
        "image": BASE_DIR / "seed_banner_2.jpg",
        "cta_text": "Shop now",
        "cta_link": "/products",
        "secondary_cta_text": "Explore categories",
        "secondary_cta_link": "#categories",
        "display_order": 1,
    },
    {
        "title": "Up to 30% off best sellers",
        "eyebrow": "Limited Time",
        "subtitle": "Our most-loved products at their best prices. Don't miss out while stock lasts.",
        "image": BASE_DIR / "seed_banner_3.jpg",
        "cta_text": "Shop now",
        "cta_link": "/products",
        "secondary_cta_text": "Explore categories",
        "secondary_cta_link": "#categories",
        "display_order": 2,
    },
]


class Command(BaseCommand):
    help = "Seed the baseline homepage hero banners."

    def handle(self, *args, **options):
        created_count = 0
        for data in BANNERS:
            image_path = data.pop("image")
            banner, created = Banner.objects.get_or_create(
                title=data["title"],
                defaults=data,
            )
            if created:
                if image_path.exists():
                    with open(image_path, "rb") as f:
                        banner.image.save(image_path.name, File(f), save=True)
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f"Created banner: {banner.title}"))
        if created_count == 0:
            self.stdout.write("No new banners created (already seeded).")
        else:
            self.stdout.write(self.style.SUCCESS(f"Seeded {created_count} banners."))
