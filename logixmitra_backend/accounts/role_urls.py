from django.urls import path

from accounts.role_views import (
    RoleDetailView,
    RoleListCreateView,
    RolePermissionMatrixView,
    RolePermissionsUpdateView,
    RoleResetView,
    RoleWithPermissionsView,
)

urlpatterns = [
    path("", RoleListCreateView.as_view(), name="roles-list"),
    path("with-permissions", RoleWithPermissionsView.as_view(), name="roles-with-permissions"),
    path("<int:pk>/matrix", RolePermissionMatrixView.as_view(), name="role-matrix"),
    path("<int:pk>/permissions", RolePermissionsUpdateView.as_view(), name="role-permissions"),
    path("<int:pk>/reset", RoleResetView.as_view(), name="role-reset"),
    path("<int:pk>", RoleDetailView.as_view(), name="role-detail"),
]
