import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Copy, FileText, ExternalLink } from "lucide-react";
import { API_BASE_URL } from "../../../services/config";
import { getuserid } from "../../../services/getbasicdata";

const KEY_STORAGE = "lm-api-keys";

function loadOrCreateKeys() {
  try {
    const saved = localStorage.getItem(KEY_STORAGE);
    if (saved) return JSON.parse(saved) as { publicKey: string; privateKey: string };
  } catch { /* ignore */ }
  const uid = getuserid() || "demo";
  const keys = {
    publicKey: `LM_PUB_${String(uid).slice(0, 6).toUpperCase()}${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
    privateKey: `LM_PRIV_${Math.random().toString(36).slice(2, 18)}${Math.random().toString(36).slice(2, 18)}`,
  };
  try {
    localStorage.setItem(KEY_STORAGE, JSON.stringify(keys));
  } catch { /* ignore */ }
  return keys;
}

const ApiIntegrationPage = () => {
  const { toast } = useToast();
  const [keys] = useState(loadOrCreateKeys);

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied` });
  };

  return (
    <DashboardLayout hidePageHeader>
      <div className="lm-workspace-shell max-w-2xl mx-auto p-6">
        <h1 className="text-lg font-bold text-slate-900">API Documentation</h1>
        <p className="mt-2 text-sm text-slate-500">
          Check latest version of API documentation from Swagger or download PDF
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="outline" className="gap-2" onClick={() => toast({ title: "PDF download", description: "API PDF will be available soon." })}>
            <FileText className="h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" className="gap-2" asChild>
            <a href={`${API_BASE_URL}/docs`} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" /> Swagger
            </a>
          </Button>
        </div>

        <div className="mt-8 space-y-5 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Public Key</p>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-white border border-slate-200 px-3 py-2 text-sm font-mono text-slate-800">
                {keys.publicKey}
              </code>
              <Button size="icon" variant="outline" onClick={() => copy(keys.publicKey, "Public key")}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Private Key</p>
            <button
              type="button"
              onClick={() => copy(keys.privateKey, "Private key")}
              className="mt-1 flex w-full items-center gap-2 rounded-lg bg-white border border-slate-200 px-3 py-2 text-sm font-mono text-teal-700 hover:bg-teal-50 transition-colors text-left"
            >
              <span className="flex-1 truncate">{keys.privateKey}</span>
              <Copy className="h-4 w-4 shrink-0" />
            </button>
            <p className="mt-1 text-xs text-slate-400">Click to copy private key</p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50/80 p-4 text-sm text-amber-900">
          Base URL: <code className="font-mono text-xs">{API_BASE_URL}</code>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ApiIntegrationPage;
