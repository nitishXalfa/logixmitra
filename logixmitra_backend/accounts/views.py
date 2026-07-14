from django.contrib.auth import authenticate
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import Permission, Role, User
from accounts.serializers import LoginSerializer, UserSerializer


def format_permissions(role_id):
    if not role_id:
        return []
    role = Role.objects.filter(id=role_id).prefetch_related("permissions").first()
    if not role:
        return []
    grouped = {}
    for perm in role.permissions.all():
        grouped.setdefault(perm.module, set()).add(perm.action)
    return [{"module": m, "actions": list(a)} for m, a in grouped.items()]


def build_login_response(user):
    refresh = RefreshToken.for_user(user)
    token = str(refresh.access_token)
    user.last_login = timezone.now()
    user.save(update_fields=["last_login"])
    return {
        "success": True,
        "data": {
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role.name if user.role else None,
                "roleId": user.role_id,
                "avatar": user.avatar or (user.name[:1].upper() if user.name else "U"),
                "isSeller": bool(user.company),
                "permissions": format_permissions(user.role_id),
            },
            "token": token,
        },
    }


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]

        user = User.objects.filter(email=email).select_related("role").first()
        if not user or not user.check_password(password):
            return Response({"success": False, "error": "Invalid email or password"}, status=401)
        if not user.is_active:
            return Response({"success": False, "error": "Account is deactivated. Please contact administrator."}, status=401)
        if user.status and user.status != "active":
            return Response({"success": False, "error": "Account is not active"}, status=401)
        return Response(build_login_response(user))


class LogoutView(APIView):
    def post(self, request):
        return Response({"success": True, "message": "Logged out successfully"})


class MeView(APIView):
    def get(self, request):
        user = request.user
        return Response({
            "success": True,
            "data": {
                "user": {
                    **UserSerializer(user).data,
                    "role": user.role.name if user.role else None,
                    "permissions": format_permissions(user.role_id),
                }
            },
        })


class UsersListView(APIView):
    def get(self, request):
        users = User.objects.select_related("role").all()
        return Response({"success": True, "data": UserSerializer(users, many=True).data})


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        required = ["email", "password", "roleId", "company", "phone", "address"]
        if not all(data.get(f) for f in required):
            return Response({"message": "Required fields missing"}, status=400)
        if User.objects.filter(email=data["email"]).exists():
            return Response({"message": "Email already exists"}, status=400)
        user = User.objects.create_user(
            email=data["email"],
            password=data["password"],
            name=data.get("name", ""),
            role_id=data["roleId"],
            mobile=data.get("mobile", ""),
            company=data["company"],
            phone=data["phone"],
            address=data["address"],
        )
        return Response({"message": "User registered successfully", "data": {"id": user.id, "email": user.email}}, status=201)


class UpdatePasswordView(APIView):
    def post(self, request):
        user_id = request.data.get("userId")
        new_password = request.data.get("newPassword")
        if not user_id or not new_password:
            return Response({"message": "userId and newPassword are required"}, status=400)
        user = User.objects.filter(id=user_id).first()
        if not user:
            return Response({"message": "User not found"}, status=404)
        user.set_password(new_password)
        user.save()
        return Response({"message": "Password updated successfully"})
