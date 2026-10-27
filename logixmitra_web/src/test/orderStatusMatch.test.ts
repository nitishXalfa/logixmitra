import { describe, expect, it } from "vitest";
import { orderMatchesStatus } from "@/utils/orderStatusMatch";
import { computeStatusCounts } from "@/utils/orderStatusCounts";

describe("orderMatchesStatus NDR", () => {
  it("matches undelivered/ndr/failed and excludes RTO", () => {
    expect(orderMatchesStatus("UNDELIVERED", "UNDELIVERED")).toBe(true);
    expect(orderMatchesStatus("NDR", "UNDELIVERED")).toBe(true);
    expect(orderMatchesStatus("Failed Delivery", "UNDELIVERED")).toBe(true);
    expect(orderMatchesStatus("RTO In transit", "UNDELIVERED")).toBe(false);
    expect(orderMatchesStatus("Delivered", "UNDELIVERED")).toBe(false);
  });

  it("keeps count equal to filtered list size", () => {
    const orders = [
      { status: "UNDELIVERED" },
      { status: "NDR" },
      { status: "Failed Delivery" },
      { status: "RTO In transit" },
      { status: "Delivered" },
    ];
    const counts = computeStatusCounts(orders);
    const list = orders.filter((o) => orderMatchesStatus(o.status, "UNDELIVERED"));
    expect(counts.UNDELIVERED).toBe(list.length);
    expect(list.length).toBe(3);
  });
});
