from __future__ import annotations
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.notifications.models import Notification
from apps.notifications.serializers import NotificationSerializer


class NotificationListView(generics.ListAPIView):
    """Paginated list of the authenticated user's notifications, newest first."""

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)


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
