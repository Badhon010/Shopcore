"""Shared abstract base models used across the project."""
from __future__ import annotations

from django.db import models
from django.utils import timezone


class TimeStampedModel(models.Model):
    """Abstract model that tracks creation and update timestamps."""

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class SoftDeleteQuerySet(models.QuerySet):
    """QuerySet that supports soft deletion via is_active flag."""

    def active(self) -> SoftDeleteQuerySet:
        """Return only active (not soft-deleted) objects."""
        return self.filter(is_active=True)

    def delete(self) -> tuple[int, dict]:
        """Soft-delete all objects in the queryset."""
        return self.update(is_active=False)

    def hard_delete(self) -> tuple[int, dict]:
        """Permanently delete all objects in the queryset."""
        return super().delete()


class SoftDeleteManager(models.Manager):
    """Default manager that returns only active objects."""

    def get_queryset(self) -> SoftDeleteQuerySet:
        return SoftDeleteQuerySet(self.model, using=self._db).filter(is_active=True)

    def active(self) -> SoftDeleteQuerySet:
        return self.get_queryset()


class AllObjectsManager(models.Manager):
    """Manager that returns all objects, including soft-deleted ones."""

    def get_queryset(self) -> SoftDeleteQuerySet:
        return SoftDeleteQuerySet(self.model, using=self._db)


class SoftDeleteModel(TimeStampedModel):
    """Abstract model supporting soft deletion.

    The default manager (``objects``) filters to active-only records.
    Use ``all_objects`` to see everything, e.g. in the Django Admin.
    """

    is_active = models.BooleanField(default=True, db_index=True)

    objects = SoftDeleteManager()
    all_objects = AllObjectsManager()

    class Meta:
        abstract = True

    def delete(self, using: str | None = None, keep_parents: bool = False) -> None:
        """Soft-delete this object by setting is_active=False."""
        self.is_active = False
        self.save(update_fields=["is_active", "updated_at"])

    def hard_delete(self, using: str | None = None, keep_parents: bool = False) -> tuple:
        """Permanently delete this object from the database."""
        return super().delete(using=using, keep_parents=keep_parents)
