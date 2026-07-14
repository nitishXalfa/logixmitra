from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from orders.models import Warehouse
from orders.serializers import WarehouseSerializer


class CreateWarehouseView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = WarehouseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        warehouse = serializer.save()
        return Response({"success": True, "data": WarehouseSerializer(warehouse).data}, status=201)


class GetAllWarehousesView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        user_id = request.query_params.get("user_id")
        qs = Warehouse.objects.all()
        if user_id:
            qs = qs.filter(user_id=user_id)
        return Response({"success": True, "data": WarehouseSerializer(qs, many=True).data})


class GetWarehouseByIdView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        warehouse = Warehouse.objects.filter(id=pk).first()
        if not warehouse:
            return Response({"error": "Not found"}, status=404)
        return Response({"success": True, "data": WarehouseSerializer(warehouse).data})


class UpdateWarehouseView(APIView):
    permission_classes = [AllowAny]

    def put(self, request, pk):
        warehouse = Warehouse.objects.filter(id=pk).first()
        if not warehouse:
            return Response({"error": "Not found"}, status=404)
        serializer = WarehouseSerializer(warehouse, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"success": True, "data": serializer.data})


class DeleteWarehouseView(APIView):
    permission_classes = [AllowAny]

    def delete(self, request, pk):
        Warehouse.objects.filter(id=pk).delete()
        return Response({"success": True, "message": "Deleted"})
