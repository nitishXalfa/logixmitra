import re
from collections import defaultdict
from decimal import Decimal

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from config.utils import parse_user_id
from orders.models import Order


def parse_amount(value):
    if value is None:
        return Decimal("0")
    cleaned = re.sub(r"[₹,\s]", "", str(value))
    try:
        return Decimal(cleaned or "0")
    except Exception:
        return Decimal("0")


def filter_orders(user_id=None):
    qs = Order.objects.exclude(order_date__isnull=True).exclude(amount__isnull=True).exclude(amount="")
    uid = parse_user_id(user_id)
    if uid is not None and uid != 1:
        qs = qs.filter(user_id=uid)
    return qs


class DashboardDataView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        user_id = request.query_params.get("user_id")
        orders = list(filter_orders(user_id))

        revenue_by_month = defaultdict(lambda: {"revenue": Decimal("0"), "orders": 0})
        status_counts = defaultdict(int)
        courier_counts = defaultdict(int)
        total_orders = len(orders)
        rto_orders = 0

        for order in orders:
            month = order.order_date.strftime("%b") if order.order_date else "N/A"
            revenue_by_month[month]["revenue"] += parse_amount(order.amount)
            revenue_by_month[month]["orders"] += 1
            status_counts[order.status or "Pending"] += 1
            courier_counts[order.courier or "-"] += 1
            if order.status and ("rto" in order.status.lower() or "return" in order.status.lower()):
                rto_orders += 1

        revenue_data = [{"month": m, "revenue": float(v["revenue"]), "orders": v["orders"]} for m, v in revenue_by_month.items()]
        order_status_data = [{"name": k, "value": v} for k, v in status_counts.items()]

        courier_stats = defaultdict(lambda: {"total": 0, "delivered": 0, "rto": 0})
        for order in orders:
            courier_name = order.courier or "Unknown"
            courier_stats[courier_name]["total"] += 1
            status = (order.status or "").lower()
            if "delivered" in status:
                courier_stats[courier_name]["delivered"] += 1
            elif "rto" in status or "return" in status:
                courier_stats[courier_name]["rto"] += 1

        courier_performance = []
        for name, stats in courier_stats.items():
            total = stats["total"] or 1
            courier_performance.append({
                "name": name,
                "delivered": round(stats["delivered"] / total * 100, 1),
                "rto": round(stats["rto"] / total * 100, 1),
            })

        recent_orders = sorted(orders, key=lambda o: o.created_at, reverse=True)[:10]
        rto_rate = round((rto_orders / total_orders * 100) if total_orders else 0, 2)

        def bucket_count(keywords):
            count = 0
            for order in orders:
                status = (order.status or "").lower()
                if any(k in status for k in keywords):
                    count += 1
            return count

        status_buckets = {
            "newOrders": bucket_count(["pending", "new", "processing", "draft"]),
            "courierAssigned": bucket_count(["ready", "pickup scheduled", "assigned", "manifest"]),
            "inTransit": bucket_count(["transit", "shipped", "out for delivery", "picked"]),
            "delivered": bucket_count(["delivered"]),
            "undelivered": bucket_count(["undelivered", "ndr", "failed"]),
            "rto": bucket_count(["rto", "return", "cancelled"]),
        }

        shipment_analytics = [
            {"name": "Delivered", "value": status_buckets["delivered"], "fill": "#34d399"},
            {"name": "In Transit", "value": status_buckets["inTransit"], "fill": "#60a5fa"},
            {"name": "RTO In-Transit", "value": bucket_count(["rto in", "rto in transit"]), "fill": "#fbbf24"},
            {"name": "RTO Delivered", "value": bucket_count(["rto delivered", "return to origin"]), "fill": "#f87171"},
            {"name": "NDR", "value": bucket_count(["ndr", "undelivered"]), "fill": "#a78bfa"},
        ]

        wallet_transactions = []
        try:
            from finance.models import Wallet
            from accounts.models import User

            uid = parse_user_id(user_id)
            wallet_qs = Wallet.objects.select_related("user").order_by("-created_at")
            if uid is not None and uid != 1:
                wallet_qs = wallet_qs.filter(user_id=uid)
            for w in wallet_qs[:8]:
                amt = float(w.amount or 0)
                is_credit = w.status == "Approved"
                wallet_transactions.append({
                    "id": w.id,
                    "title": w.description or f"Wallet {w.status or 'transaction'}",
                    "amount": f"{'+' if is_credit else '-'}₹{amt:.2f}",
                    "isCredit": is_credit,
                    "date": w.created_at.strftime("%d-%m-%Y %I:%M %p") if w.created_at else "",
                })
        except Exception:
            wallet_transactions = []

        risk_alerts = []
        if rto_rate > 10:
            risk_alerts.append({
                "type": "High RTO",
                "message": f"RTO rate is {rto_rate}% — review courier performance",
                "severity": "high",
            })
        if total_orders == 0:
            risk_alerts.append({
                "type": "No Orders",
                "message": "No orders found. Create your first order to get started.",
                "severity": "low",
            })

        return Response({
            "success": True,
            "data": {
                "revenueData": revenue_data,
                "orderStatusData": order_status_data,
                "courierPerformance": courier_performance,
                "recentOrders": [
                    {
                        "id": o.order_number or str(o.id),
                        "customer": o.customer_name or "-",
                        "product": o.seller or o.platform or "General Item",
                        "status": o.status or "Pending",
                        "type": "COD" if (o.payment_gateway or "").lower() == "cod" else "Forward",
                        "amount": o.amount or "₹0",
                        "courier": o.courier or "-",
                    }
                    for o in recent_orders
                ],
                "statusBuckets": status_buckets,
                "shipmentAnalytics": shipment_analytics,
                "walletTransactions": wallet_transactions,
                "riskAlerts": risk_alerts,
                "totalOrders": total_orders,
                "rtoOrders": rto_orders,
                "rtoRate": rto_rate,
            },
        })


