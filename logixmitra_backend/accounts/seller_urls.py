from django.urls import path
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.serializers import UserSerializer


class SellerListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        users = User.objects.select_related("role").all()
        return Response({"success": True, "data": UserSerializer(users, many=True).data})

    def post(self, request):
        data = request.data
        if User.objects.filter(email=data.get("email")).exists():
            return Response({"success": False, "error": "Email already exists"}, status=400)
        user = User.objects.create_user(
            email=data["email"],
            password=data.get("password", "password123"),
            name=data.get("name", ""),
            role_id=data.get("roleId", 2),
            company=data.get("company", "LogixMitra"),
            phone=data.get("phone", ""),
            mobile=data.get("mobile", ""),
            address=data.get("address", ""),
            gst=data.get("gst", "-"),
            status=data.get("status", "active"),
            kyc_status=data.get("kycStatus", "pending"),
        )
        return Response({"success": True, "data": UserSerializer(user).data}, status=201)


class SellerDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        user = User.objects.filter(id=pk).select_related("role").first()
        if not user:
            return Response({"success": False, "error": "Not found"}, status=404)
        return Response({"success": True, "data": UserSerializer(user).data})

    def put(self, request, pk):
        user = User.objects.filter(id=pk).first()
        if not user:
            return Response({"success": False, "error": "Not found"}, status=404)
        for field, attr in [
            ("name", "name"), ("email", "email"), ("phone", "phone"), ("mobile", "mobile"),
            ("company", "company"), ("address", "address"), ("gst", "gst"),
            ("pincode", "pincode"), ("city", "city"), ("state", "state"),
        ]:
            if field in request.data:
                setattr(user, attr, request.data[field])
        user.save()
        return Response({"success": True, "data": UserSerializer(user).data})

    def delete(self, request, pk):
        User.objects.filter(id=pk).delete()
        return Response({"success": True})


class SellerStatusView(APIView):
    permission_classes = [AllowAny]

    def patch(self, request, pk):
        user = User.objects.filter(id=pk).first()
        if not user:
            return Response({"success": False, "error": "Not found"}, status=404)
        status_val = request.data.get("status", user.status)
        user.status = status_val
        user.is_active = status_val == "active"
        user.save(update_fields=["status", "is_active", "updated_at"])
        return Response({"success": True, "data": UserSerializer(user).data})


class SellerKycView(APIView):
    permission_classes = [AllowAny]

    def patch(self, request, pk):
        user = User.objects.filter(id=pk).first()
        if not user:
            return Response({"success": False, "error": "Not found"}, status=404)
        user.kyc_status = request.data.get("kycStatus", user.kyc_status)
        user.save(update_fields=["kyc_status", "updated_at"])
        return Response({"success": True, "data": UserSerializer(user).data})


class SellerApproveView(APIView):
    permission_classes = [AllowAny]

    def patch(self, request, pk):
        user = User.objects.filter(id=pk).first()
        if not user:
            return Response({"success": False, "error": "Not found"}, status=404)
        user.status = "active"
        user.is_active = True
        user.kyc_status = "verified"
        user.save(update_fields=["status", "is_active", "kyc_status", "updated_at"])
        return Response({"success": True, "data": UserSerializer(user).data})


class SellerWalletView(APIView):
    permission_classes = [AllowAny]

    def patch(self, request, pk):
        user = User.objects.filter(id=pk).first()
        if not user:
            return Response({"success": False, "error": "Not found"}, status=404)
        if "walletBalance" in request.data:
            user.wallet_balance = float(request.data.get("walletBalance") or 0)
        elif "amount" in request.data:
            user.wallet_balance = float(user.wallet_balance or 0) + float(request.data.get("amount") or 0)
        user.save(update_fields=["wallet_balance", "updated_at"])
        return Response({"success": True, "data": UserSerializer(user).data})


class SellerPerformanceView(APIView):
    permission_classes = [AllowAny]

    def patch(self, request, pk):
        user = User.objects.filter(id=pk).first()
        if not user:
            return Response({"success": False, "error": "Not found"}, status=404)
        if "performanceScore" in request.data:
            user.performance_score = float(request.data.get("performanceScore") or 0)
        if "rtoRate" in request.data:
            user.rto_rate = float(request.data.get("rtoRate") or 0)
        if "riskCategory" in request.data:
            user.risk_category = request.data.get("riskCategory") or user.risk_category
        user.save(update_fields=["performance_score", "rto_rate", "risk_category", "updated_at"])
        return Response({"success": True, "data": UserSerializer(user).data})


urlpatterns = [
    path("", SellerListView.as_view(), name="sellers-list"),
    path("<int:pk>/status", SellerStatusView.as_view(), name="seller-status"),
    path("<int:pk>/kyc", SellerKycView.as_view(), name="seller-kyc"),
    path("<int:pk>/approve", SellerApproveView.as_view(), name="seller-approve"),
    path("<int:pk>/wallet", SellerWalletView.as_view(), name="seller-wallet"),
    path("<int:pk>/performance", SellerPerformanceView.as_view(), name="seller-performance"),
    path("<int:pk>", SellerDetailView.as_view(), name="seller-detail"),
]
