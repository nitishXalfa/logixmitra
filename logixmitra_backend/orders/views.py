import re
from decimal import Decimal

from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from config.utils import parse_user_id
from orders.models import Order, OrderItem, Shipment, Warehouse, generate_reference_id
from orders.serializers import OrderSerializer, WarehouseSerializer


class OrderPagination(PageNumberPagination):
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


def parse_amount(value):
    if value is None:
        return Decimal("0")
    if isinstance(value, (int, float, Decimal)):
        return Decimal(str(value))
    cleaned = re.sub(r"[₹,\s]", "", str(value))
    try:
        return Decimal(cleaned or "0")
    except Exception:
        return Decimal("0")


def map_order_payload(item, user_id):
    order_data = item.get("order", item)
    ref = order_data.get("orderNumber") or order_data.get("order_number")
    return {
        "user_id": user_id,
        "order_number": ref or "",
        "customer_name": order_data.get("customerName") or order_data.get("customer_name", ""),
        "customer_phone": order_data.get("customerPhone") or order_data.get("customer_phone", ""),
        "customer_email": order_data.get("customerEmail") or order_data.get("customer_email") or None,
        "seller": order_data.get("seller", ""),
        "courier": order_data.get("courier", "-"),
        "status": order_data.get("status", "Pending"),
        "amount": str(order_data.get("amount", "0")),
        "warehouse": order_data.get("warehouse", ""),
        "order_date": order_data.get("orderDate") or order_data.get("order_date") or timezone.localdate(),
        "awb": order_data.get("awb", "-"),
        "codpaidstatus": order_data.get("codpaidstatus", "Pending"),
        "platform": order_data.get("platform", "Manual"),
        "pincode": order_data.get("pincode", ""),
        "city": order_data.get("city", ""),
        "state": order_data.get("state", ""),
        "address_line1": order_data.get("addressLine1") or order_data.get("address_line1", ""),
        "address_line2": order_data.get("addressLine2") or order_data.get("address_line2", ""),
        "landmark": order_data.get("landmark", ""),
        "zone": order_data.get("zone", ""),
        "chargecor": order_data.get("chargecor", ""),
        "total_items": order_data.get("totalItems") or order_data.get("total_items") or 0,
        "total_weight": order_data.get("totalWeight") or order_data.get("total_weight"),
        "financial_status": order_data.get("financialStatus") or order_data.get("financial_status") or "pending",
        "fulfillment_status": order_data.get("fulfillmentStatus") or order_data.get("fulfillment_status") or "pending",
        "payment_gateway": order_data.get("paymentGateway") or order_data.get("payment_gateway") or "manual",
        "merge_status": order_data.get("merge_status", ""),
        "merge_order": order_data.get("merge_order"),
        "tracking_history": order_data.get("tracking_history"),
    }


