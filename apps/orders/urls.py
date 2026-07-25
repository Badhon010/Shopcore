from __future__ import annotations
from django.urls import path
from apps.orders.views import (
    AdminOrderListView,
    CheckoutView,
    OrderCancelView,
    OrderDetailView,
    OrderListView,
    StaffOrderTransitionView,
)

app_name = "orders"

urlpatterns = [
    path("", OrderListView.as_view(), name="order-list"),
    path("checkout/", CheckoutView.as_view(), name="order-checkout"),
    path("<str:order_number>/", OrderDetailView.as_view(), name="order-detail"),
    path("<str:order_number>/cancel/", OrderCancelView.as_view(), name="order-cancel"),
    path("<str:order_number>/transition/", StaffOrderTransitionView.as_view(), name="order-transition"),
    path("admin/", AdminOrderListView.as_view(), name="order-admin-list"),
]
