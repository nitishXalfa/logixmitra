import { ReactNode } from "react";
import { ChevronDown, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/shared/EmptyState";
import { Order } from "@/types/order";
import { cn } from "@/lib/utils";

const COLUMNS = [
  "Order Date",
  "Order Details",
  "Product Details",
  "Package Details",
  "Payment",
  "Shipping Details",
  "Pickup Address",
  "Action",
];

function fmtOrderDate(order: Order, formatDate: (s: string) => string) {
  const raw = order.platform === "Shopify" ? order.orderDate : order.createdAt;
  if (!raw) return "—";
  const d = new Date(raw);
  const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true });
  return { date, time, platform: order.platform || "Custom" };
}

function statusBadgeClass(status?: string) {
  const s = (status || "").toLowerCase();
  if (s === "pending" || s.includes("new")) return "bg-emerald-100 text-emerald-800";
  if (s.includes("deliver")) return "bg-teal-100 text-teal-800";
  if (s.includes("transit")) return "bg-blue-100 text-blue-800";
  if (s.includes("rto") || s.includes("undeliver")) return "bg-orange-100 text-orange-800";
  return "bg-slate-100 text-slate-700";
}

interface OrdersRichTableProps {
  orders: Order[];
  loading: boolean;
  selectedIds: string[];
  onToggleSelect: (order: Order, checked: boolean) => void;
  onToggleSelectAll: (checked: boolean) => void;
  allSelected: boolean;
  warelistbyid: Record<string, { name?: string; city?: string; pincode?: string }>;
  formatDate: (s: string) => string;
  renderActions: (order: Order) => ReactNode;
  renderStatus?: (order: Order) => ReactNode;
  onAwbClick?: (awb: string) => void;
  onAssignCourier?: (order: Order) => void;
}