class OrderListCreateView(APIView):
    permission_classes = [AllowAny]
    pagination_class = OrderPagination

    def get(self, request):
        qs = Order.objects.prefetch_related("items").all()
        user_id = parse_user_id(request.query_params.get("user_id"))
        status_filter = request.query_params.get("status")
        platform = request.query_params.get("platform")
        search = request.query_params.get("search")
        start_date = request.query_params.get("startDate")
        end_date = request.query_params.get("endDate")
        courier = request.query_params.get("courier")
        financial_status = request.query_params.get("financialStatus")
        paginate = request.query_params.get("paginate", "true").lower() != "false"

        if user_id is not None and user_id != 1:
            qs = qs.filter(user_id=user_id)
        if status_filter:
            qs = qs.filter(status__iexact=status_filter)
        if platform:
            qs = qs.filter(platform=platform)
        if courier:
            qs = qs.filter(courier__icontains=courier)
        if financial_status:
            qs = qs.filter(financial_status__icontains=financial_status)
        if search:
            qs = qs.filter(
                Q(order_number__icontains=search)
                | Q(reference_id__icontains=search)
                | Q(customer_name__icontains=search)
                | Q(awb__icontains=search)
                | Q(seller__icontains=search)
            )
        if start_date:
            qs = qs.filter(order_date__gte=start_date)
        if end_date:
            qs = qs.filter(order_date__lte=end_date)

        qs = qs.order_by("-created_at")

        if paginate:
            paginator = OrderPagination()
            page = paginator.paginate_queryset(qs, request)
            serializer = OrderSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = OrderSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        payload = request.data
        data_list = payload.get("data", [])
        user_id = payload.get("user_id")
        created = []
        for item in data_list:
            fields = map_order_payload(item, user_id)
            order = Order.objects.create(**fields)
            items = item.get("order", item).get("items") or item.get("items") or []
            for it in items:
                OrderItem.objects.create(
                    order=order,
                    name=it.get("name", ""),
                    unit_price=it.get("unitPrice") or it.get("unit_price"),
                    quantity=it.get("quantity", 1),
                    gst_rate=it.get("gstRate", 18),
                    total_price=it.get("totalPrice") or it.get("total_price"),
                    height=it.get("height"),
                    width=it.get("width"),
                    length=it.get("length"),
                    dead_weight=it.get("deadWeight") or it.get("dead_weight"),
                    volumetric_weight=it.get("volumetricWeight") or it.get("volumetric_weight"),
                )
            created.append(OrderSerializer(order).data)
        return Response(created, status=status.HTTP_201_CREATED)


class OrderDetailView(APIView):
    permission_classes = [AllowAny]

    def get_object(self, pk):
        return Order.objects.prefetch_related("items").filter(id=pk).first()

    def get(self, request, pk):
        order = self.get_object(pk)
        if not order:
            return Response({"error": "Order not found"}, status=404)
        return Response(OrderSerializer(order).data)

    def put(self, request, pk):
        order = self.get_object(pk)
        if not order:
            return Response({"error": "Order not found"}, status=404)
        data = request.data.get("data", request.data)
        for field, attr in [
            ("status", "status"), ("courier", "courier"), ("awb", "awb"),
            ("amount", "amount"), ("codpaidstatus", "codpaidstatus"),
            ("customerName", "customer_name"), ("customerPhone", "customer_phone"),
            ("seller", "seller"), ("warehouse", "warehouse"),
        ]:
            if field in data:
                setattr(order, attr, data[field])
        order.save()
        return Response(OrderSerializer(order).data)

    def patch(self, request, pk):
        return self.put(request, pk)

    def delete(self, request, pk):
        order = self.get_object(pk)
        if not order:
            return Response({"error": "Order not found"}, status=404)
        order.delete()
        return Response({"success": True})


class OrderStatusView(APIView):
    permission_classes = [AllowAny]

    def patch(self, request, pk):
        order = Order.objects.filter(id=pk).first()
        if not order:
            return Response({"error": "Order not found"}, status=404)
        order.status = request.data.get("status", order.status)
        order.save(update_fields=["status", "updated_at"])
        return Response(OrderSerializer(order).data)


class ManualCreateOrderView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        payload = request.data
        data_list = payload.get("data", [])
        user_id = payload.get("user_id")
        created = []
        for item in data_list:
            fields = map_order_payload(item, user_id)
            if not fields["order_number"]:
                fields["reference_id"] = generate_reference_id()
                fields["order_number"] = fields["reference_id"]
            order = Order.objects.create(**fields)
            created.append({"success": True, "orderNumber": order.order_number, "referenceId": order.reference_id, "id": str(order.id)})
        return Response({"success": True, "data": created})


class MergeCreateOrderView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        return ManualCreateOrderView().post(request)


class OrderStatsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        user_id = parse_user_id(request.query_params.get("user_id"))
        qs = Order.objects.all()
        if user_id is not None and user_id != 1:
            qs = qs.filter(user_id=user_id)
        stats = qs.values("status").annotate(count=Count("id"))
        return Response({"success": True, "data": list(stats)})


