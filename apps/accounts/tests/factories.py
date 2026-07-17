"""Test factories for the accounts app."""
from __future__ import annotations

import factory
from django.contrib.auth import get_user_model
from factory.django import DjangoModelFactory

from apps.accounts.models import Address
from apps.accounts.constants import AddressType

User = get_user_model()


class UserFactory(DjangoModelFactory):
    email = factory.Sequence(lambda n: f"user{n}@example.com")
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    is_active = True
    is_email_verified = True

    class Meta:
        model = User

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        manager = model_class._default_manager
        return manager.create_user(*args, password="testpassword123!", **kwargs)


class StaffUserFactory(UserFactory):
    is_staff = True


class SuperUserFactory(UserFactory):
    is_staff = True
    is_superuser = True


class AddressFactory(DjangoModelFactory):
    user = factory.SubFactory(UserFactory)
    full_name = factory.Faker("name")
    phone_number = "+15551234567"
    address_line_1 = factory.Faker("street_address")
    city = factory.Faker("city")
    state_province = factory.Faker("state")
    postal_code = factory.Faker("postcode")
    country = "US"
    address_type = AddressType.SHIPPING
    is_default = False

    class Meta:
        model = Address
