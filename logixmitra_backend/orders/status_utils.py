"""Shared order-status matching for list filters and status chip counts.

Chip values must stay in sync with logixmitra_web/src/config/orderStatusConfig.ts
and logixmitra_web/src/utils/orderStatusMatch.ts.
"""
from django.db.models import Q


# Chip value -> Django Q filter. One order should land in at most one chip bucket
# for NDR/RTO groups; booking/journey chips stay exact/near-exact.
STATUS_CHIP_FILTERS = {
    "Pending": Q(status__iexact="Pending")
    | Q(status__iexact="New")
    | Q(status__iexact="Draft")
    | Q(status__iexact="Processing"),
    "READY FOR DISPATCH": Q(status__iexact="READY FOR DISPATCH")
    | Q(status__iexact="Ready to Ship")
    | Q(status__iexact="Courier Assigned"),
    "Out for Pickup": Q(status__iexact="Out for Pickup")
    | Q(status__iexact="Out for pickup")
    | Q(status__icontains="Pickups & Manifests")
    | Q(status__icontains="Manifest Generated"),
    "In Transit": Q(status__iexact="In Transit") | Q(status__iexact="Shipped"),
    "Out for Delivery": Q(status__iexact="Out for Delivery")
    | Q(status__iexact="Out For Delivery"),
    "Delivered": Q(status__iexact="Delivered"),
    # NDR: undelivered / ndr / failed — never RTO*
    "UNDELIVERED": (
        Q(status__icontains="undelivered")
        | Q(status__icontains="ndr")
        | Q(status__iexact="Failed")
        | Q(status__icontains="failed delivery")
        | Q(status__icontains="delivery failed")
    )
    & ~Q(status__icontains="rto"),
    "RTO In transit": (
        Q(status__icontains="rto in")
        | Q(status__icontains="rto-in")
        | Q(status__icontains="rto initiated")
        | Q(status__iexact="RTO")
        | Q(status__iexact="RTO Initiated")
    )
    & ~Q(status__icontains="delivered")
    & ~Q(status__icontains="return to origin"),
    "RTO Delivered": Q(status__icontains="rto delivered")
    | Q(status__icontains="return to origin")
    | Q(status__iexact="RTO Delivered"),
    "Cancelled": Q(status__iexact="Cancelled") | Q(status__iexact="Canceled"),
}


def normalize_status_param(status_filter):
    if not status_filter:
        return None
    value = str(status_filter).strip()
    if not value or value.lower() == "all":
        return None
    # Accept NDR as alias for the UNDELIVERED chip
    if value.upper() == "NDR":
        return "UNDELIVERED"
    return value


def status_filter_q(status_filter):
    """Build a Q object for the orders list status query param."""
    key = normalize_status_param(status_filter)
    if not key:
        return None
    if key in STATUS_CHIP_FILTERS:
        return STATUS_CHIP_FILTERS[key]
    # Fallback: case-insensitive exact match for unknown statuses
    return Q(status__iexact=key)


def apply_status_filter(queryset, status_filter):
    q = status_filter_q(status_filter)
    if q is None:
        return queryset
    return queryset.filter(q)


def compute_status_chip_counts(queryset):
    """Return counts keyed by chip value (plus 'all')."""
    counts = {"all": queryset.count()}
    for chip, q in STATUS_CHIP_FILTERS.items():
        counts[chip] = queryset.filter(q).count()
    return counts
