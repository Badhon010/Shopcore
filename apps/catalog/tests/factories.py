"""Test factories for the catalog app."""
from __future__ import annotations

import factory
from factory.django import DjangoModelFactory

from apps.catalog.constants import ProductStatus
from apps.catalog.models import Attribute, AttributeValue, Brand, Category, Product, ProductVariant


class CategoryFactory(DjangoModelFactory):
    name = factory.Sequence(lambda n: f"Category {n}")
    slug = factory.Sequence(lambda n: f"category-{n}")
    is_active = True
    display_order = 0

    class Meta:
        model = Category


class BrandFactory(DjangoModelFactory):
    name = factory.Sequence(lambda n: f"Brand {n}")
    slug = factory.Sequence(lambda n: f"brand-{n}")
    is_active = True

    class Meta:
        model = Brand


class AttributeFactory(DjangoModelFactory):
    name = factory.Sequence(lambda n: f"Attribute {n}")
    slug = factory.Sequence(lambda n: f"attribute-{n}")

    class Meta:
        model = Attribute


class AttributeValueFactory(DjangoModelFactory):
    attribute = factory.SubFactory(AttributeFactory)
    value = factory.Sequence(lambda n: f"Value {n}")
    display_order = 0

    class Meta:
        model = AttributeValue


class ProductFactory(DjangoModelFactory):
    name = factory.Sequence(lambda n: f"Product {n}")
    slug = factory.Sequence(lambda n: f"product-{n}")
    category = factory.SubFactory(CategoryFactory)
    brand = factory.SubFactory(BrandFactory)
    description = "Test product description."
    base_price = factory.Faker("pydecimal", left_digits=3, right_digits=2, positive=True)
    sku = factory.Sequence(lambda n: f"SKU-{n:04d}")
    status = ProductStatus.PUBLISHED
    is_active = True

    class Meta:
        model = Product


class ProductVariantFactory(DjangoModelFactory):
    product = factory.SubFactory(ProductFactory)
    sku = factory.Sequence(lambda n: f"VAR-{n:04d}")
    is_active = True

    class Meta:
        model = ProductVariant
