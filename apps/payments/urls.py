from __future__ import annotations
from django.urls import path
from apps.payments.views import InitiatePaymentView, WebhookView

app_name = "payments"

urlpatterns = [
    path("initiate/", InitiatePaymentView.as_view(), name="payment-initiate"),
    path("webhook/<str:provider>/", WebhookView.as_view(), name="payment-webhook"),
]
