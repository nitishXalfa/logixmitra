from django.db import models

from accounts.models import User


class Wallet(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="wallet_entries")
    transid = models.CharField(max_length=255, blank=True, default="")
    order_number = models.CharField(max_length=255, blank=True, default="")
    amount = models.FloatField(default=0)
    status = models.CharField(max_length=50, default="draft")
    rto = models.CharField(max_length=255, blank=True, default="")
    description = models.CharField(max_length=500, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "wallet"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user_id} - {self.amount}"