class ReportDataView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        user_id = request.query_params.get("user_id")
        orders = list(filter_orders(user_id))

        revenue_by_month = defaultdict(lambda: {"revenue": Decimal("0"), "orders": 0})
        courier_report = defaultdict(lambda: {"orders": 0, "revenue": Decimal("0"), "delivered": 0, "rto": 0})
        seller_report = defaultdict(lambda: {"orders": 0, "revenue": Decimal("0")})
        rto_by_month = defaultdict(int)

        total_revenue = Decimal("0")
        delivered = 0
        pending = 0
        rto = 0

        for order in orders:
            amount = parse_amount(order.amount)
            total_revenue += amount
            month = order.order_date.strftime("%b") if order.order_date else "N/A"
            revenue_by_month[month]["revenue"] += amount
            revenue_by_month[month]["orders"] += 1

            courier = order.courier or "Unknown"
            courier_report[courier]["orders"] += 1
            courier_report[courier]["revenue"] += amount

            seller = order.seller or "Unknown"
            seller_report[seller]["orders"] += 1
            seller_report[seller]["revenue"] += amount

            status = (order.status or "").lower()
            if "delivered" in status:
                delivered += 1
                courier_report[courier]["delivered"] += 1
            elif "rto" in status or "return" in status:
                rto += 1
                rto_by_month[month] += 1
                courier_report[courier]["rto"] += 1
            else:
                pending += 1

        courier_report_data = []
        for name, stats in courier_report.items():
            shipments = stats["orders"] or 1
            courier_report_data.append({
                "courier": name,
                "shipments": stats["orders"],
                "delivered": stats["delivered"],
                "rto": stats["rto"],
                "avgDays": 3.5,
            })

        seller_report_data = []
        for name, stats in seller_report.items():
            seller_orders = stats["orders"] or 1
            seller_rto = sum(
                1 for o in orders
                if (o.seller or "Unknown") == name and o.status and ("rto" in o.status.lower() or "return" in o.status.lower())
            )
            rto_rate = round(seller_rto / seller_orders * 100, 1)
            score = max(0, min(100, round(100 - rto_rate * 3)))
            seller_report_data.append({
                "seller": name,
                "orders": stats["orders"],
                "revenue": f"₹{stats['revenue']:,.0f}",
                "rtoRate": rto_rate,
                "score": score,
            })

        total_order_count = len(orders) or 1
        rto_trend_data = []
        for month, count in rto_by_month.items():
            month_orders = revenue_by_month[month]["orders"] or 1
            rto_trend_data.append({
                "month": month,
                "rtoRate": round(count / month_orders * 100, 1),
            })

        revenue_data = [
            {
                "month": m,
                "revenue": float(v["revenue"]),
                "profit": round(float(v["revenue"]) * 0.15, 2),
                "orders": v["orders"],
            }
            for m, v in revenue_by_month.items()
        ]

        return Response({
            "success": True,
            "data": {
                "revenueData": revenue_data,
                "courierReportData": courier_report_data,
                "sellerReportData": seller_report_data,
                "rtoTrendData": rto_trend_data,
                "totalStats": {
                    "totalOrders": len(orders),
                    "totalRevenue": float(total_revenue),
                    "delivered": delivered,
                    "pending": pending,
                    "rto": rto,
                    "deliveryRate": round((delivered / total_order_count * 100), 2),
                },
            },
        })
