/**
 * SettingsPanel — File management, remote sync, project settings, AI agent guide
 * Design: Blueprint — tabbed side panel
 */

import { useState } from "react";
import {
  X, FolderOpen, FilePlus, Download, Trash2, Edit2, Check,
  AlertTriangle, CloudUpload, CloudDownload, RefreshCw, Bot,
  Github, Cloud, Copy, ExternalLink, CheckCircle2, XCircle,
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { PROJECT_COLORS } from "@/lib/types";
import { formatDateTime } from "@/lib/dateUtils";
import { toast } from "sonner";
import type { SyncConfig, GistSyncConfig, CloudflareSyncConfig } from "@/lib/remoteSync";
import { CLOUDFLARE_WORKER_TEMPLATE } from "@/lib/remoteSync";

type Tab = "file" | "sync" | "projects" | "agent";

interface Props { onClose: () => void; }

export default function SettingsPanel({ onClose }: Props) {
  const {
    data, fileName, fileMode,
    handleOpenFile, handleCreateFile,
    updateProject, deleteProject,
    syncConfig, updateSyncConfig, pushToRemote, pullFromRemote,
    isSyncing, lastSyncResult,
  } = useApp();

  const [tab, setTab] = useState<Tab>("file");
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editColor, setEditColor] = useState("");
  const [confirmDeleteProject, setConfirmDeleteProject] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const projects = data?.projects ?? [];
  const tickets = data?.tickets ?? [];

  const handleExport = () => {
    if (!data) return;
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `localticket-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Data exported");
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const startEditProject = (key: string) => {
    const p = projects.find((x) => x.key === key);
    if (!p) return;
    setEditName(p.name); setEditDesc(p.description); setEditColor(p.color);
    setEditingProject(key);
  };

  const saveEditProject = async () => {
    if (!editingProject) return;
    await updateProject(editingProject, { name: editName, description: editDesc, color: editColor });
    setEditingProject(null);
  };

  const handleDeleteProject = async (key: string) => {
    if (confirmDeleteProject !== key) { setConfirmDeleteProject(key); return; }
    await deleteProject(key);
    setConfirmDeleteProject(null);
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: "file", label: "Data File" },
    { id: "sync", label: "Remote Sync" },
    { id: "projects", label: "Projects" },
    { id: "agent", label: "AI Agents" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/20" onClick={onClose} />
      <div className="w-[520px] bg-card border-l border-border flex flex-col h-screen overflow-hidden shadow-xl slide-over-enter">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <h2 className="font-semibold text-sm text-foreground">Settings</h2>
          <button onClick={onClose} className="ml-auto p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-border px-4 gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors",
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* ── DATA FILE TAB ─────────────────────────────────────────────── */}
          {tab === "file" && (
            <div className="p-4 space-y-4">
              <div className="bg-secondary/50 rounded-lg p-3 text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Current:</span>
                  <span className="font-mono font-medium text-foreground truncate">{fileName ?? "None"}</span>
                  {fileMode === "localStorage" && (
                    <span className="ml-auto text-amber-600 font-semibold">localStorage</span>
                  )}
                </div>
                {data && (
                  <div className="text-muted-foreground">
                    Last updated: {formatDateTime(data.lastUpdated)} · {tickets.length} tickets · {projects.length} projects
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleOpenFile} className="text-xs gap-1.5 flex-1">
                  <FolderOpen className="w-3.5 h-3.5" /> Open File
                </Button>
                <Button variant="outline" size="sm" onClick={handleCreateFile} className="text-xs gap-1.5 flex-1">
                  <FilePlus className="w-3.5 h-3.5" /> New File
                </Button>
              </div>

              <div className="border-t border-border pt-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Export / Backup</h3>
                <Button variant="outline" size="sm" onClick={handleExport} className="text-xs gap-1.5">
                  <Download className="w-3.5 h-3.5" /> Download JSON Export
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Downloads all data as a JSON file — useful for backups or handing off to AI agents.
                </p>
              </div>

              <div className="border-t border-border pt-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">JSON Schema</h3>
                <pre className="text-xs bg-secondary/50 rounded-md p-3 overflow-x-auto font-mono text-foreground/70 leading-relaxed">
{`{
  "version": "1.0.0",
  "projects": [{ "key", "name",
    "description", "color", "createdAt" }],
  "tickets": [{
    "id",        // e.g. "PROJ-001"
    "title", "description",
    "status",    // backlog|todo|in_progress
                 // in_review|done|cancelled
    "priority",  // critical|high|medium|low
    "type",      // bug|feature|task|...
    "labels",    // string[]
    "assignee", "reporter",
    "createdAt", "updatedAt",
    "projectKey",
    "comments": [{ "id", "author",
      "body", "createdAt" }]
  }],
  "lastUpdated"
}`}
                </pre>
              </div>
            </div>
          )}

          {/* ── REMOTE SYNC TAB ───────────────────────────────────────────── */}
          {tab === "sync" && (
            <div className="p-4 space-y-4">
              {/* Status bar */}
              <div className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-xs",
                syncConfig.backend === "none"
                  ? "bg-secondary/50 text-muted-foreground"
                  : "bg-green-50 border border-green-200 text-green-800"
              )}>
                {syncConfig.backend === "none" ? (
                  <><Cloud className="w-3.5 h-3.5" /> No remote sync configured</>
                ) : (
                  <><CheckCircle2 className="w-3.5 h-3.5" />
                    Syncing to {syncConfig.backend === "github_gist" ? "GitHub Gist" : "Cloudflare KV"}
                    {lastSyncResult && <span className="ml-auto text-green-700">{lastSyncResult}</span>}
                  </>
                )}
              </div>

              {/* Manual push/pull */}
              {syncConfig.backend !== "none" && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={pushToRemote} disabled={isSyncing} className="text-xs gap-1.5 flex-1">
                    {isSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CloudUpload className="w-3.5 h-3.5" />}
                    Push Now
                  </Button>
                  <Button size="sm" variant="outline" onClick={pullFromRemote} disabled={isSyncing} className="text-xs gap-1.5 flex-1">
                    {isSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CloudDownload className="w-3.5 h-3.5" />}
                    Pull Now
                  </Button>
                </div>
              )}

              {/* Backend selector */}
              <div className="border-t border-border pt-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Configure Backend</h3>
                <div className="space-y-2">
                  <BackendCard
                    active={syncConfig.backend === "none"}
                    icon={<XCircle className="w-4 h-4 text-muted-foreground" />}
                    title="No sync"
                    description="Data stays local only"
                    onClick={() => updateSyncConfig({ backend: "none" })}
                  />
                  <BackendCard
                    active={syncConfig.backend === "github_gist"}
                    icon={<Github className="w-4 h-4 text-slate-700" />}
                    title="GitHub Gist"
                    description="Store as a private Gist — free, versioned, accessible via GitHub API"
                    onClick={() => {
                      if (syncConfig.backend !== "github_gist") {
                        updateSyncConfig({ backend: "github_gist", token: "", gistId: "", filename: "localticket-data.json" });
                      }
                    }}
                  />
                  <BackendCard
                    active={syncConfig.backend === "cloudflare_kv"}
                    icon={<Cloud className="w-4 h-4 text-orange-500" />}
                    title="Cloudflare KV Worker"
                    description="Store in Cloudflare's global KV store — fast, free tier, always-on"
                    onClick={() => {
                      if (syncConfig.backend !== "cloudflare_kv") {
                        updateSyncConfig({ backend: "cloudflare_kv", workerUrl: "", secret: "" });
                      }
                    }}
                  />
                </div>
              </div>

              {/* GitHub Gist config */}
              {syncConfig.backend === "github_gist" && (
                <GistConfig cfg={syncConfig} onSave={updateSyncConfig} />
              )}

              {/* Cloudflare KV config */}
              {syncConfig.backend === "cloudflare_kv" && (
                <KVConfig cfg={syncConfig} onSave={updateSyncConfig} copyToClipboard={copyToClipboard} copiedKey={copiedKey} />
              )}
            </div>
          )}

          {/* ── PROJECTS TAB ──────────────────────────────────────────────── */}
          {tab === "projects" && (
            <div className="p-4 space-y-2">
              {projects.map((project) => {
                const count = tickets.filter((t) => t.projectKey === project.key).length;
                const isEditing = editingProject === project.key;
                return (
                  <div key={project.key} className="border border-border rounded-lg overflow-hidden">
                    <div className="flex items-center gap-2.5 px-3 py-2.5 bg-secondary/30">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm text-foreground">{project.name}</span>
                        <span className="ml-2 font-mono text-xs text-muted-foreground">{project.key}</span>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">{count} tickets</span>
                      <button onClick={() => isEditing ? setEditingProject(null) : startEditProject(project.key)}
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button onClick={() => handleDeleteProject(project.key)}
                        className={cn("p-1 rounded transition-colors",
                          confirmDeleteProject === project.key ? "text-destructive bg-destructive/10" : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        )} title={confirmDeleteProject === project.key ? "Click again to confirm" : "Delete project"}>
                        {confirmDeleteProject === project.key ? <AlertTriangle className="w-3 h-3" /> : <Trash2 className="w-3 h-3" />}
                      </button>
                    </div>
                    {isEditing && (
                      <div className="px-3 py-3 border-t border-border space-y-2.5 bg-card">
                        <div className="space-y-1">
                          <Label className="text-xs">Name</Label>
                          <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-7 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Description</Label>
                          <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={2} className="text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Color</Label>
                          <div className="flex gap-2 flex-wrap">
                            {PROJECT_COLORS.map((c) => (
                              <button key={c} onClick={() => setEditColor(c)}
                                className={cn("w-6 h-6 rounded-full border-2 transition-all",
                                  editColor === c ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                                )} style={{ backgroundColor: c }} />
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveEditProject} className="h-7 text-xs gap-1"><Check className="w-3 h-3" /> Save</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingProject(null)} className="h-7 text-xs">Cancel</Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {projects.length === 0 && (
                <p className="text-xs text-muted-foreground">No projects yet. Create one from the sidebar.</p>
              )}
            </div>
          )}

          {/* ── AI AGENTS TAB ─────────────────────────────────────────────── */}
          {tab === "agent" && (
            <AgentGuide copyToClipboard={copyToClipboard} copiedKey={copiedKey} syncConfig={syncConfig} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function BackendCard({ active, icon, title, description, onClick }: {
  active: boolean; icon: React.ReactNode; title: string; description: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className={cn(
        "w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all",
        active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-secondary/40"
      )}>
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1">
        <div className="text-xs font-semibold text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
      </div>
      {active && <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />}
    </button>
  );
}

function GistConfig({ cfg, onSave }: { cfg: GistSyncConfig; onSave: (c: SyncConfig) => void }) {
  const [token, setToken] = useState(cfg.token);
  const [gistId, setGistId] = useState(cfg.gistId);
  const [filename, setFilename] = useState(cfg.filename);

  return (
    <div className="border border-border rounded-lg p-4 space-y-3 bg-secondary/20">
      <div className="flex items-center gap-2 mb-1">
        <Github className="w-4 h-4 text-slate-700" />
        <span className="text-xs font-semibold text-foreground">GitHub Gist Configuration</span>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Personal Access Token <span className="text-red-500">*</span></Label>
        <Input type="password" value={token} onChange={(e) => setToken(e.target.value)}
          placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" className="h-7 text-xs font-mono" />
        <p className="text-xs text-muted-foreground">
          Needs <code className="bg-secondary px-1 rounded">gist</code> scope.{" "}
          <a href="https://github.com/settings/tokens/new?scopes=gist" target="_blank" rel="noopener noreferrer"
            className="text-primary underline inline-flex items-center gap-0.5">
            Create one <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </p>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Gist ID <span className="text-muted-foreground">(leave blank to auto-create)</span></Label>
        <Input value={gistId} onChange={(e) => setGistId(e.target.value)}
          placeholder="e.g. a1b2c3d4e5f6..." className="h-7 text-xs font-mono" />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Filename</Label>
        <Input value={filename} onChange={(e) => setFilename(e.target.value)}
          className="h-7 text-xs font-mono" />
      </div>

      <Button size="sm" className="text-xs gap-1.5 w-full"
        onClick={() => onSave({ backend: "github_gist", token, gistId, filename })}
        disabled={!token}>
        <Check className="w-3.5 h-3.5" /> Save Gist Config
      </Button>

      <p className="text-xs text-muted-foreground">
        Data auto-pushes on every change. AI agents can read the raw Gist URL directly.
      </p>
    </div>
  );
}

function KVConfig({ cfg, onSave, copyToClipboard, copiedKey }: {
  cfg: CloudflareSyncConfig;
  onSave: (c: SyncConfig) => void;
  copyToClipboard: (text: string, key: string) => void;
  copiedKey: string | null;
}) {
  const [workerUrl, setWorkerUrl] = useState(cfg.workerUrl);
  const [secret, setSecret] = useState(cfg.secret);
  const [showWorker, setShowWorker] = useState(false);

  return (
    <div className="border border-border rounded-lg p-4 space-y-3 bg-secondary/20">
      <div className="flex items-center gap-2 mb-1">
        <Cloud className="w-4 h-4 text-orange-500" />
        <span className="text-xs font-semibold text-foreground">Cloudflare KV Configuration</span>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Worker URL <span className="text-red-500">*</span></Label>
        <Input value={workerUrl} onChange={(e) => setWorkerUrl(e.target.value)}
          placeholder="https://localticket-kv.yourname.workers.dev"
          className="h-7 text-xs font-mono" />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Bearer Secret <span className="text-red-500">*</span></Label>
        <Input type="password" value={secret} onChange={(e) => setSecret(e.target.value)}
          placeholder="Any strong random string" className="h-7 text-xs font-mono" />
      </div>

      <Button size="sm" className="text-xs gap-1.5 w-full"
        onClick={() => onSave({ backend: "cloudflare_kv", workerUrl, secret })}
        disabled={!workerUrl || !secret}>
        <Check className="w-3.5 h-3.5" /> Save KV Config
      </Button>

      <div className="border-t border-border pt-3">
        <button onClick={() => setShowWorker((v) => !v)}
          className="text-xs text-primary hover:underline flex items-center gap-1">
          {showWorker ? "Hide" : "Show"} Worker script to deploy
        </button>
        {showWorker && (
          <div className="mt-2 relative">
            <pre className="text-xs bg-secondary/60 rounded p-3 overflow-x-auto font-mono text-foreground/70 leading-relaxed max-h-48">
              {CLOUDFLARE_WORKER_TEMPLATE}
            </pre>
            <button
              onClick={() => copyToClipboard(CLOUDFLARE_WORKER_TEMPLATE, "worker")}
              className="absolute top-2 right-2 p-1.5 bg-card border border-border rounded text-muted-foreground hover:text-foreground transition-colors"
              title="Copy to clipboard">
              {copiedKey === "worker" ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AgentGuide({ copyToClipboard, copiedKey, syncConfig }: {
  copyToClipboard: (text: string, key: string) => void;
  copiedKey: string | null;
  syncConfig: SyncConfig;
}) {
  const gistRawUrl = syncConfig.backend === "github_gist" && syncConfig.gistId
    ? `https://gist.githubusercontent.com/raw/${syncConfig.gistId}/${(syncConfig as GistSyncConfig).filename}`
    : null;

  const kvUrl = syncConfig.backend === "cloudflare_kv"
    ? (syncConfig as CloudflareSyncConfig).workerUrl
    : null;

  const toolSpec = `{
  "name": "localticket",
  "description": "Read and write tickets in LocalTicket",
  "tools": [
    {
      "name": "list_tickets",
      "description": "List all tickets, optionally filtered by project or status",
      "parameters": {
        "projectKey": "string (optional)",
        "status": "backlog|todo|in_progress|in_review|done|cancelled (optional)"
      }
    },
    {
      "name": "create_ticket",
      "description": "Create a new ticket",
      "parameters": {
        "projectKey": "string (required)",
        "title": "string (required)",
        "description": "string",
        "status": "backlog|todo|in_progress|in_review|done|cancelled",
        "priority": "critical|high|medium|low",
        "type": "bug|feature|task|improvement|question",
        "labels": "string[]",
        "assignee": "string",
        "reporter": "string"
      }
    },
    {
      "name": "update_ticket",
      "description": "Update fields on an existing ticket by ID",
      "parameters": {
        "id": "string (required, e.g. PROJ-001)",
        "changes": "Partial<Ticket>"
      }
    },
    {
      "name": "add_comment",
      "description": "Add a comment to a ticket",
      "parameters": {
        "ticketId": "string (required)",
        "author": "string (required)",
        "body": "string (required)"
      }
    }
  ]
}`;

  const systemPrompt = `You have access to a LocalTicket issue tracker. The data is stored as JSON${
    gistRawUrl ? ` at: ${gistRawUrl}` : kvUrl ? ` at: ${kvUrl}` : " in a local file"
  }.

To read tickets: fetch the JSON from the data URL (GET request${kvUrl ? `, Authorization: Bearer <secret>` : ""}).
To write tickets: modify the JSON and PUT it back to the same URL${kvUrl ? ` with Authorization: Bearer <secret>` : ""}.

JSON schema:
- tickets[].id: string like "PROJ-001"
- tickets[].status: backlog | todo | in_progress | in_review | done | cancelled
- tickets[].priority: critical | high | medium | low
- tickets[].type: bug | feature | task | improvement | question
- tickets[].projectKey: matches projects[].key
- Always update tickets[].updatedAt and data.lastUpdated to new ISO timestamps on write.`;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Bot className="w-4 h-4 text-purple-600" />
        <span className="text-sm font-semibold text-foreground">AI Agent Setup</span>
      </div>

      {/* Data URL status */}
      <div className={cn(
        "rounded-lg p-3 text-xs space-y-1",
        (gistRawUrl || kvUrl) ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"
      )}>
        {gistRawUrl ? (
          <>
            <div className="font-semibold text-green-800">✓ Gist URL ready for agents</div>
            <div className="font-mono text-green-700 break-all">{gistRawUrl}</div>
            <button onClick={() => copyToClipboard(gistRawUrl, "gisturl")}
              className="flex items-center gap-1 text-green-700 hover:text-green-900 mt-1">
              {copiedKey === "gisturl" ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copiedKey === "gisturl" ? "Copied!" : "Copy URL"}
            </button>
          </>
        ) : kvUrl ? (
          <>
            <div className="font-semibold text-green-800">✓ Cloudflare Worker URL ready for agents</div>
            <div className="font-mono text-green-700 break-all">{kvUrl}</div>
            <button onClick={() => copyToClipboard(kvUrl, "kvurl")}
              className="flex items-center gap-1 text-green-700 hover:text-green-900 mt-1">
              {copiedKey === "kvurl" ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copiedKey === "kvurl" ? "Copied!" : "Copy URL"}
            </button>
          </>
        ) : (
          <>
            <div className="font-semibold text-amber-800">No remote URL configured</div>
            <div className="text-amber-700">Configure GitHub Gist or Cloudflare KV in the Remote Sync tab to give agents a URL to read/write directly.</div>
          </>
        )}
      </div>

      {/* How agents use it */}
      <div className="border-t border-border pt-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">How Agents Access Data</h3>
        <div className="space-y-2 text-xs text-muted-foreground">
          <p><strong className="text-foreground">Option A — Direct file read/write:</strong> If the agent runs on the same machine, it can read/write the <code className="bg-secondary px-1 rounded">.json</code> file directly. No API needed.</p>
          <p><strong className="text-foreground">Option B — GitHub Gist:</strong> Agent fetches the raw Gist URL (public read) or uses the GitHub API with a token (read/write).</p>
          <p><strong className="text-foreground">Option C — Cloudflare Worker:</strong> Agent calls <code className="bg-secondary px-1 rounded">GET/PUT {kvUrl || "https://your-worker.workers.dev"}</code> with <code className="bg-secondary px-1 rounded">Authorization: Bearer &lt;secret&gt;</code>.</p>
        </div>
      </div>

      {/* System prompt */}
      <div className="border-t border-border pt-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">System Prompt Snippet</h3>
          <button onClick={() => copyToClipboard(systemPrompt, "sysprompt")}
            className="flex items-center gap-1 text-xs text-primary hover:underline">
            {copiedKey === "sysprompt" ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
            {copiedKey === "sysprompt" ? "Copied!" : "Copy"}
          </button>
        </div>
        <pre className="text-xs bg-secondary/50 rounded-md p-3 overflow-x-auto font-mono text-foreground/70 leading-relaxed whitespace-pre-wrap">
          {systemPrompt}
        </pre>
      </div>

      {/* Tool spec */}
      <div className="border-t border-border pt-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tool Spec (JSON)</h3>
          <button onClick={() => copyToClipboard(toolSpec, "toolspec")}
            className="flex items-center gap-1 text-xs text-primary hover:underline">
            {copiedKey === "toolspec" ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
            {copiedKey === "toolspec" ? "Copied!" : "Copy"}
          </button>
        </div>
        <pre className="text-xs bg-secondary/50 rounded-md p-3 overflow-x-auto font-mono text-foreground/70 leading-relaxed max-h-48">
          {toolSpec}
        </pre>
      </div>
    </div>
  );
}
