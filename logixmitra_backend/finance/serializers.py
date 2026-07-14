from rest_framework import serializers

from finance.models import Wallet


class WalletSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(read_only=True)
    orderNumber = serializers.CharField(source="order_number", required=False, allow_blank=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    user = serializers.SerializerMethodField()

    class Meta:
        model = Wallet
        fields = [
            "id", "user_id", "transid", "orderNumber", "order_number",
            "amount", "status", "rto", "description", "user",
            "createdAt", "updatedAt", "created_at", "updated_at",
        ]

    def get_user(self, obj):
        if obj.user:
            return {"id": obj.user.id, "name": obj.user.name, "email": obj.user.email}
        return None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["createdAt"] = instance.created_at.isoformat() if instance.created_at else None
        return data
