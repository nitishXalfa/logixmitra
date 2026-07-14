from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from tracking.services import update_all_orders_tracking


class TrackingCronView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        result = update_all_orders_tracking()
        return Response({"success": True, "data": result})
