from django.urls import path

from accounts.role_views import PermissionDetailView, PermissionListCreateView, PermissionModulesView

urlpatterns = [
    path("", PermissionListCreateView.as_view(), name="permissions-list"),
    path("modules", PermissionModulesView.as_view(), name="permission-modules"),
    path("<int:pk>", PermissionDetailView.as_view(), name="permission-detail"),
]
