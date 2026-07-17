"""Seed baseline storefront categories.

Populates the top-level categories shown in the "All Categories" menu
(Electronics, Fashion, Home & Living, etc.). Safe to re-run — uses
get_or_create keyed on slug, so it won't create duplicates.
"""
from __future__ import annotations

from django.core.cache import cache
from django.core.management.base import BaseCommand

from apps.catalog.models import Category
from apps.catalog.selectors import CATEGORY_TREE_CACHE_KEY

CATEGORIES = [
    "Electronics",
    "Fashion",
    "Home & Living",
    "Beauty",
    "Sports",
    "Watches",
    "Bags",
    "Books",
]


class Command(BaseCommand):
    help = "Seed the baseline top-level storefront categories."

    def handle(self, *args, **options):
        created_count = 0
        for order, name in enumerate(CATEGORIES):
            slug = name.lower().replace(" & ", "-").replace(" ", "-")
            category, created = Category.objects.get_or_create(
                slug=slug,
                defaults={"name": name, "display_order": order},
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f"Created category: {name}"))
            else:
                self.stdout.write(f"Category already exists: {name}")

        cache.delete(CATEGORY_TREE_CACHE_KEY)
        self.stdout.write(
            self.style.SUCCESS(f"Done. {created_count} category(ies) created, cache cleared.")
        )
