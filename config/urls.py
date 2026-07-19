"""Root URL configuration for ShopCore."""
from __future__ import annotations

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

# Customize admin titles (also done in AdminConfig, belt-and-suspenders here)
admin.site.site_header = settings.ADMIN_SITE_HEADER
admin.site.site_title = settings.ADMIN_SITE_TITLE
admin.site.index_title = settings.ADMIN_INDEX_TITLE

API_V1 = "api/v1/"

urlpatterns = [
    # Django admin
    path("admin/", admin.site.urls),
    # OpenAPI schema + docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path(
        "api/redoc/",
        SpectacularRedocView.as_view(url_name="schema"),
        name="redoc",
    ),
    # App API routes
    path(f"{API_V1}accounts/", include("apps.accounts.urls", namespace="accounts")),
    path(f"{API_V1}catalog/", include("apps.catalog.urls", namespace="catalog")),
    path(f"{API_V1}inventory/", include("apps.inventory.urls", namespace="inventory")),
    path(f"{API_V1}cart/", include("apps.cart.urls", namespace="cart")),
    path(f"{API_V1}orders/", include("apps.orders.urls", namespace="orders")),
    path(f"{API_V1}payments/", include("apps.payments.urls", namespace="payments")),
    path(f"{API_V1}coupons/", include("apps.coupons.urls", namespace="coupons")),
    path(f"{API_V1}reviews/", include("apps.reviews.urls", namespace="reviews")),
    path(f"{API_V1}wishlist/", include("apps.wishlist.urls", namespace="wishlist")),
    path(f"{API_V1}notifications/", include("apps.notifications.urls", namespace="notifications")),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# django-debug-toolbar (development only)
if settings.DEBUG:
    try:
        import debug_toolbar

        urlpatterns = [path("__debug__/", include(debug_toolbar.urls))] + urlpatterns
    except ImportError:
        pass
