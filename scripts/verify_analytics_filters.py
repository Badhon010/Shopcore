"""Verify the analytics time filters (granularity + date_from/date_to) work.

Runs against the real database via the DRF APIClient (force_authenticated as
the admin superuser), so it exercises the exact view code + ORM queries that
the running server would.
"""
import os
import sys
import django

# Ensure the project root (which contains `config/`) is importable.
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from rest_framework.test import APIClient  # noqa: E402
from apps.accounts.models import User  # noqa: E402

admin = User.objects.filter(is_staff=True, is_superuser=True).first()
assert admin, "No admin superuser found"
client = APIClient()
client.force_authenticate(admin)

ENDPOINTS = {
    "revenue": "/api/v1/dashboard/analytics/revenue/",
    "orders": "/api/v1/dashboard/analytics/orders/",
    "best-sellers": "/api/v1/dashboard/analytics/best-sellers/",
    "customers": "/api/v1/dashboard/analytics/customers/",
    "coupons": "/api/v1/dashboard/analytics/coupons/",
    "newsletter": "/api/v1/dashboard/analytics/newsletter/",
}

# Window A covers all data (orders Jul 19-30 2026); Window B has no data.
WINDOWS = {
    "A_Jul2026": {"date_from": "2026-07-01", "date_to": "2026-07-31"},
    "B_2025": {"date_from": "2025-01-01", "date_to": "2025-12-31"},
}


def summarize(name, data):
    if "detail" in data:
        return f"ERROR {data}"
    if name == "revenue":
        ot = data.get("over_time", [])
        return (
            f"period_days={data.get('period_days')} g={data.get('granularity')} "
            f"pts={len(ot)} cur_rev={data.get('current_period', {}).get('revenue')} "
            f"growth={data.get('revenue_growth_pct')}"
        )
    if name == "orders":
        dist = [(r["status"], r["count"]) for r in data.get("status_distribution", [])]
        return (
            f"period_days={data.get('period_days')} pts={len(data.get('over_time', []))} "
            f"dist={dist} cancel={data.get('cancellation_rate_pct')}"
        )
    if name == "best-sellers":
        top = [r["product_name"][:18] for r in data.get("results", [])[:2]]
        return f"period_days={data.get('period_days')} results={len(data.get('results', []))} top={top}"
    if name == "customers":
        return (
            f"period_days={data.get('period_days')} pts={len(data.get('over_time', []))} "
            f"total={data.get('total_customers')}"
        )
    if name == "coupons":
        top = [r.get("coupon_code") for r in data.get("top_coupons_this_period", [])[:2]]
        return (
            f"period_days={data.get('period_days')} coupon_orders={data.get('period_coupon_orders')} "
            f"top={top}"
        )
    if name == "newsletter":
        return (
            f"period_days={data.get('period_days')} pts={len(data.get('growth_over_time', []))} "
            f"total={data.get('total_subscribers')}"
        )
    return str(data)[:120]


print("=" * 78)
print("1) SAME WINDOW vs EMPTY WINDOW (date_from/date_to filtering)")
print("=" * 78)
for name, url in ENDPOINTS.items():
    for win, params in WINDOWS.items():
        r = client.get(url, params)
        print(f"{name:13s} {win:12s} HTTP {r.status_code} | {summarize(name, r.data)}")

print()
print("=" * 78)
print("2) GRANULARITY buckets within a fixed range (revenue)")
print("=" * 78)
for g in ("day", "week", "month", "year"):
    r = client.get(
        "/api/v1/dashboard/analytics/revenue/",
        {"date_from": "2026-07-01", "date_to": "2026-07-31", "granularity": g},
    )
    ot = r.data.get("over_time", [])
    buckets = [(str(p["bucket"])[:10], p["revenue"]) for p in ot]
    print(f"granularity={g:5s} buckets={buckets}")

print()
print("=" * 78)
print("3) days fallback vs explicit range equivalence (revenue)")
print("=" * 78)
r = client.get("/api/v1/dashboard/analytics/revenue/", {"days": 365})
cur = r.data.get("current_period", {}).get("revenue")
print(f"days=365      -> cur_rev={cur} pts={len(r.data.get('over_time', []))}")
r = client.get(
    "/api/v1/dashboard/analytics/revenue/",
    {"date_from": "2026-08-01", "date_to": "2026-08-01"},
)
cur = r.data.get("current_period", {}).get("revenue")
print(f"range today   -> cur_rev={cur} pts={len(r.data.get('over_time', []))}")

print()
print("=" * 78)
print("4) Orders status distribution is window-scoped")
print("=" * 78)
for win, params in WINDOWS.items():
    r = client.get("/api/v1/dashboard/analytics/orders/", params)
    print(f"orders {win:12s} dist={[(s['status'], s['count']) for s in r.data.get('status_distribution', [])]}")

print()
print("DONE")
