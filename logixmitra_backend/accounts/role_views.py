from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Permission, Role
from accounts.serializers import PermissionSerializer, RoleSerializer


class RoleListCreateView(generics.ListCreateAPIView):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [AllowAny]


class RoleDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [AllowAny]


class RoleWithPermissionsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        roles = Role.objects.prefetch_related("permissions").all()
        data = []
        for role in roles:
            data.append({
                "id": role.id,
                "name": role.name,
                "description": role.description,
                "permissions": PermissionSerializer(role.permissions.all(), many=True).data,
            })
        return Response(data)


class PermissionListCreateView(generics.ListCreateAPIView):
    queryset = Permission.objects.all()
    serializer_class = PermissionSerializer
    permission_classes = [AllowAny]


class PermissionDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Permission.objects.all()
    serializer_class = PermissionSerializer
    permission_classes = [AllowAny]


class PermissionModulesView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        modules = Permission.objects.values_list("module", flat=True).distinct()
        return Response(list(modules))
