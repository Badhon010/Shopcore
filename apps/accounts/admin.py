"""Admin configuration for the accounts app."""
from __future__ import annotations

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from apps.accounts.models import Address, User


class AddressInline(admin.TabularInline):
    model = Address
    extra = 0
    fields = ["full_name", "address_line_1", "city", "country", "address_type", "is_default"]
    readonly_fields = ["is_default"]


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ["email", "full_name", "is_active", "is_staff", "is_email_verified", "date_joined"]
    list_filter = ["is_active", "is_staff", "is_superuser", "is_email_verified"]
    search_fields = ["email", "first_name", "last_name"]
    ordering = ["-date_joined"]
    inlines = [AddressInline]

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal info", {"fields": ("first_name", "last_name", "phone_number")}),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "is_email_verified",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "password1", "password2"),
            },
        ),
    )


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ["full_name", "user", "city", "country", "address_type", "is_default"]
    list_filter = ["address_type", "country", "is_default"]
    search_fields = ["full_name", "user__email", "city", "postal_code"]
    raw_id_fields = ["user"]
