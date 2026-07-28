"""Serializers for global search results."""
from __future__ import annotations

from rest_framework import serializers


class SearchResultSerializer(serializers.Serializer):
    """A single search result across any resource type."""

    type = serializers.CharField(help_text="Resource type: product|category|brand|order|customer|review|subscriber")
    id = serializers.IntegerField()
    title = serializers.CharField()
    subtitle = serializers.CharField(allow_blank=True, default="")
    url = serializers.CharField(allow_blank=True, default="", help_text="Admin detail path")
    extra = serializers.DictField(
        child=serializers.CharField(allow_null=True),
        default=dict,
        help_text="Type-specific extra fields",
    )
