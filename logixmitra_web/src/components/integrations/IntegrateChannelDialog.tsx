import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OrderChannelPlatform } from "@/config/integrationPlatforms";

interface IntegrateChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: OrderChannelPlatform | null;
  onSubmit: (data: Record<string, string>) => Promise<void>;
}

const IntegrateChannelDialog = ({
  open,
  onOpenChange,
  platform,
  onSubmit,
}: IntegrateChannelDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [storeUrl, setStoreUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");

  const handleSubmit = async () => {
    if (!platform) return;
    setLoading(true);
    try {
      await onSubmit({
        platform: platform.id,
        storeName,
        storeUrl,
        apiKey,
        apiSecret,
      });
      onOpenChange(false);
      setStoreName("");
      setStoreUrl("");
      setApiKey("");
      setApiSecret("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Integrate {platform?.name}</DialogTitle>
          <DialogDescription>
            Connect your {platform?.name} store to sync orders automatically into LogixMitra.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Store name</Label>
            <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="My Store" />
          </div>
          <div className="space-y-2">
            <Label>Store URL</Label>
            <Input value={storeUrl} onChange={(e) => setStoreUrl(e.target.value)} placeholder="https://your-store.com" />
          </div>
          <div className="space-y-2">
            <Label>API Key / Access Token</Label>
            <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Enter API key" />
          </div>
          {(platform?.id === "woocommerce" || platform?.id === "amazon") && (
            <div className="space-y-2">
              <Label>API Secret</Label>
              <Input value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} placeholder="Enter API secret" type="password" />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || !storeName || !storeUrl || !apiKey}>
            {loading ? "Connecting..." : "Connect Store"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default IntegrateChannelDialog;
