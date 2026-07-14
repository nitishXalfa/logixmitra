from django.urls import path

from orders.views import ManualCreateOrderView, MergeCreateOrderView
from orders.warehouse_views import (
    CreateWarehouseView,
    DeleteWarehouseView,
    GetAllWarehousesView,
    GetWarehouseByIdView,
    UpdateWarehouseView,
)
from reports.views import DashboardDataView, ReportDataView

from accounts.views import LoginView, LogoutView, MeView, RegisterView, UpdatePasswordView, UsersListView

urlpatterns = [
    path("login", LoginView.as_view(), name="login"),
    path("logout", LogoutView.as_view(), name="logout"),
    path("me", MeView.as_view(), name="me"),
    path("users", UsersListView.as_view(), name="auth-users"),
    path("register", RegisterView.as_view(), name="register"),
    path("updatePassword", UpdatePasswordView.as_view(), name="update-password"),
    path("getDashboardData", DashboardDataView.as_view(), name="dashboard-data"),
    path("getReportData", ReportDataView.as_view(), name="report-data"),
    path("createWarehouse", CreateWarehouseView.as_view(), name="create-warehouse"),
    path("getAllWarehouses", GetAllWarehousesView.as_view(), name="get-all-warehouses"),
    path("getWarehouseById/<int:pk>", GetWarehouseByIdView.as_view(), name="get-warehouse"),
    path("updateWarehouse/<int:pk>", UpdateWarehouseView.as_view(), name="update-warehouse"),
    path("deleteWarehouse/<int:pk>", DeleteWarehouseView.as_view(), name="delete-warehouse"),
    path("manualcreateOrder", ManualCreateOrderView.as_view(), name="manual-create-order"),
    path("mergecreateOrder", MergeCreateOrderView.as_view(), name="merge-create-order"),
]
