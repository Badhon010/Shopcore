from __future__ import annotations

from django.urls import path

from apps.payments.views import (
    AdminPaymentMethodDetailView,
    AdminPaymentMethodListView,
    AdminPaymentSubmissionListView,
    AdminPaymentSubmissionReviewView,
    InitiatePaymentView,
    PaymentMethodListView,
    SubmitManualPaymentView,
    WebhookView,
)

app_name = "payments"

urlpatterns = [
    path("methods/", PaymentMethodListView.as_view(), name="payment-method-list"),
    path("initiate/", InitiatePaymentView.as_view(), name="payment-initiate"),
    path("submit/", SubmitManualPaymentView.as_view(), name="payment-submit"),
    path("admin/methods/", AdminPaymentMethodListView.as_view(), name="payment-method-admin-list"),
    path(
        "admin/methods/<int:pk>/",
        AdminPaymentMethodDetailView.as_view(),
        name="payment-method-admin-detail",
    ),
    path(
        "admin/submissions/",
        AdminPaymentSubmissionListView.as_view(),
        name="payment-submission-admin-list",
    ),
    path(
        "admin/submissions/<int:pk>/review/",
        AdminPaymentSubmissionReviewView.as_view(),
        name="payment-submission-admin-review",
    ),
    path("webhook/<str:provider>/", WebhookView.as_view(), name="payment-webhook"),
]
