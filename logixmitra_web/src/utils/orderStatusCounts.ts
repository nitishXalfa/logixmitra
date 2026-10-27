import { ORDER_STATUS_GROUPS } from "@/config/orderStatusConfig";
import { orderMatchesStatus } from "@/utils/orderStatusMatch";

export function computeStatusCounts(orders: { status?: string }[]): Record<string, number> {
  const counts: Record<string, number> = { all: orders.length };

  for (const group of ORDER_STATUS_GROUPS) {
    for (const chip of group.chips) {
      if (chip.value === "all") {
        counts.all = orders.length;
        continue;
      }
      counts[chip.value] = orders.filter((o) => orderMatchesStatus(o.status, chip.value)).length;
    }
  }
  return counts;
}

/** Prefer server counts; fall back to client computation from a full order list. */
export function mergeStatusCounts(
  serverCounts?: Record<string, number> | null,
  fallbackOrders?: { status?: string }[]
): Record<string, number> {
  if (serverCounts && typeof serverCounts.all === "number") {
    return { ...serverCounts };
  }
  return computeStatusCounts(fallbackOrders || []);
}