class UserOrdersWithShipmentView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, user_id):
        orders = Order.objects.filter(user_id=user_id).prefetch_related("items")
        order_numbers = list(orders.values_list("order_number", flat=True))
        shipments = Shipment.objects.filter(order_number__in=order_numbers)
        shipment_map = {s.order_number: s for s in shipments}
        result = []
        for order in orders:
            data = OrderSerializer(order).data
            shipment = shipment_map.get(order.order_number)
            data["shipment"] = shipment.shipmentjson if shipment else None
            result.append(data)
        return Response({"success": True, "data": result})


class CodRemittanceView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, user_id):
        orders = Order.objects.filter(user_id=user_id)
        order_map = {o.order_number: o for o in orders}
        order_numbers = list(order_map.keys())

        shipments = Shipment.objects.filter(order_number__in=order_numbers)
        seller_map = {}

        for shipment in shipments:
            payload = shipment.shipmentjson or {}
            order = order_map.get(shipment.order_number)
            if not order:
                continue
            cod_amount = float(payload.get("cod_amount") or parse_amount(order.amount))
            if cod_amount <= 0:
                continue
            financial_status = payload.get("financialStatus") or order.financial_status
            if financial_status not in ("paid", "pending", "partially_paid"):
                continue
            seller = payload.get("seller_name") or order.seller or "Unknown"
            if seller not in seller_map:
                seller_map[seller] = {"seller": seller, "totalAmount": 0, "orders": 0, "latestDate": None, "settled": order.codpaidstatus == "Paid"}
            seller_map[seller]["totalAmount"] += cod_amount
            seller_map[seller]["orders"] += 1
            created = shipment.created_at
            if not seller_map[seller]["latestDate"] or created > seller_map[seller]["latestDate"]:
                seller_map[seller]["latestDate"] = created

        # Include delivered COD orders without shipment records
        for order in orders.filter(status__iexact="Delivered", codpaidstatus__in=["Pending", "pending"]):
            amount = float(parse_amount(order.amount))
            if amount <= 0:
                continue
            seller = order.seller or "Unknown"
            if seller not in seller_map:
                seller_map[seller] = {"seller": seller, "totalAmount": 0, "orders": 0, "latestDate": order.updated_at, "settled": False}
            seller_map[seller]["totalAmount"] += amount
            seller_map[seller]["orders"] += 1

        result = []
        for item in seller_map.values():
            latest = item["latestDate"] or timezone.now()
            due_date = latest + timezone.timedelta(days=3)
            status_label = "Settled" if item["settled"] else ("Overdue" if timezone.now() > due_date else "Pending")
            result.append({
                "seller": item["seller"],
                "amount": f"₹{item['totalAmount']:.2f}",
                "orders": item["orders"],
                "due_date": due_date.isoformat(),
                "status": status_label,
            })
        return Response({"success": True, "data": result})


class DisputeOrderView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        order_id = request.data.get("id") or request.data.get("orderId")
        order = Order.objects.filter(id=order_id).first()
        if not order:
            return Response({"error": "Order not found"}, status=404)
        order.dispute_status = request.data.get("dispute_status", "Open")
        order.dispute_reason = request.data.get("dispute_reason", "")
        order.claimweight = request.data.get("claimweight", "")
        order.previousweight = request.data.get("previousweight", "")
        order.dispute_file = request.data.get("dispute_file", "")
        order.save()
        return Response(OrderSerializer(order).data)


class BulkShipmentView(APIView):
    permission_classes = [AllowAny]

    def put(self, request):
        return Response({"message": "Bulk shipment queued", "status": True})


class CancelShipmentView(APIView):
    permission_classes = [AllowAny]

    def put(self, request):
        return Response({"message": "Shipment cancelled", "status": True})
