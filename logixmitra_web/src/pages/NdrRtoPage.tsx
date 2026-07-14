import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import NdrTabsBar from "@/components/ndr/NdrTabsBar";
import EmptyState from "@/components/shared/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, RotateCcw, Package, AlertTriangle, Phone, MapPin, RefreshCw } from "lucide-react";
import StatCard from "@/components/StatCard";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

import { orderApi } from "../../services/orderApi";



interface NDRCase {
  id: string;
  orderId: string;
  customer: string;
  phone: string;
  address: string;
  courier: string;
  reason: string;
  attempts: number;
  status: "open" | "reattempt" | "rto" | "resolved";
  date: string;
}

const initialNDR: NDRCase[] = [
  { id: "NDR-001", orderId: "ORD-7818", customer: "Vikram Singh", phone: "+91 65432 10987", address: "78, MI Road, Jaipur", courier: "DTDC", reason: "Customer unavailable", attempts: 2, status: "open", date: "2026-02-24" },
  { id: "NDR-002", orderId: "ORD-7810", customer: "Ravi Prasad", phone: "+91 98765 12345", address: "12, MG Road, Indore", courier: "BlueDart", reason: "Wrong address", attempts: 1, status: "open", date: "2026-02-24" },
  { id: "NDR-003", orderId: "ORD-7805", customer: "Neha Kapoor", phone: "+91 87654 23456", address: "45, Park Street, Kolkata", courier: "Delhivery", reason: "Customer refused", attempts: 3, status: "rto", date: "2026-02-23" },
  { id: "NDR-004", orderId: "ORD-7800", customer: "Arun Kumar", phone: "+91 76543 34567", address: "89, Anna Salai, Chennai", courier: "Ecom Express", reason: "Incomplete address", attempts: 1, status: "reattempt", date: "2026-02-23" },
  { id: "NDR-005", orderId: "ORD-7795", customer: "Priti Sharma", phone: "+91 65432 45678", address: "23, FC Road, Pune", courier: "Xpressbees", reason: "Customer unavailable", attempts: 2, status: "resolved", date: "2026-02-22" },
  { id: "NDR-006", orderId: "ORD-7790", customer: "Manish Tiwari", phone: "+91 54321 56789", address: "56, Civil Lines, Lucknow", courier: "DTDC", reason: "Payment not ready", attempts: 1, status: "open", date: "2026-02-24" },
];

const rtoReasons = [
  // { reason: "Customer unavailable", count: 45 },
  // { reason: "Wrong address", count: 23 },
  // { reason: "Customer refused", count: 18 },
  // { reason: "Payment not ready", count: 12 },
  // { reason: "Incomplete address", count: 8 },
  // { reason: "Other", count: 5 },
];









const statusStyles = {
  open: "bg-warning/10 text-warning",
  reattempt: "bg-info/10 text-info",
  rto: "bg-destructive/10 text-destructive",
  resolved: "bg-success/10 text-success",
};

const NDR_STATUSES = ["UNDELIVERED", "NDR", "RTO", "Return to Origin", "RTO In transit", "RTO In Transit"];

const isNdrOrder = (order: { status?: string }) => {
  const s = (order?.status || "").toLowerCase();
  return NDR_STATUSES.some((st) => s.includes(st.toLowerCase())) || s.includes("rto") || s.includes("ndr") || s.includes("undelivered");
};

const normalizeNdrStatus = (status?: string): "open" | "reattempt" | "rto" | "resolved" => {
  const s = (status || "").toLowerCase();
  if (s.includes("rto") || s.includes("return")) return "rto";
  if (s.includes("reattempt") || s.includes("transit")) return "reattempt";
  if (s.includes("delivered") && !s.includes("undelivered")) return "resolved";
  return "open";
};

