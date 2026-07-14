import logging

import requests
from django.conf import settings
from django.utils import timezone

from orders.models import Order

logger = logging.getLogger(__name__)

STATUS_MAP_INNUFILL = {
    "DELIVERED": "Delivered",
    "OUT_FOR_DELIVERY": "Out for Delivery",
    "IN_TRANSIT": "In Transit",
    "IN_PROCESS": "Processing",
    "CANCELLED": "Cancelled",
    "RTO": "Return to Origin",
}

STATUS_MAP_EKART = {
    "delivered": "Delivered",
    "out_for_delivery": "Out for Delivery",
    "in_transit": "In Transit",
    "rto": "Return to Origin",
    "cancelled": "Cancelled",
}


def get_innufill_tracking(awb):
    if not settings.SMC_USER_NAME or not settings.SMC_PASSWORD:
        return {"success": False, "error": "SMC credentials not configured"}
    try:
        login = requests.post(
            f"{settings.SMC_BASE_URL}/auth/login",
            json={"email": settings.SMC_USER_NAME, "password": settings.SMC_PASSWORD, "vendorType": "SELLER"},
            timeout=30,
        )
        token = login.json().get("data", {}).get("accessToken")
        if not token:
            return {"success": False, "error": "Token not received"}
        tracking = requests.get(
            f"{settings.SMC_BASE_URL}/fulfillment/public/seller/order/order-tracking/{awb}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=30,
        )
        return {"success": True, "data": tracking.json()}
    except Exception as exc:
        logger.exception("Innufill tracking error")
        return {"success": False, "error": str(exc)}


def get_ekart_token():
    if not settings.EKART_URL:
        return None
    try:
        resp = requests.post(
            settings.EKART_URL,
            json={"username": settings.EKART_USERNAME, "password": settings.EKART_PASSWORD},
            timeout=30,
        )
        data = resp.json()
        return data.get("access_token") or data.get("data", {}).get("access_token") or data.get("token")
    except Exception:
        logger.exception("eKART token error")
        return None


def get_ekart_tracking(awb):
    token = get_ekart_token()
    if not token:
        return {"success": False, "error": "eKART token unavailable"}
    try:
        resp = requests.get(
            f"https://app.elite.ekartlogistics.in/data/v1/elite/track/{awb}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=30,
        )
        return {"success": True, "data": resp.json()}
    except Exception as exc:
        return {"success": False, "error": str(exc)}


def get_delhivery_tracking(awb):
    if not settings.DELHIVERY_TOKEN:
        return {"success": False, "error": "Delhivery token not configured"}
    try:
        resp = requests.get(
            f"{settings.DELHIVERY_BASEURL}/api/v1/packages/json/",
            params={"waybill": awb},
            headers={"Authorization": f"Token {settings.DELHIVERY_TOKEN}"},
            timeout=30,
        )
        return {"success": True, "data": resp.json()}
    except Exception as exc:
        return {"success": False, "error": str(exc)}


def map_tracking_status(order, tracking_data, courier_type):
    status = order.status
    history = order.tracking_history or []

    if courier_type == "innufill" and tracking_data.get("success"):
        payload = tracking_data.get("data", {}).get("data", {})
        current = payload.get("orderStatus")
        status = STATUS_MAP_INNUFILL.get(current, current.replace("_", " ") if current else order.status)
        history = payload.get("orderStateInfo") or history
    elif courier_type == "ekart" and tracking_data.get("success"):
        awb_data = tracking_data.get("data", {}).get(order.awb, {})
        events = awb_data.get("history") or []
        if events:
            current = events[0].get("status", "")
            status = STATUS_MAP_EKART.get(current, current.replace("_", " ").title())
            history = events
    elif courier_type == "delhivery" and tracking_data.get("success"):
        shipment_data = tracking_data.get("data", {}).get("ShipmentData", [])
        if shipment_data:
            status_text = shipment_data[0].get("Shipment", {}).get("Status", {}).get("Status", order.status)
            status = status_text or order.status

    return status, history


def update_order_from_tracking(order):
    courier = (order.courier or "").lower()
    if not order.awb or order.awb == "-":
        return False

    if any(x in courier for x in ("innufill", "innofulfil", "smc", "shree")):
        tracking = get_innufill_tracking(order.awb)
        courier_type = "innufill"
    elif "ekart" in courier:
        tracking = get_ekart_tracking(order.awb)
        courier_type = "ekart"
    elif "delhivery" in courier or "delivery" in courier:
        tracking = get_delhivery_tracking(order.awb)
        courier_type = "delhivery"
    else:
        return False

    new_status, history = map_tracking_status(order, tracking, courier_type)
    if new_status != order.status:
        order.status = new_status
        order.tracking_history = history
        if new_status == "Delivered":
            order.delivered_date = timezone.localdate()
            order.delivered_time = timezone.localtime().time()
        order.save(update_fields=["status", "tracking_history", "delivered_date", "delivered_time", "updated_at"])
        logger.info("Updated order %s to %s", order.order_number, new_status)
        return True
    return False


def update_all_orders_tracking():
    logger.info("Starting tracking update cron at %s", timezone.now().isoformat())
    orders = Order.objects.exclude(awb="-").exclude(awb__isnull=True).exclude(awb="")
    updated = 0
    errors = 0
    for order in orders.iterator():
        try:
            if update_order_from_tracking(order):
                updated += 1
        except Exception:
            errors += 1
            logger.exception("Failed updating order %s", order.order_number)
    logger.info("Tracking cron complete: updated=%s errors=%s total=%s", updated, errors, orders.count())
    return {"updated": updated, "errors": errors, "total": orders.count()}
