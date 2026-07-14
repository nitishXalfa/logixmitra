from rest_framework import serializers

from orders.models import Order, OrderItem, Shipment, Warehouse


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = "__all__"


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    user_id = serializers.IntegerField(read_only=True)
    orderNumber = serializers.CharField(source="order_number", required=False, allow_blank=True)
    referenceId = serializers.CharField(source="reference_id", read_only=True)
    customerName = serializers.CharField(source="customer_name", required=False, allow_blank=True)
    customerPhone = serializers.CharField(source="customer_phone", required=False, allow_blank=True)
    customerEmail = serializers.EmailField(source="customer_email", required=False, allow_blank=True)
    orderDate = serializers.DateField(source="order_date", required=False, allow_null=True)
    addressLine1 = serializers.CharField(source="address_line1", required=False, allow_blank=True)
    addressLine2 = serializers.CharField(source="address_line2", required=False, allow_blank=True)
    codpaidstatus = serializers.CharField(required=False)
    financialStatus = serializers.CharField(source="financial_status", required=False)
    fulfillmentStatus = serializers.CharField(source="fulfillment_status", required=False)
    totalItems = serializers.IntegerField(source="total_items", required=False)
    totalWeight = serializers.FloatField(source="total_weight", required=False, allow_null=True)
    tracking_history = serializers.JSONField(required=False)
    merge_order = serializers.JSONField(required=False)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id", "reference_id", "referenceId", "user_id", "orderNumber", "order_number",
            "customerName", "customer_name", "customerPhone", "customer_phone",
            "customerEmail", "customer_email", "seller", "courier", "status", "amount",
            "warehouse", "orderDate", "order_date", "awb", "codpaidstatus", "platform",
            "pincode", "city", "state", "addressLine1", "address_line1",
            "addressLine2", "address_line2", "landmark", "zone", "chargecor",
            "totalItems", "total_items", "totalWeight", "total_weight",
            "total_volumetric_weight", "financialStatus", "financial_status",
            "fulfillmentStatus", "fulfillment_status", "payment_gateway",
            "dispute_status", "dispute_reason", "merge_status", "merge_order",
            "dispute_file", "previousweight", "claimweight", "tracking_history",
            "delivered_date", "delivered_time", "ndrreason", "trackingnumber",
            "items", "createdAt", "updatedAt",
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Frontend expects camelCase for some fields
        data["orderNumber"] = instance.order_number
        data["referenceId"] = instance.reference_id
        data["user_id"] = instance.user_id
        return data


class ShipmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shipment
        fields = "__all__"


class WarehouseSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(required=False, allow_null=True)
    isActive = serializers.BooleanField(source="is_active", required=False)
    isDefault = serializers.BooleanField(source="is_default", required=False)
    contactPerson = serializers.CharField(source="contact_person", required=False, allow_blank=True)

    class Meta:
        model = Warehouse
        fields = [
            "id", "name", "isActive", "is_active", "isDefault", "is_default",
            "address", "city", "state", "pincode", "contactPerson", "contact_person",
            "phone", "user_id", "created_at", "updated_at",
        ]