const NdrRtoPage = () => {
  const { toast } = useToast();
  const [cases, setCases] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCase, setSelectedCase] = useState<any>(null);

  const fetchOrders = async () => {
    try {
      const result = await orderApi.getAll({ paginate: "false" });
      const orders = result?.orders ?? (Array.isArray(result) ? result : []);
      setCases(Array.isArray(orders) ? orders : []);
    } catch (error) {
      console.error("Error fetching orders for NDR/RTO:", error);
      setCases([]);
    }
  };

  useEffect(() => {
    fetchOrders()
  }, []);








  const ndrCases = cases.filter(isNdrOrder);

  const filtered = ndrCases.filter((c) => {
    const matchSearch =
      c?.orderNumber?.toLowerCase()?.includes(search.toLowerCase()) ||
      c?.customerName?.toLowerCase()?.includes(search.toLowerCase()) ||
      c?.awb?.toLowerCase()?.includes(search.toLowerCase());
    const ndrStatus = normalizeNdrStatus(c.status);
    const matchStatus = statusFilter === "all" || ndrStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    open: ndrCases.filter((c) => normalizeNdrStatus(c.status) === "open").length,
    reattempt: ndrCases.filter((c) => normalizeNdrStatus(c.status) === "reattempt").length,
    rto: ndrCases.filter((c) => normalizeNdrStatus(c.status) === "rto").length,
    resolved: ndrCases.filter((c) => normalizeNdrStatus(c.status) === "resolved").length,
  };

  const handleReattempt = (id: string) => {
    setCases(prev => prev.map(c => c.id === id ? { ...c, status: "reattempt" as const, attempts: c.attempts + 1 } : c));
    toast({ title: "Reattempt scheduled", description: "Delivery reattempt has been scheduled." });
  };

  const handleMarkRTO = (id: string) => {
    setCases(prev => prev.map(c => c.id === id ? { ...c, status: "rto" as const } : c));
    toast({ title: "Marked as RTO", variant: "destructive" });
  };

  const handleResolve = (id: string) => {
    setCases(prev => prev.map(c => c.id === id ? { ...c, status: "resolved" as const } : c));
    toast({ title: "Case resolved" });
  };

  const rtoReasonData = ndrCases.reduce((acc: Record<string, number>, c) => {
    const reason = c?.ndrreason || c?.status || "Unknown";
    acc[reason] = (acc[reason] || 0) + 1;
    return acc;
  }, {});
  const rtoReasonChart = Object.entries(rtoReasonData).map(([reason, count]) => ({ reason, count }));

  return (
    <DashboardLayout hidePageHeader>
      <div className="space-y-4">
        <NdrTabsBar activeTab={statusFilter} onTabChange={setStatusFilter} />

        <div className="lm-workspace-shell p-4 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard title="Open NDR" value={String(stats.open)} icon={<AlertTriangle className="h-5 w-5" />} />
          <StatCard title="Reattempt" value={String(stats.reattempt)} icon={<RefreshCw className="h-5 w-5" />} />
          <StatCard title="RTO" value={String(stats.rto)} icon={<RotateCcw className="h-5 w-5" />} />
          <StatCard title="Resolved" value={String(stats.resolved)} icon={<Package className="h-5 w-5" />} />
        </div>

        <Tabs defaultValue="cases">
          <TabsList>
            <TabsTrigger value="cases">NDR Cases</TabsTrigger>
            <TabsTrigger value="analytics">RTO Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="cases" className="mt-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by order id or awb..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full data-table">
                  <thead className="lm-table-head">
                    <tr className="border-b border-border">
                      {["NDR ID", "Order", "Customer", "Courier", "Reason", "Attempts", "Status", "Actions"].map(h => (
                        <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={8}><EmptyState title="No NDR/RTO cases found" /></td>
                      </tr>
                    ) : (
                      filtered.map((c) => {
                        const ndrStatus = normalizeNdrStatus(c.status);
                        return (
                      <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 text-sm font-medium text-foreground">{c.awb || c.referenceId || "-"}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{c.orderNumber}</td>
                        <td className="py-3 px-4">
                          <p className="text-sm font-medium text-foreground">{c.customerName}</p>
                          <p className="text-xs text-muted-foreground">{c.customerPhone}</p>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{c.courier}</td> 
                        <td className="py-3 px-4 text-sm text-muted-foreground">{c?.ndrreason || c?.status || "-"}</td>
                        <td className="py-3 px-4 text-sm text-foreground font-medium">{c?.attempts ?? "-"}</td> 
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusStyles[ndrStatus]}`}>{c.status}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-1">
                            {ndrStatus === "open" && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => handleReattempt(c.id)}>Reattempt</Button>
                                <Button size="sm" variant="destructive" onClick={() => handleMarkRTO(c.id)}>RTO</Button>
                              </>
                            )}
                            {ndrStatus === "reattempt" && (
                              <Button size="sm" variant="outline" onClick={() => handleResolve(c.id)}>Resolve</Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => setSelectedCase(c)}>View</Button>
                          </div>
                        </td>
                      </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="mt-4">
            <Card className="shadow-card">
              <CardHeader><CardTitle className="font-display text-lg">RTO Reason Analysis</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={rtoReasonChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                    <XAxis dataKey="reason" tick={{ fontSize: 11 }} stroke="hsl(220, 10%, 46%)" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </div>

      <Dialog open={!!selectedCase} onOpenChange={() => setSelectedCase(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">NDR Details — {selectedCase?.awb}</DialogTitle>
            <DialogDescription>Order: {selectedCase?.orderNumber}</DialogDescription>
          </DialogHeader>
          {selectedCase && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-muted-foreground">Customer</p><p className="font-medium text-foreground">{selectedCase.customerName}</p></div>
                <div><p className="text-muted-foreground">Phone</p><p className="font-medium text-foreground">{selectedCase.customerPhone}</p></div>
                <div><p className="text-muted-foreground">Courier</p><p className="font-medium text-foreground">{selectedCase.courier}</p></div>
                <div><p className="text-muted-foreground">Attempts</p><p className="font-medium text-foreground">{selectedCase.attempts}</p></div>
                <div className="col-span-2"><p className="text-muted-foreground">Address</p><p className="font-medium text-foreground">{[selectedCase.addressLine1, selectedCase.city, selectedCase.state, selectedCase.pincode].filter(Boolean).join(", ") || "-"}</p></div>
                <div className="col-span-2"><p className="text-muted-foreground">NDR Reason</p><p className="font-medium text-foreground">{selectedCase.ndrreason}</p></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default NdrRtoPage;
