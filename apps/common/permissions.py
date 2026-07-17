"""Shared DRF permission classes."""
from __future__ import annotations

from rest_framework.permissions import BasePermission, IsAdminUser, IsAuthenticated, SAFE_METHODS


class IsOwnerOrReadOnly(BasePermission):
    """Allow read access to anyone; write access only to the object owner."""

    def has_object_permission(self, request, view, obj) -> bool:
        if request.method in SAFE_METHODS:
            return True
        return hasattr(obj, "user") and obj.user == request.user


class IsOwner(BasePermission):
    """Allow access only to the object's owner."""

    def has_object_permission(self, request, view, obj) -> bool:
        return hasattr(obj, "user") and obj.user == request.user


class IsAdminOrReadOnly(BasePermission):
    """Allow read access to anyone; write access only to staff/admin users."""

    def has_permission(self, request, view) -> bool:
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_staff)


class IsStaffUser(BasePermission):
    """Allow access only to staff/admin users."""

    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)
