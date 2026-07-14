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
