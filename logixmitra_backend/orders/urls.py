from django.urls import path

from orders.views import (
    BulkShipmentView,
    CancelShipmentView,
    CodRemittanceView,
    DisputeOrderView,
    OrderDetailView,
    OrderListCreateView,
    OrderStatsView,
    OrderStatusView,
    UserOrdersWithShipmentView,
)

urlpatterns = [
    path("", OrderListCreateView.as_view(), name="orders-list"),
    path("stats", OrderStatsView.as_view(), name="orders-stats"),
    path("getUserOrdersWithShipment/<int:user_id>", UserOrdersWithShipmentView.as_view(), name="user-orders-shipment"),
    path("getCodRemittance/<int:user_id>", CodRemittanceView.as_view(), name="cod-remittance"),
    path("bulkshipmentcreate", BulkShipmentView.as_view(), name="bulk-shipment"),
    path("cancelshipment", CancelShipmentView.as_view(), name="cancel-shipment"),
    path("dispute_order", DisputeOrderView.as_view(), name="dispute-order"),
    path("<uuid:pk>/status", OrderStatusView.as_view(), name="order-status"),
    path("<uuid:pk>", OrderDetailView.as_view(), name="order-detail"),
]