const OrdersRichTable = ({
  orders,
  loading,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  allSelected,
  warelistbyid,
  formatDate,
  renderActions,
  renderStatus,
  onAwbClick,
  onAssignCourier,
}: OrdersRichTableProps) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1100px]">
        <thead>
          <tr className="bg-slate-100 border-b border-slate-200">
            <th className="w-10 px-3 py-2.5">
              <input
                type="checkbox"
                checked={allSelected && orders.length > 0}
                onChange={(e) => onToggleSelectAll(e.target.checked)}
                className="rounded"
              />
            </th>
            {COLUMNS.map((col) => (
              <th
                key={col}
                className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={COLUMNS.length + 1} className="py-12 text-center text-sm text-slate-500">
                Loading orders...
              </td>
            </tr>
          ) : orders.length === 0 ? (
            <tr>
              <td colSpan={COLUMNS.length + 1}>
                <EmptyState />
              </td>
            </tr>
          ) : (
            orders.map((order) => {
              const dt = fmtOrderDate(order, formatDate);
              const item = order.items?.[0];
              const dims =
                item?.height && item?.width && item?.length
                  ? `${item.length} x ${item.width} x ${item.height} (cm)`
                  : "—";
              const deadWt = item?.deadWeight ? `${item.deadWeight} kg` : "—";
              const volWt = item?.volumetricWeight
                ? `${item.volumetricWeight} kg`
                : item?.height && item?.width && item?.length
                  ? `${((item.height * item.width * item.length) / 5000).toFixed(2)} kg`
                  : "—";
              const amount = (order as any).totalOutstanding && Number((order as any).totalOutstanding) !== 0
                ? (order as any).totalOutstanding
                : order.amount;
              const isCod = (order as any).financialStatus === "pending";
              const warehouse = warelistbyid[(order as any).warehouse];
              const addr = [
                order.addressLine1,
                order.city,
                order.state,
                order.pincode,
              ].filter(Boolean).join(", ");

              return (
                <tr
                  key={order.id}
                  className={cn(
                    "border-b border-slate-100 hover:bg-teal-50/30 transition-colors align-top",
                    order.status === "Draft Merged" && "opacity-60 pointer-events-none bg-orange-50"
                  )}
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(order.id)}
                      onChange={(e) => onToggleSelect(order, e.target.checked)}
                      className="rounded"
                    />
                  </td>

                  {/* Order Date */}
                  <td className="px-3 py-3 text-xs text-slate-600 whitespace-nowrap">
                    {typeof dt === "object" ? (
                      <>
                        <div className="font-medium text-slate-800">{dt.date}</div>
                        <div>{dt.time}</div>
                        <div className="mt-1 text-slate-400">{dt.platform}</div>
                      </>
                    ) : dt}
                  </td>

                  {/* Order Details */}
                  <td className="px-3 py-3 min-w-[140px]">
                    <button
                      type="button"
                      className="text-sm font-semibold text-blue-600 hover:underline"
                      onClick={() => onAwbClick?.(order.awb)}
                    >
                      {order.orderNumber}
                    </button>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Ref. ID: {(order as any).referenceId || "—"}
                    </div>
                    <Badge className={cn("mt-1.5 text-[10px] font-semibold border-0", statusBadgeClass(order.status))}>
                      {order.status === "Pending" ? "New Order" : order.status}
                    </Badge>
                    {renderStatus?.(order)}
                  </td>

                  {/* Product Details */}
                  <td className="px-3 py-3 min-w-[130px] text-xs">
                    <div className="font-medium text-slate-800 line-clamp-2">
                      {item?.name || "—"}
                    </div>
                    <div className="text-slate-400 mt-0.5">SKU: {(item as any)?.sku || "—"}</div>
                    <div className="text-slate-500 mt-0.5">QTY: {item?.quantity ?? order.totalItems ?? 1}</div>
                  </td>

                  {/* Package Details */}
                  <td className="px-3 py-3 min-w-[120px] text-xs text-slate-600">
                    <div>{dims}</div>
                    <div className="mt-0.5">Dead wt.: {deadWt}</div>
                    <div className="mt-0.5">Volumetric: {volWt}</div>
                    <button type="button" className="mt-1 text-teal-600 hover:text-teal-800">
                      <Pencil className="h-3 w-3" />
                    </button>
                  </td>

                  {/* Payment */}
                  <td className="px-3 py-3 min-w-[100px] text-xs">
                    <div className="text-slate-700">Invoice: ₹ {amount}</div>
                    {isCod && (
                      <div className="text-slate-600 mt-0.5">COD: ₹ {amount}</div>
                    )}
                    <Badge variant="outline" className="mt-1 text-[10px]">
                      {isCod ? "COD" : "Prepaid"}
                    </Badge>
                  </td>

                  {/* Shipping Details */}
                  <td className="px-3 py-3 min-w-[160px] text-xs">
                    <div className="font-medium text-slate-800">{order.customerName}</div>
                    <div className="text-slate-500">{order.customerPhone}</div>
                    {order.customerEmail && (
                      <div className="text-slate-400 truncate max-w-[150px]">{order.customerEmail}</div>
                    )}
                    <div className="text-slate-500 mt-1 line-clamp-2">{addr || "—"}</div>
                  </td>

                  {/* Pickup Address */}
                  <td className="px-3 py-3 min-w-[120px] text-xs text-slate-600">
                    <div className="font-medium text-slate-700">
                      {warehouse?.name || order.courier || "—"}
                    </div>
                    <div className="mt-0.5 line-clamp-2">
                      {[warehouse?.city, warehouse?.pincode].filter(Boolean).join(", ") || "—"}
                    </div>
                  </td>

                  {/* Action */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    {order.status === "Pending" ? (
                      <Button
                        size="sm"
                        className="h-8 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold gap-1"
                        onClick={() => onAssignCourier?.(order)}
                      >
                        Assign Courier
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    ) : (
                      renderActions(order)
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default OrdersRichTable;
