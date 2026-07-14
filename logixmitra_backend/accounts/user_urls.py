from django.urls import path
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.serializers import UserSerializer


class UserListCreateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(UserSerializer(User.objects.select_related("role").all(), many=True).data)

    def post(self, request):
        data = request.data
        user = User.objects.create_user(
            email=data["email"],
            password=data.get("password", "password123"),
            name=data.get("name", ""),
            role_id=data.get("roleId", 2),
            company=data.get("company", "LogixMitra"),
            phone=data.get("phone", ""),
            address=data.get("address", ""),
            mobile=data.get("mobile", ""),
        )
        return Response({"success": True, "data": UserSerializer(user).data}, status=201)


class UserDetailView(APIView):
    permission_classes = [AllowAny]

    def put(self, request, pk):
        user = User.objects.filter(id=pk).first()
        if not user:
            return Response({"success": False, "error": "Not found"}, status=404)
        for field, attr in [("name", "name"), ("email", "email"), ("phone", "phone"), ("company", "company"), ("mobile", "mobile"), ("address", "address")]:
            if field in request.data:
                setattr(user, attr, request.data[field])
        if "roleId" in request.data:
            user.role_id = request.data.get("roleId")
        user.save()
        return Response({"success": True, "data": UserSerializer(user).data})

    def delete(self, request, pk):
        User.objects.filter(id=pk).delete()
        return Response({"success": True})


class UserStatusView(APIView):
    permission_classes = [AllowAny]

    def patch(self, request, pk):
        user = User.objects.filter(id=pk).first()
        if not user:
            return Response({"success": False, "error": "Not found"}, status=404)

        new_status = request.data.get("status", user.status)
        # Frontend uses active/inactive; model uses active/blocked/pending.
        if new_status == "inactive":
            new_status = "blocked"
            user.is_active = False
        elif new_status == "active":
            user.is_active = True
        user.status = new_status
        user.save(update_fields=["status", "is_active", "updated_at"])
        return Response({
            "success": True,
            "message": f"User status updated to {new_status}",
            "data": UserSerializer(user).data,
        })


class UserResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, pk):
        user = User.objects.filter(id=pk).first()
        if not user:
            return Response({"success": False, "error": "Not found"}, status=404)

        new_password = request.data.get("newPassword") or "Password@123"
        user.set_password(new_password)
        user.save(update_fields=["password"])
        return Response({
            "success": True,
            "message": "Password reset successful",
            "data": {"newPassword": new_password},
        })


urlpatterns = [
    path("", UserListCreateView.as_view(), name="users-list"),
    path("<int:pk>/status", UserStatusView.as_view(), name="user-status"),
    path("<int:pk>/reset-password", UserResetPasswordView.as_view(), name="user-reset-password"),
    path("<int:pk>", UserDetailView.as_view(), name="user-detail"),
]
