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
        )
        return Response(UserSerializer(user).data, status=201)


class UserDetailView(APIView):
    permission_classes = [AllowAny]

    def put(self, request, pk):
        user = User.objects.filter(id=pk).first()
        if not user:
            return Response({"error": "Not found"}, status=404)
        for field, attr in [("name", "name"), ("email", "email"), ("phone", "phone"), ("company", "company")]:
            if field in request.data:
                setattr(user, attr, request.data[field])
        user.save()
        return Response(UserSerializer(user).data)

    def delete(self, request, pk):
        User.objects.filter(id=pk).delete()
        return Response({"success": True})


urlpatterns = [
    path("", UserListCreateView.as_view(), name="users-list"),
    path("<int:pk>", UserDetailView.as_view(), name="user-detail"),
]
