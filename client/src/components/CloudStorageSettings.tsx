/**
 * CloudStorageSettings — Provider picker, OAuth connect/disconnect, folder config
 * Used inside SettingsPanel > Cloud Storage tab
 */

import { useState, useEffect } from "react";
import { Cloud, HardDrive, ExternalLink, CheckCircle2, XCircle, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  type CloudProvider,
  type CloudProviderConfig,
  getCloudConfigs,
  saveCloudConfig,
  removeCloudConfig,
  isProviderConnected,
  disconnectProvider,
  googleConnect,
  onedriveConnect,
  dropboxConnect,
} from "@/lib/cloudStorage";

const PROVIDERS: { id: CloudProvider; name: string; icon: string; color: string; docsUrl: string; clientIdLabel: string; clientIdPlaceholder: string; setupSteps: string[] }[] = [
  {
    id: "google",
    name: "Google Drive",
    icon: "🟡",
    color: "text-yellow-600 dark:text-yellow-400",
    docsUrl: "https://console.cloud.google.com/apis/credentials",
    clientIdLabel: "Client ID",
    clientIdPlaceholder: "123456789-abc.apps.googleusercontent.com",
    setupSteps: [
      "Go to Google Cloud Console → APIs & Services → Credentials",
      "Create OAuth 2.0 Client ID (Web application)",
      "Add this URL to Authorized redirect URIs: " + window.location.origin + "/oauth-callback.html",
      "Enable the Google Drive API in your project",
      "Paste the Client ID below",
    ],
  },
  {
    id: "onedrive",
    name: "OneDrive / SharePoint",
    icon: "🔵",
    color: "text-blue-600 dark:text-blue-400",
    docsUrl: "https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps",
    clientIdLabel: "Application (Client) ID",
    clientIdPlaceholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    setupSteps: [
      "Go to Azure Portal → App registrations → New registration",
      "Set Redirect URI (Single-page application) to: " + window.location.origin + "/oauth-callback.html",
      "Under API permissions, add Microsoft Graph → Files.ReadWrite",
      "Copy the Application (Client) ID and paste below",
    ],
  },
  {
    id: "dropbox",
    name: "Dropbox",
    icon: "🟦",
    color: "text-indigo-600 dark:text-indigo-400",
    docsUrl: "https://www.dropbox.com/developers/apps",
    clientIdLabel: "App Key",
    clientIdPlaceholder: "abcdefghij1234",
    setupSteps: [
      "Go to Dropbox Developer Console → Create app",
      "Choose 'Scoped access' → 'Full Dropbox' or 'App folder'",
      "Under OAuth 2, add Redirect URI: " + window.location.origin + "/oauth-callback.html",
      "Enable permissions: files.content.write, files.content.read, sharing.write",
      "Copy the App Key and paste below",
    ],
  },
];

