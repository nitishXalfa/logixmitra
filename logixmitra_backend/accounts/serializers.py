from rest_framework import serializers

from accounts.models import Permission, Role, User


class RoleSerializer(serializers.ModelSerializer):
    isSystem = serializers.BooleanField(source="is_system", read_only=True)

    class Meta:
        model = Role
        fields = ["id", "name", "description", "isSystem"]


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ["id", "name", "module", "action", "description"]


class UserSerializer(serializers.ModelSerializer):
    role = RoleSerializer(read_only=True)
    roleId = serializers.IntegerField(source="role_id", read_only=True)
    walletBalance = serializers.FloatField(source="wallet_balance", read_only=True)
    isActive = serializers.BooleanField(source="is_active", read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "name", "email", "role", "roleId", "avatar", "mobile",
            "company", "phone", "gst", "status", "walletBalance", "isActive",
            "address", "pincode", "city", "state", "subscription",
        ]


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()
