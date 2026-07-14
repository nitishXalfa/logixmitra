from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from finance.models import Wallet
from finance.serializers import WalletSerializer


class WalletPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "limit"
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response({
            "success": True,
            "data": data,
            "pagination": {
                "page": self.page.number,
                "limit": self.get_page_size(self.request),
                "total": self.page.paginator.count,
                "totalPages": self.page.paginator.num_pages,
            },
        })


class WalletCreateView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        user_id = request.data.get("user_id")
        if not user_id:
            return Response({"error": "user_id is required"}, status=400)
        wallet = Wallet.objects.create(
            user_id=user_id,
            transid=request.data.get("transid", ""),
            amount=request.data.get("amount", 0),
        )
        return Response({"success": True, "data": WalletSerializer(wallet).data})


class WalletListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        paginate = request.query_params.get("paginate", "false").lower() == "true"
        qs = Wallet.objects.select_related("user").order_by("-id")
        if paginate:
            paginator = WalletPagination()
            page = paginator.paginate_queryset(qs, request)
            return paginator.get_paginated_response(WalletSerializer(page, many=True).data)
        return Response(WalletSerializer(qs, many=True).data)


class WalletByUserView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        qs = Wallet.objects.select_related("user").filter(user_id=pk).order_by("-id")
        paginate = request.query_params.get("paginate", "false").lower() == "true"
        if paginate:
            paginator = WalletPagination()
            page = paginator.paginate_queryset(qs, request)
            return paginator.get_paginated_response(WalletSerializer(page, many=True).data)
        return Response(WalletSerializer(qs, many=True).data)


class WalletStatusView(APIView):
    permission_classes = [AllowAny]

    def put(self, request, pk):
        wallet = Wallet.objects.filter(id=pk).first()
        if not wallet:
            return Response({"error": "Not found"}, status=404)
        status_val = request.data.get("status", wallet.status)
        previous_status = wallet.status
        wallet.status = status_val
        wallet.save(update_fields=["status", "updated_at"])
        if status_val == "Approved" and previous_status != "Approved":
            user = User.objects.filter(id=wallet.user_id).first()
            if user:
                user.wallet_balance = (user.wallet_balance or 0) + (wallet.amount or 0)
                user.save(update_fields=["wallet_balance", "updated_at"])
        return Response({"success": True, "message": "Status updated"})


class WalletDeleteView(APIView):
    permission_classes = [AllowAny]

    def delete(self, request, pk):
        Wallet.objects.filter(id=pk).delete()
        return Response({"success": True, "message": "Deleted"})
