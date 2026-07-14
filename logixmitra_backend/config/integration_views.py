from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class IntegrationsListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response([
            {
                "id": "5259",
                "channel": "shopify",
                "channelLabel": "Shopify",
                "storeId": "HF",
                "storeName": "My Store",
                "connectionStatus": "In-Active",
                "status": "In-Active",
                "lastSync": "28 May 2026, 03:29 PM",
            }
        ])

    def post(self, request):
        return Response({"success": True, "id": "local-integration"})


class IntegrationsDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        return Response({"id": pk, "platform": "Manual", "status": "inactive"})

    def put(self, request, pk):
        return Response({"success": True, "id": pk})

    def delete(self, request, pk):
        return Response({"success": True})


class IntegrationsTestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        return Response({"success": False, "message": "Integration test not configured on this server"})


class SyncShopifyView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        return Response({"success": True, "data": [], "message": "Shopify sync stub — configure integration service"})


class SyncWooCommerceView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        return Response({"success": True, "data": [], "message": "WooCommerce sync stub — configure integration service"})


class RateChartSetView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        return Response({"success": True, "message": "Rate chart saved locally"})


class PincodeChartGetView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"success": True, "data": []})


class PincodeChartSetView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        return Response({"success": True, "message": "Pincode chart saved locally"})
