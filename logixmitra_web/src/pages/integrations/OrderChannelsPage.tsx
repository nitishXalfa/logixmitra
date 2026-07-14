import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import IntegrationPlatformCard from "@/components/integrations/IntegrationPlatformCard";
import IntegrateChannelDialog from "@/components/integrations/IntegrateChannelDialog";
import {
  ORDER_CHANNEL_PLATFORMS,
  type ConnectedChannel,
  type OrderChannelPlatform,
} from "@/config/integrationPlatforms";
import integrationApi from "../../../services/integrationsApi";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown, RefreshCw } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const DEMO_CHANNELS: ConnectedChannel[] = [
  {
    id: "5259",
    channel: "shopify",
    channelLabel: "Shopify",
    storeId: "HF",
    storeName: "My Store",
    connectionStatus: "In-Active",
    status: "In-Active",
    lastSync: "28 May 2026, 03:29 PM",
  },
];

const StatusPill = ({ label }: { label: string }) => (
  <span
    className={cn(
      "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
      label === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-600"
    )}
  >
    {label}
  </span>
);

const ChannelLogo = ({ platform }: { platform: OrderChannelPlatform | undefined }) => {
  if (!platform) return <span className="text-xs text-slate-400">—</span>;
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white"
        style={{ backgroundColor: platform.color }}
      >
        {platform.logoText}
      </div>
      <span className="text-sm font-medium text-slate-800">{platform.name}</span>
    </div>
  );
};

const OrderChannelsPage = () => {
  const { toast } = useToast();
  const [channels, setChannels] = useState<ConnectedChannel[]>(DEMO_CHANNELS);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<OrderChannelPlatform | null>(null);

  const integratedIds = useMemo(
    () => new Set(channels.map((c) => c.channel)),
    [channels]
  );

  const loadChannels = useCallback(async () => {
    setLoading(true);
    try {
      const data = await integrationApi.getAll();
      if (Array.isArray(data) && data.length > 0) {
        setChannels(data as ConnectedChannel[]);
      }
    } catch {
      setChannels(DEMO_CHANNELS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  const openIntegrate = (platform: OrderChannelPlatform) => {
    setSelectedPlatform(platform);
    setDialogOpen(true);
  };

  const handleIntegrate = async (form: Record<string, string>) => {
    try {
      await integrationApi.create(form);
      const platform = ORDER_CHANNEL_PLATFORMS.find((p) => p.id === form.platform);
      const newChannel: ConnectedChannel = {
        id: String(Date.now()).slice(-4),
        channel: form.platform,
        channelLabel: platform?.name || form.platform,
        storeId: form.storeName.slice(0, 2).toUpperCase(),
        storeName: form.storeName,
        connectionStatus: "Active",
        status: "Active",
        lastSync: new Date().toLocaleString("en-IN", {
          day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
        }),
      };
      setChannels((prev) => {
        const filtered = prev.filter((c) => c.channel !== form.platform);
        return [newChannel, ...filtered];
      });
      toast({ title: "Store connected", description: `${platform?.name} integration saved.` });
    } catch {
      toast({ title: "Connection failed", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout hidePageHeader>
      <div className="space-y-5">
        <div className="lm-workspace-shell overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h1 className="text-base font-semibold text-slate-800">Order Channels</h1>
            <button
              type="button"
              onClick={loadChannels}
              disabled={loading}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              title="Refresh"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="lm-table-head">
                  {["Channel", "ID and Name", "Connection Status", "Status", "Last Order Sync", "Action"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {channels.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-500">
                      No channels connected yet. Select a platform below to integrate.
                    </td>
                  </tr>
                ) : (
                  channels.map((row) => {
                    const platform = ORDER_CHANNEL_PLATFORMS.find((p) => p.id === row.channel);
                    return (
                      <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                        <td className="px-5 py-4"><ChannelLogo platform={platform} /></td>
                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-slate-800"># {row.id} | {row.storeId}</p>
                          <p className="text-sm text-slate-500">{row.channelLabel} | {row.storeName}</p>
                        </td>
                        <td className="px-5 py-4"><StatusPill label={row.connectionStatus} /></td>
                        <td className="px-5 py-4"><StatusPill label={row.status} /></td>
                        <td className="px-5 py-4 text-sm text-slate-600">{row.lastSync}</td>
                        <td className="px-5 py-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-600 text-white hover:bg-teal-700"
                              >
                                <ChevronDown className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => toast({ title: "Sync started" })}>
                                Sync orders now
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toast({ title: "Channel settings" })}>
                                Edit connection
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => setChannels((prev) => prev.filter((c) => c.id !== row.id))}
                              >
                                Disconnect
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lm-workspace-shell p-5">
          <h2 className="mb-5 text-base font-semibold text-slate-800">
            Select the channel to integrate
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {ORDER_CHANNEL_PLATFORMS.map((platform) => (
              <IntegrationPlatformCard
                key={platform.id}
                name={platform.name}
                color={platform.color}
                logoText={platform.logoText}
                integrated={integratedIds.has(platform.id)}
                onAction={() => openIntegrate(platform)}
              />
            ))}
          </div>
        </div>
      </div>

      <IntegrateChannelDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        platform={selectedPlatform}
        onSubmit={handleIntegrate}
      />
    </DashboardLayout>
  );
};

export default OrderChannelsPage;
