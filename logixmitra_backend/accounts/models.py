import uuid

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("role_id", 1)
        return self.create_user(email, password, **extra_fields)


class Role(models.Model):
    name = models.CharField(max_length=50, unique=True)
    description = models.CharField(max_length=255, blank=True, default="")
    is_system = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "roles"
        ordering = ["id"]

    def __str__(self):
        return self.name


class Permission(models.Model):
    ACTION_CHOICES = [
        ("create", "create"),
        ("read", "read"),
        ("update", "update"),
        ("delete", "delete"),
    ]

    name = models.CharField(max_length=100)
    module = models.CharField(max_length=50)
    action = models.CharField(max_length=10, choices=ACTION_CHOICES)
    description = models.CharField(max_length=255, blank=True, default="")
    roles = models.ManyToManyField(Role, through="ModulePermission", related_name="permissions")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "permissions"
        unique_together = ("module", "action")
        ordering = ["module", "action", "id"]

    def __str__(self):
        return f"{self.module}:{self.action}"


class ModulePermission(models.Model):
    role = models.ForeignKey(Role, on_delete=models.CASCADE)
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE)

    class Meta:
        db_table = "module_permissions"
        unique_together = ("role", "permission")


class User(AbstractBaseUser, PermissionsMixin):
    STATUS_CHOICES = [
        ("active", "active"),
        ("blocked", "blocked"),
        ("pending", "pending"),
    ]
    KYC_CHOICES = [
        ("verified", "verified"),
        ("pending", "pending"),
        ("rejected", "rejected"),
    ]
    RISK_CHOICES = [
        ("low", "low"),
        ("medium", "medium"),
        ("high", "high"),
    ]
    SUBSCRIPTION_CHOICES = [
        ("Trial", "Trial"),
        ("Starter", "Starter"),
        ("Growth", "Growth"),
        ("Enterprise", "Enterprise"),
    ]

    name = models.CharField(max_length=255, blank=True, default="")
    email = models.EmailField(unique=True)
    role = models.ForeignKey(Role, on_delete=models.PROTECT, related_name="users", null=True, blank=True)
    mobile = models.CharField(max_length=255, blank=True, default="")
    avatar = models.CharField(max_length=10, default="U")
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    last_login = models.DateTimeField(null=True, blank=True)
    company = models.CharField(max_length=255, default="LogixMitra")
    phone = models.CharField(max_length=255, default="")
    gst = models.CharField(max_length=50, default="-")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    kyc_status = models.CharField(max_length=20, choices=KYC_CHOICES, default="pending")
    total_orders = models.IntegerField(default=0)
    revenue = models.CharField(max_length=50, default="₹0")
    joined_at = models.DateField(auto_now_add=True)
    address = models.CharField(max_length=500, default="")
    pincode = models.CharField(max_length=255, blank=True, default="")
    city = models.CharField(max_length=255, blank=True, default="")
    state = models.CharField(max_length=255, blank=True, default="")
    wallet_balance = models.FloatField(default=0)
    performance_score = models.FloatField(default=0)
    rto_rate = models.FloatField(default=0)
    risk_category = models.CharField(max_length=20, choices=RISK_CHOICES, default="low")
    subscription = models.CharField(max_length=20, choices=SUBSCRIPTION_CHOICES, default="Trial")
    ratechart = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["name"]

    class Meta:
        db_table = "user_sellers"

    @property
    def roleId(self):
        return self.role_id

    @property
    def walletBalance(self):
        return self.wallet_balance

    @property
    def isActive(self):
        return self.is_active

    def __str__(self):
        return self.email
