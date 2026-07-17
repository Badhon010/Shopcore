"""Signals for the accounts app."""
from __future__ import annotations

# No signals in accounts app.
# Wishlist auto-creation is intentionally done via get_or_create in the service
# layer, NOT via a signal — signals for this would scatter the creation logic
# and make it harder to trace.
