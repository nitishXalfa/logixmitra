/**
 * Shared status matching for list filters and chip counts.
 * Keep in sync with logixmitra_backend/orders/status_utils.py
 * and orderStatusConfig chip values.
 */

export function normalizeStatusChip(statusFilter?: string | null): string | null {
  if (!statusFilter) return null;
  const value = String(statusFilter).trim();
  if (!value || value.toLowerCase() === "all") return null;
  if (value.toUpperCase() === "NDR") return "UNDELIVERED";
  return value;
}

export function orderMatchesStatus(orderStatus: string | undefined, chipValue: string): boolean {
  const s = (orderStatus || "").toLowerCase().trim();
  const chip = normalizeStatusChip(chipValue);
  if (!chip) return true;
  const v = chip.toLowerCase();

  switch (chip) {
    case "Pending":
      return s === "pending" || s === "new" || s === "draft" || s === "processing";
    case "READY FOR DISPATCH":
      return s === "ready for dispatch" || s === "ready to ship" || s === "courier assigned";
    case "Out for Pickup":
      return (
        s === "out for pickup" ||
        s.includes("pickups & manifests") ||
        s.includes("manifest generated")
      );
    case "In Transit":
      return s === "in transit" || s === "shipped";
    case "Out for Delivery":
      return s === "out for delivery";
    case "Delivered":
      return s === "delivered";
    case "UNDELIVERED":
      return (
        !s.includes("rto") &&
        (s.includes("undelivered") ||
          s.includes("ndr") ||
          s === "failed" ||
          s.includes("failed delivery") ||
          s.includes("delivery failed"))
      );
    case "RTO In transit":
      return (
        !s.includes("delivered") &&
        !s.includes("return to origin") &&
        (s.includes("rto in") ||
          s.includes("rto-in") ||
          s.includes("rto initiated") ||
          s === "rto")
      );
    case "RTO Delivered":
      return s.includes("rto delivered") || s.includes("return to origin") || s === "rto delivered";
    case "Cancelled":
      return s === "cancelled" || s === "canceled";
    default:
      return s === v || (orderStatus || "") === chip;
  }
}