export default function CloudStorageSettings() {
  const [configs, setConfigs] = useState<Partial<Record<CloudProvider, CloudProviderConfig>>>({});
  const [connected, setConnected] = useState<Partial<Record<CloudProvider, boolean>>>({});
  const [connecting, setConnecting] = useState<CloudProvider | null>(null);
  const [expanded, setExpanded] = useState<CloudProvider | null>(null);
  const [drafts, setDrafts] = useState<Partial<Record<CloudProvider, { clientId: string; tenantId: string; folderName: string }>>>({});

  const refresh = () => {
    const c = getCloudConfigs();
    setConfigs(c);
    const conn: Partial<Record<CloudProvider, boolean>> = {};
    for (const p of ["google", "onedrive", "dropbox"] as CloudProvider[]) {
      conn[p] = isProviderConnected(p);
    }
    setConnected(conn);
  };

  useEffect(() => {
    refresh();
    // Listen for OAuth callback messages from the popup
    const handler = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "oauth_callback") return;
      if (event.data.error) {
        toast.error("OAuth failed: " + event.data.error);
        setConnecting(null);
        return;
      }
      if (event.data.code) {
        // Exchange code for token
        const p = connecting;
        if (!p) return;
        const cfg = getCloudConfigs()[p];
        if (!cfg) return;
        try {
          const { googleExchangeCode, onedriveExchangeCode, dropboxExchangeCode } = await import("@/lib/cloudStorage");
          if (p === "google") await googleExchangeCode(cfg.clientId, event.data.code);
          else if (p === "onedrive") await onedriveExchangeCode(cfg.clientId, cfg.tenantId ?? "common", event.data.code);
          else if (p === "dropbox") await dropboxExchangeCode(cfg.clientId, event.data.code);
          toast.success(`Connected to ${PROVIDERS.find(x => x.id === p)?.name}!`);
        } catch (err: any) {
          toast.error("Token exchange failed: " + err.message);
        } finally {
          setConnecting(null);
          refresh();
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [connecting]);

  const handleSaveConfig = (provider: CloudProvider) => {
    const d = drafts[provider];
    if (!d?.clientId.trim()) { toast.error("Client ID is required"); return; }
    const cfg: CloudProviderConfig = {
      provider,
      clientId: d.clientId.trim(),
      tenantId: provider === "onedrive" ? (d.tenantId.trim() || "common") : undefined,
      folderName: d.folderName.trim() || "LocalTicket",
    };
    saveCloudConfig(cfg);
    setConfigs(prev => ({ ...prev, [provider]: cfg }));
    toast.success("Configuration saved");
  };

  const handleConnect = async (provider: CloudProvider) => {
    const cfg = configs[provider];
    if (!cfg) { toast.error("Save configuration first"); return; }
    setConnecting(provider);
    try {
      if (provider === "google") await googleConnect(cfg.clientId);
      else if (provider === "onedrive") await onedriveConnect(cfg.clientId, cfg.tenantId);
      else if (provider === "dropbox") await dropboxConnect(cfg.clientId);
      toast.success(`Connected to ${PROVIDERS.find(x => x.id === provider)?.name}!`);
      refresh();
    } catch (err: any) {
      if (!err.message?.includes("popup")) {
        toast.error("Connection failed: " + err.message);
      }
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = (provider: CloudProvider) => {
    disconnectProvider(provider);
    removeCloudConfig(provider);
    refresh();
    toast.success("Disconnected");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-700 dark:text-blue-300">
          Cloud storage lets you save your JSON data file and ticket attachments to Google Drive, OneDrive/SharePoint, or Dropbox.
          File attachments are only available when a provider is connected.
          Each provider requires a free developer app registration — no paid plan needed.
        </p>
      </div>

      {PROVIDERS.map((provider) => {
        const cfg = configs[provider.id];
        const isConn = connected[provider.id] ?? false;
        const isExpanded = expanded === provider.id;
        const draft = drafts[provider.id] ?? {
          clientId: cfg?.clientId ?? "",
          tenantId: (cfg as any)?.tenantId ?? "",
          folderName: cfg?.folderName ?? "LocalTicket",
        };

        return (
          <div key={provider.id} className="border border-border rounded-lg overflow-hidden">
            {/* Header row */}
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-secondary/40 transition-colors"
              onClick={() => setExpanded(isExpanded ? null : provider.id)}
            >
              <span className="text-lg">{provider.icon}</span>
              <div className="flex-1">
                <p className={`text-sm font-medium ${provider.color}`}>{provider.name}</p>
                <p className="text-xs text-muted-foreground">
                  {isConn ? `Connected · Folder: ${cfg?.folderName ?? "LocalTicket"}` : cfg ? "Configured — click Connect to authorize" : "Not configured"}
                </p>
              </div>
              {isConn ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-muted-foreground/40" />
              )}
            </div>

            {/* Expanded config panel */}
            {isExpanded && (
              <div className="border-t border-border px-4 py-4 bg-secondary/20 space-y-4">
                {/* Setup instructions */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Setup</p>
                  <ol className="space-y-1">
                    {provider.setupSteps.map((step, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-2">
                        <span className="font-mono text-primary/60 flex-shrink-0">{i + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                  <a href={provider.docsUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1">
                    Open developer console <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Config fields */}
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-medium text-foreground">{provider.clientIdLabel}</label>
                    <Input
                      value={draft.clientId}
                      onChange={(e) => setDrafts(prev => ({ ...prev, [provider.id]: { ...draft, clientId: e.target.value } }))}
                      placeholder={provider.clientIdPlaceholder}
                      className="mt-1 h-8 text-xs font-mono"
                    />
                  </div>
                  {provider.id === "onedrive" && (
                    <div>
                      <label className="text-xs font-medium text-foreground">Tenant ID <span className="text-muted-foreground">(or "common" for personal accounts)</span></label>
                      <Input
                        value={draft.tenantId}
                        onChange={(e) => setDrafts(prev => ({ ...prev, [provider.id]: { ...draft, tenantId: e.target.value } }))}
                        placeholder="common"
                        className="mt-1 h-8 text-xs font-mono"
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-medium text-foreground">Folder name</label>
                    <Input
                      value={draft.folderName}
                      onChange={(e) => setDrafts(prev => ({ ...prev, [provider.id]: { ...draft, folderName: e.target.value } }))}
                      placeholder="LocalTicket"
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleSaveConfig(provider.id)} className="h-7 text-xs">
                    Save config
                  </Button>
                  {cfg && !isConn && (
                    <Button size="sm" onClick={() => handleConnect(provider.id)} disabled={connecting === provider.id} className="h-7 text-xs">
                      {connecting === provider.id ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Connecting…</> : <><Cloud className="w-3 h-3 mr-1" />Connect</>}
                    </Button>
                  )}
                  {isConn && (
                    <Button size="sm" variant="outline" onClick={() => handleDisconnect(provider.id)} className="h-7 text-xs text-destructive hover:text-destructive">
                      Disconnect
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Box — coming soon */}
      <div className="border border-dashed border-border rounded-lg px-4 py-3 opacity-50">
        <div className="flex items-center gap-3">
          <span className="text-lg">📦</span>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Box <span className="text-xs bg-secondary px-1.5 py-0.5 rounded ml-1">Coming soon</span></p>
            <p className="text-xs text-muted-foreground">Box requires a server-side token exchange — support is planned for a future release.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
