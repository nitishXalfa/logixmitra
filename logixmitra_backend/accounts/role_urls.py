from django.urls import path

from accounts.role_views import (
    PermissionDetailView,
    PermissionListCreateView,
    PermissionModulesView,
    RoleDetailView,
    RoleListCreateView,
    RoleWithPermissionsView,
)

urlpatterns = [
    path("", RoleListCreateView.as_view(), name="roles-list"),
    path("with-permissions", RoleWithPermissionsView.as_view(), name="roles-with-permissions"),
    path("<int:pk>", RoleDetailView.as_view(), name="role-detail"),
]
