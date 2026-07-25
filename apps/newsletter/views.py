"""Views for the newsletter app."""
from __future__ import annotations

import logging
from datetime import timedelta

from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from apps.common.pagination import StandardResultsSetPagination
from apps.newsletter.models import NewsletterCampaign, NewsletterSubscriber
from apps.newsletter.serializers import (
    NewsletterCampaignListSerializer,
    NewsletterCampaignSerializer,
    NewsletterSubscribeSerializer,
    NewsletterSubscriberAdminSerializer,
)

logger = logging.getLogger("shopcore.newsletter.views")


class NewsletterSubscribeView(APIView):
    """Subscribe an email address to the newsletter."""

    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = NewsletterSubscribeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        subscriber = serializer.save()
        logger.info("Newsletter subscription: %s", subscriber.email)

        try:
            from apps.notifications.services import send_newsletter_confirmation
            send_newsletter_confirmation(subscriber.email)
        except Exception:
            logger.warning(
                "Failed to send newsletter confirmation to %s",
                subscriber.email,
                exc_info=True,
            )

        return Response(
            {"message": "You're subscribed! Thank you for joining."},
            status=status.HTTP_201_CREATED,
        )


class AdminSubscriberListView(generics.ListAPIView):
    """Staff-only: list all newsletter subscribers."""

    serializer_class = NewsletterSubscriberAdminSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        qs = NewsletterSubscriber.objects.all()
        search = self.request.query_params.get("search", "")
        if search:
            qs = qs.filter(email__icontains=search)
        active = self.request.query_params.get("active")
        if active is not None:
            qs = qs.filter(active=active.lower() == "true")
        return qs


class AdminSubscriberDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Staff-only: retrieve, toggle, or delete a subscriber."""

    serializer_class = NewsletterSubscriberAdminSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = NewsletterSubscriber.objects.all()


class AdminNewsletterStatsView(APIView):
    """Staff-only: aggregate newsletter statistics."""

    permission_classes = [permissions.IsAdminUser]

    def get(self, request, *args, **kwargs):
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last_month_start = (month_start - timedelta(days=1)).replace(day=1)

        total = NewsletterSubscriber.objects.count()
        active = NewsletterSubscriber.objects.filter(active=True).count()
        inactive = total - active

        this_month = NewsletterSubscriber.objects.filter(
            created_at__gte=month_start
        ).count()
        last_month = NewsletterSubscriber.objects.filter(
            created_at__gte=last_month_start, created_at__lt=month_start
        ).count()

        campaigns_sent = NewsletterCampaign.objects.filter(
            status=NewsletterCampaign.Status.SENT
        ).count()
        campaigns_draft = NewsletterCampaign.objects.filter(
            status=NewsletterCampaign.Status.DRAFT
        ).count()

        # Average open/click rates across all sent campaigns
        sent_campaigns = NewsletterCampaign.objects.filter(
            status=NewsletterCampaign.Status.SENT, recipient_count__gt=0
        )
        avg_open_rate = 0.0
        avg_click_rate = 0.0
        if sent_campaigns.exists():
            total_recipients = sum(c.recipient_count for c in sent_campaigns)
            total_opens = sum(c.open_count for c in sent_campaigns)
            total_clicks = sum(c.click_count for c in sent_campaigns)
            if total_recipients > 0:
                avg_open_rate = round(total_opens / total_recipients * 100, 1)
                avg_click_rate = round(total_clicks / total_recipients * 100, 1)

        return Response(
            {
                "total_subscribers": total,
                "active_subscribers": active,
                "inactive_subscribers": inactive,
                "new_this_month": this_month,
                "new_last_month": last_month,
                "campaigns_sent": campaigns_sent,
                "campaigns_draft": campaigns_draft,
                "avg_open_rate": avg_open_rate,
                "avg_click_rate": avg_click_rate,
            }
        )


class AdminCampaignViewSet(ModelViewSet):
    """Staff-only: full CRUD for newsletter campaigns."""

    permission_classes = [permissions.IsAdminUser]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        qs = NewsletterCampaign.objects.all()
        search = self.request.query_params.get("search", "")
        if search:
            qs = qs.filter(title__icontains=search)
        status_filter = self.request.query_params.get("status", "")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return NewsletterCampaignListSerializer
        return NewsletterCampaignSerializer

    @action(detail=True, methods=["post"], url_path="send")
    def send_campaign(self, request, pk=None):
        """Send a draft campaign to all active subscribers."""
        campaign = self.get_object()

        if campaign.status != NewsletterCampaign.Status.DRAFT:
            return Response(
                {"detail": "Only draft campaigns can be sent."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        active_subscribers = list(
            NewsletterSubscriber.objects.filter(active=True).values_list("email", flat=True)
        )

        if not active_subscribers:
            return Response(
                {"detail": "No active subscribers to send to."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        campaign.status = NewsletterCampaign.Status.SENDING
        campaign.save(update_fields=["status", "updated_at"])

        sent_count = 0
        failed = False

        try:
            from django.core.mail import EmailMultiAlternatives

            for email in active_subscribers:
                try:
                    msg = EmailMultiAlternatives(
                        subject=campaign.subject,
                        body=campaign.plain_body or campaign.subject,
                        from_email=None,  # uses DEFAULT_FROM_EMAIL
                        to=[email],
                    )
                    if campaign.html_body:
                        msg.attach_alternative(campaign.html_body, "text/html")
                    msg.send(fail_silently=False)
                    sent_count += 1
                except Exception:
                    logger.warning(
                        "Failed to send campaign %s to %s",
                        campaign.id,
                        email,
                        exc_info=True,
                    )

            campaign.status = NewsletterCampaign.Status.SENT
            campaign.sent_at = timezone.now()
            campaign.recipient_count = sent_count
            campaign.save(update_fields=["status", "sent_at", "recipient_count", "updated_at"])

            logger.info(
                "Campaign %s sent to %d/%d subscribers",
                campaign.id,
                sent_count,
                len(active_subscribers),
            )

        except Exception:
            failed = True
            logger.exception("Campaign send failed: %s", campaign.id)
            campaign.status = NewsletterCampaign.Status.FAILED
            campaign.save(update_fields=["status", "updated_at"])

        if failed:
            return Response(
                {"detail": "Campaign failed to send. Check server logs."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        serializer = NewsletterCampaignSerializer(campaign)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="duplicate")
    def duplicate_campaign(self, request, pk=None):
        """Duplicate a campaign as a new draft."""
        original = self.get_object()
        copy = NewsletterCampaign.objects.create(
            title=f"{original.title} (Copy)",
            subject=original.subject,
            preview_text=original.preview_text,
            html_body=original.html_body,
            plain_body=original.plain_body,
            status=NewsletterCampaign.Status.DRAFT,
        )
        serializer = NewsletterCampaignSerializer(copy)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
