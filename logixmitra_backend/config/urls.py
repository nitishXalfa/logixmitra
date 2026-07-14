from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from config.file_views import PreviewView, ReadExcelView, UploadView
from config.integration_views import (
    IntegrationsDetailView,
    IntegrationsListView,
    IntegrationsTestView,
    PincodeChartGetView,
    PincodeChartSetView,
    RateChartSetView,
    SyncShopifyView,
    SyncWooCommerceView,
)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.auth_urls")),
    path("api/orders/", include("orders.urls")),
    path("api/wallets/", include("finance.urls")),
    path("api/roles/", include("accounts.role_urls")),
    path("api/permissions/", include("accounts.permission_urls")),
    path("api/users/", include("accounts.user_urls")),
    path("api/tracking/", include("tracking.urls")),
    path("api/sellers/", include("accounts.seller_urls")),
    path("api/health/", include("config.health_urls")),
    path("upload", UploadView.as_view(), name="upload"),
    path("read-excel", ReadExcelView.as_view(), name="read-excel"),
    path("preview/<str:filename>", PreviewView.as_view(), name="preview"),
    path("api/integrations", IntegrationsListView.as_view(), name="integrations-list"),
    path("api/integrations/test", IntegrationsTestView.as_view(), name="integrations-test"),
    path("api/integrations/syncsopify", SyncShopifyView.as_view(), name="sync-shopify"),
    path("api/integrations/syncwoocomerce", SyncWooCommerceView.as_view(), name="sync-woocommerce"),
    path("api/integrations/ratechartset", RateChartSetView.as_view(), name="rate-chart-set"),
    path("api/integrations/pincodechartget_", PincodeChartGetView.as_view(), name="pincode-chart-get"),
    path("api/integrations/pincodechartset", PincodeChartSetView.as_view(), name="pincode-chart-set"),
    path("api/integrations/<str:pk>", IntegrationsDetailView.as_view(), name="integrations-detail"),
]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
