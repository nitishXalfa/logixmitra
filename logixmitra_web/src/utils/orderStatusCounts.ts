import { ORDER_STATUS_GROUPS } from "@/config/orderStatusConfig";

export function computeStatusCounts(orders: { status?: string }[]): Record<string, number> {
  const counts: Record<string, number> = { all: orders.length };

  for (const group of ORDER_STATUS_GROUPS) {
    for (const chip of group.chips) {
      if (chip.value === "all") {
        counts.all = orders.length;
        continue;
      }
      counts[chip.value] = orders.filter((o) => {
        const s = (o.status || "").toLowerCase();
        const v = chip.value.toLowerCase();
        if (chip.value === "Cancelled") return s === "cancelled" || s === "canceled";
        return s === v || (o.status || "") === chip.value;
      }).length;
    }
  }
  return counts;
}
