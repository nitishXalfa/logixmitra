import uuid

from django.db import models
from django.utils import timezone

from accounts.models import User


class Order(models.Model):
    PLATFORM_CHOICES = [
        ("Manual", "Manual"),
        ("Amazon", "Amazon"),
        ("Shopify", "Shopify"),
        ("WooCommerce", "WooCommerce"),
        ("Custom", "Custom"),
        ("Merged", "Merged"),
    ]
    FINANCIAL_STATUS_CHOICES = [
        ("paid", "paid"),
        ("partially_paid", "partially_paid"),
        ("pending", "pending"),
        ("refunded", "refunded"),
        ("voided", "voided"),
    ]
    FULFILLMENT_STATUS_CHOICES = [
        ("fulfilled", "fulfilled"),
        ("partial", "partial"),
        ("pending", "pending"),
        ("restocked", "restocked"),
        ("null", "null"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference_id = models.CharField(max_length=32, unique=True, db_index=True, blank=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="orders")
    order_number = models.CharField(max_length=255, db_index=True, blank=True)
    customer_name = models.CharField(max_length=255, blank=True, default="")
    customer_phone = models.CharField(max_length=50, blank=True, default="")
    customer_email = models.EmailField(blank=True, null=True)
    seller = models.CharField(max_length=255, blank=True, default="")
    courier = models.CharField(max_length=100, default="-")
    status = models.CharField(max_length=100, default="Pending")
    amount = models.CharField(max_length=50, blank=True, default="")
    warehouse = models.CharField(max_length=255, blank=True, default="")
    order_date = models.DateField(null=True, blank=True)
    awb = models.CharField(max_length=100, default="-", db_index=True)
    codpaidstatus = models.CharField(max_length=50, default="Pending")
    platform = models.CharField(max_length=20, choices=PLATFORM_CHOICES, default="Manual")
    pincode = models.CharField(max_length=10, blank=True, default="")
    city = models.CharField(max_length=100, blank=True, default="")
    state = models.CharField(max_length=100, blank=True, default="")
    address_line1 = models.CharField(max_length=500, blank=True, default="")
    address_line2 = models.CharField(max_length=500, blank=True, default="")
    landmark = models.CharField(max_length=255, blank=True, default="")
    zone = models.CharField(max_length=50, blank=True, default="")
    chargecor = models.CharField(max_length=50, blank=True, default="")
    total_items = models.IntegerField(default=0)
    total_weight = models.FloatField(null=True, blank=True)
    total_volumetric_weight = models.FloatField(null=True, blank=True)
    shopify_order_id = models.CharField(max_length=100, blank=True, default="")
    financial_status = models.CharField(max_length=20, choices=FINANCIAL_STATUS_CHOICES, default="pending")
    fulfillment_status = models.CharField(max_length=20, choices=FULFILLMENT_STATUS_CHOICES, default="pending")
    payment_gateway = models.CharField(max_length=100, default="manual")
    dispute_status = models.CharField(max_length=100, blank=True, default="")
    dispute_reason = models.CharField(max_length=500, blank=True, default="")
    merge_status = models.CharField(max_length=100, blank=True, default="")
    merge_order = models.JSONField(null=True, blank=True)
    dispute_file = models.CharField(max_length=500, blank=True, default="")
    previousweight = models.CharField(max_length=50, blank=True, default="")
    claimweight = models.CharField(max_length=50, blank=True, default="")
    subtotal_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    total_tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_discounts = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_shipping_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_outstanding = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default="INR")
    tracking_history = models.JSONField(null=True, blank=True)
    shipping_address = models.JSONField(null=True, blank=True)
    billing_address = models.JSONField(null=True, blank=True)
    customer_data = models.JSONField(null=True, blank=True)
    delivered_date = models.DateField(null=True, blank=True)
    delivered_time = models.TimeField(null=True, blank=True)
    ndrreason = models.CharField(max_length=500, blank=True, default="")
    trackingnumber = models.CharField(max_length=100, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "orders"
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.reference_id:
            self.reference_id = generate_reference_id()
        if not self.order_number:
            self.order_number = self.reference_id
        if not self.order_date:
            self.order_date = timezone.localdate()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.order_number or str(self.id)


def generate_reference_id():
    """Generate unique order reference: LMX-YYYYMMDD-XXXXXXXX"""
    date_str = timezone.localtime().strftime("%Y%m%d")
    for _ in range(10):
        unique_part = uuid.uuid4().hex[:8].upper()
        ref = f"LMX-{date_str}-{unique_part}"
        if not Order.objects.filter(reference_id=ref).exists():
            return ref
    return f"LMX-{date_str}-{uuid.uuid4().hex[:12].upper()}"


class OrderItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    name = models.CharField(max_length=255, blank=True, default="")
    unit_price = models.FloatField(null=True, blank=True)
    quantity = models.IntegerField(default=1)
    gst_rate = models.FloatField(default=18)
    total_price = models.FloatField(null=True, blank=True)
    height = models.FloatField(null=True, blank=True)
    width = models.FloatField(null=True, blank=True)
    length = models.FloatField(null=True, blank=True)
    dead_weight = models.FloatField(null=True, blank=True)
    volumetric_weight = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "order_items"


class Shipment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_number = models.CharField(max_length=255, db_index=True, blank=True, default="")
    shipmentjson = models.JSONField(null=True, blank=True)
    shipmenttracking = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "shipment"


class Warehouse(models.Model):
    name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)
    address = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pincode = models.CharField(max_length=10)
    contact_person = models.CharField(max_length=100, blank=True, default="")
    phone = models.CharField(max_length=15, blank=True, default="")
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="warehouses")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "warehouses"

    def __str__(self):
        return self.name
