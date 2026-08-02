from __future__ import annotations

from django.urls import path

from apps.notifications import views

app_name = "notifications"

urlpatterns = [
    path("", views.NotificationListView.as_view(), name="list"),
    path("<int:pk>/read/", views.MarkNotificationReadView.as_view(), name="mark-read"),
    path("read-all/", views.MarkAllNotificationsReadView.as_view(), name="mark-all-read"),
    path("<int:pk>/", views.NotificationDeleteView.as_view(), name="notification-delete"),
    path("bulk-delete/", views.NotificationBulkDeleteView.as_view(), name="bulk-delete"),
    path("clear-all/", views.NotificationClearAllView.as_view(), name="clear-all"),
    path("bulk-mark-read/", views.NotificationBulkMarkReadView.as_view(), name="bulk-mark-read"),
    path("unread-count/", views.NotificationUnreadCountView.as_view(), name="unread-count"),
]
