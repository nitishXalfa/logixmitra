from django.core.management.base import BaseCommand

from accounts.models import Permission, Role, User
from orders.models import Order


class Command(BaseCommand):
    help = "Seed initial roles, permissions, and admin user for LogixMitra"

    def handle(self, *args, **options):
        admin_role, _ = Role.objects.get_or_create(
            id=1,
            defaults={"name": "admin", "description": "Administrator", "is_system": True},
        )
        seller_role, _ = Role.objects.get_or_create(
            id=2,
            defaults={"name": "seller", "description": "Seller", "is_system": True},
        )

        modules = ["orders", "finance", "reports", "users", "settings", "warehouse"]
        actions = ["create", "read", "update", "delete"]
        for module in modules:
            for action in actions:
                perm, _ = Permission.objects.get_or_create(
                    module=module,
                    action=action,
                    defaults={"name": f"{module}_{action}", "description": f"{action} {module}"},
                )
                admin_role.permissions.add(perm)
                if action in ("read", "create", "update"):
                    seller_role.permissions.add(perm)

        if not User.objects.filter(email="admin@logixmitra.com").exists():
            User.objects.create_superuser(
                email="admin@logixmitra.com",
                password="admin123",
                name="LogixMitra Admin",
                role=admin_role,
                company="LogixMitra",
                phone="9999999999",
                address="India",
            )
            self.stdout.write(self.style.SUCCESS("Created admin@logixmitra.com / admin123"))
        else:
            self.stdout.write("Admin user already exists")

        admin = User.objects.filter(email="admin@logixmitra.com").first()
        if admin and not Order.objects.exists():
            from django.utils import timezone
            samples = [
                {"order_number": "LMX-20260712-A1B2C3D4", "customer_name": "Rahul Sharma", "seller": "Demo Seller", "courier": "Delhivery", "status": "Delivered", "amount": "₹1,250", "platform": "Manual", "codpaidstatus": "Pending", "payment_gateway": "COD", "awb": "DL123456789"},
                {"order_number": "LMX-20260712-E5F6G7H8", "customer_name": "Priya Patel", "seller": "Demo Seller", "courier": "eKART", "status": "In Transit", "amount": "₹890", "platform": "Shopify", "codpaidstatus": "Pending", "payment_gateway": "COD", "awb": "EK987654321"},
                {"order_number": "LMX-20260712-I9J0K1L2", "customer_name": "Amit Kumar", "seller": "Demo Seller", "courier": "Shree Maruti", "status": "Pending", "amount": "₹2,100", "platform": "Manual", "codpaidstatus": "Pending", "payment_gateway": "prepaid", "awb": "-"},
                {"order_number": "LMX-20260712-M3N4O5P6", "customer_name": "Sneha Reddy", "seller": "Demo Seller", "courier": "Delhivery", "status": "Return to Origin", "amount": "₹650", "platform": "WooCommerce", "codpaidstatus": "Pending", "payment_gateway": "COD", "awb": "DL555666777"},
            ]
            for s in samples:
                Order.objects.create(user=admin, order_date=timezone.localdate(), reference_id=s["order_number"], **s)
            self.stdout.write(self.style.SUCCESS(f"Created {len(samples)} sample orders"))

        self.stdout.write(self.style.SUCCESS("Seed data complete"))
