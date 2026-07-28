from __future__ import annotations

from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.notifications.models import Notification
from apps.notifications.serializers import NotificationBulkActionSerializer, NotificationSerializer


@extend_schema(
    summary="List notifications",
    description="Paginated list of the authenticated user's notifications, newest first.",
    responses={200: NotificationSerializer(many=True)},
    tags=["Notifications"],
)
class NotificationListView(generics.ListAPIView):
    """Paginated list of the authenticated user's notifications, newest first."""

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)


@extend_schema(
    summary="Mark notification as read",
    description="Mark a single notification as read. Returns the updated notification object.",
    responses={200: NotificationSerializer, 404: None},
    tags=["Notifications"],
)
class MarkNotificationReadView(APIView):
    """Mark a single notification as read.  Returns the updated object."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        try:
            notification = Notification.objects.get(pk=pk, user=request.user)
        except Notification.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if not notification.is_read:
            notification.is_read = True
            notification.read_at = timezone.now()
            notification.save(update_fields=["is_read", "read_at"])

        serializer = NotificationSerializer(notification)
        return Response(serializer.data)


@extend_schema(
    summary="Mark all notifications as read",
    description="Mark every unread notification for the current user as read.",
    request=None,
    responses={200: {"type": "object", "properties": {"updated": {"type": "integer"}}}},
    tags=["Notifications"],
)
class MarkAllNotificationsReadView(APIView):
    """Mark every unread notification for the current user as read."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        now = timezone.now()
        updated = (
            Notification.objects.filter(user=request.user, is_read=False)
            .update(is_read=True, read_at=now)
        )
        return Response({"updated": updated})


@extend_schema(tags=["Notifications"])
class NotificationDeleteView(generics.DestroyAPIView):
    """Delete a single notification belonging to the current user."""

    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    def get_object(self):
        return get_object_or_404(self.get_queryset(), pk=self.kwargs["pk"])


@extend_schema(
    tags=["Notifications"],
    request=NotificationBulkActionSerializer,
    responses={200: {"type": "object", "properties": {"deleted": {"type": "integer"}}}},
)
class NotificationBulkDeleteView(APIView):
    """Delete multiple notifications by IDs (own notifications only)."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = NotificationBulkActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ids = serializer.validated_data["ids"]
        deleted_count, _ = Notification.objects.filter(
            user=request.user, pk__in=ids
        ).delete()
        return Response({"deleted": deleted_count}, status=status.HTTP_200_OK)


@extend_schema(
    tags=["Notifications"],
    responses={200: {"type": "object", "properties": {"deleted": {"type": "integer"}}}},
)
class NotificationClearAllView(APIView):
    """Delete all notifications for the current user."""

    permission_classes = [IsAuthenticated]

    def delete(self, request):
        deleted_count, _ = Notification.objects.filter(user=request.user).delete()
        return Response({"deleted": deleted_count}, status=status.HTTP_200_OK)


@extend_schema(
    tags=["Notifications"],
    request=NotificationBulkActionSerializer,
    responses={200: {"type": "object", "properties": {"updated": {"type": "integer"}}}},
)
class NotificationBulkMarkReadView(APIView):
    """Mark multiple notifications as read by IDs (own notifications only)."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = NotificationBulkActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ids = serializer.validated_data["ids"]
        now = timezone.now()
        updated_count = Notification.objects.filter(
            user=request.user, pk__in=ids, is_read=False
        ).update(is_read=True, read_at=now)
        return Response({"updated": updated_count}, status=status.HTTP_200_OK)


@extend_schema(
    tags=["Notifications"],
    responses={200: {"type": "object", "properties": {"unread_count": {"type": "integer"}}}},
)
class NotificationUnreadCountView(APIView):
    """Return the count of unread notifications for the current user."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({"unread_count": count}, status=status.HTTP_200_OK)
