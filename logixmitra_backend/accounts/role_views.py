from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import ModulePermission, Permission, Role
from accounts.serializers import PermissionSerializer, RoleSerializer

ACTIONS = ["create", "read", "update", "delete"]


class RoleListCreateView(generics.ListCreateAPIView):
    queryset = Role.objects.all().order_by("id")
    serializer_class = RoleSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = Role.objects.all().order_by("id")
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(name__icontains=search)
        return qs


class RoleDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [AllowAny]


class RoleWithPermissionsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        roles = Role.objects.prefetch_related("permissions").all().order_by("id")
        data = []
        for role in roles:
            data.append({
                "id": role.id,
                "name": role.name,
                "description": role.description,
                "permissions": PermissionSerializer(role.permissions.all(), many=True).data,
            })
        return Response(data)


class RolePermissionMatrixView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        role = Role.objects.filter(id=pk).prefetch_related("permissions").first()
        if not role:
            return Response({"success": False, "error": "Role not found"}, status=404)

        role_perm_keys = {(p.module, p.action) for p in role.permissions.all()}
        all_permissions = Permission.objects.all().order_by("module", "action")
        modules = list(all_permissions.values_list("module", flat=True).distinct())

        matrix = []
        for module in modules:
            actions = []
            for action in ACTIONS:
                actions.append({
                    "action": action,
                    "hasPermission": (module, action) in role_perm_keys,
                })
            matrix.append({"module": module, "actions": actions})

        return Response({
            "success": True,
            "data": {
                "role": RoleSerializer(role).data,
                "matrix": matrix,
                "allModules": modules,
            },
        })


class RolePermissionsUpdateView(APIView):
    permission_classes = [AllowAny]

    def put(self, request, pk):
        role = Role.objects.filter(id=pk).first()
        if not role:
            return Response({"success": False, "error": "Role not found"}, status=404)

        module_permissions = request.data.get("modulePermissions") or []
        ModulePermission.objects.filter(role=role).delete()

        created = 0
        for item in module_permissions:
            module = item.get("module")
            actions = item.get("actions") or []
            if not module:
                continue
            for action in actions:
                perm, _ = Permission.objects.get_or_create(
                    module=module,
                    action=action,
                    defaults={
                        "name": f"{module}_{action}",
                        "description": f"{action.title()} access for {module}",
                    },
                )
                ModulePermission.objects.get_or_create(role=role, permission=perm)
                created += 1

        return Response({
            "success": True,
            "message": f"Permissions for {role.name} updated successfully.",
            "data": {"assigned": created},
        })


class RoleResetView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, pk):
        role = Role.objects.filter(id=pk).first()
        if not role:
            return Response({"success": False, "error": "Role not found"}, status=404)

        ModulePermission.objects.filter(role=role).delete()

        # Admin gets all permissions by default; other roles get read-only.
        if role.name == "admin":
            perms = Permission.objects.all()
        else:
            perms = Permission.objects.filter(action="read")

        for perm in perms:
            ModulePermission.objects.get_or_create(role=role, permission=perm)

        return Response({
            "success": True,
            "message": f"Permissions for {role.name} reset successfully.",
        })


class PermissionListCreateView(generics.ListCreateAPIView):
    queryset = Permission.objects.all().order_by("module", "action", "id")
    serializer_class = PermissionSerializer
    permission_classes = [AllowAny]


class PermissionDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Permission.objects.all()
    serializer_class = PermissionSerializer
    permission_classes = [AllowAny]


class PermissionModulesView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        modules = Permission.objects.values_list("module", flat=True).distinct().order_by("module")
        return Response(list(modules))
