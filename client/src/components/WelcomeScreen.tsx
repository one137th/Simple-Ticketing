/**
 * WelcomeScreen — File selection / onboarding
 * Design: Blueprint — centered card, navy + amber, DM Sans
 */

import { useState } from "react";
import { FolderOpen, FilePlus, HardDrive, Ticket, Info, Sparkles, CloudDownload, Loader2 } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import {
  getActiveProvider,
  getActiveProviderLabel,
  pullDataFromCloud,
} from "@/lib/cloudStorage";
import { toast } from "sonner";
import type { AppData } from "@/lib/types";

export default function WelcomeScreen() {
  const { handleOpenFile, handleCreateFile, handleUseLocalStorage } = useApp();
  const hasFSAA = "showOpenFilePicker" in window;
  const [isPulling, setIsPulling] = useState(false);

  // Detect if a cloud provider is already connected
  const activeProvider = getActiveProvider();
  const providerLabel = getActiveProviderLabel();

  const handleLoadSample = () => {
    const sampleData = {
      version: "1.0.0",
      lastUpdated: new Date().toISOString(),
      projects: [
        { key: "DEMO", name: "Demo Project", description: "A sample project to explore LocalTicket", color: "#2563eb", createdAt: new Date().toISOString() },
        { key: "BUG", name: "Bug Tracker", description: "Track bugs and issues", color: "#dc2626", createdAt: new Date().toISOString() },
      ],
      tickets: [
        { id: "DEMO-001", title: "Set up CI/CD pipeline", description: "Configure GitHub Actions for automated testing and deployment.", status: "in_progress", priority: "high", type: "task", labels: ["devops", "automation"], assignee: "Alice", reporter: "Bob", createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), updatedAt: new Date(Date.now() - 3600000).toISOString(), comments: [{ id: "c1", author: "Bob", body: "Started working on this. Using GitHub Actions.", createdAt: new Date(Date.now() - 7200000).toISOString() }], projectKey: "DEMO" },
        { id: "DEMO-002", title: "Design database schema", description: "Define the core entities and relationships for the application.", status: "done", priority: "critical", type: "task", labels: ["backend", "database"], assignee: "Bob", reporter: "Alice", createdAt: new Date(Date.now() - 86400000 * 7).toISOString(), updatedAt: new Date(Date.now() - 86400000).toISOString(), comments: [], projectKey: "DEMO" },
        { id: "DEMO-003", title: "Add dark mode support", description: "Implement a dark theme toggle using CSS variables.", status: "todo", priority: "low", type: "feature", labels: ["ui", "accessibility"], assignee: "", reporter: "Alice", createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(), comments: [], projectKey: "DEMO" },
        { id: "DEMO-004", title: "Write API documentation", description: "Document all REST endpoints using OpenAPI spec.", status: "backlog", priority: "medium", type: "task", labels: ["docs"], assignee: "", reporter: "Bob", createdAt: new Date(Date.now() - 86400000 * 5).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(), comments: [], projectKey: "DEMO" },
        { id: "BUG-001", title: "Login form crashes on Safari", description: "The login form throws a TypeError on Safari 16. Reproducible on macOS Ventura.", status: "in_review", priority: "critical", type: "bug", labels: ["safari", "auth", "urgent"], assignee: "Alice", reporter: "QA Team", createdAt: new Date(Date.now() - 86400000).toISOString(), updatedAt: new Date(Date.now() - 1800000).toISOString(), comments: [{ id: "c2", author: "Alice", body: "Found the issue — using optional chaining not supported in Safari 16.0. Fix in review.", createdAt: new Date(Date.now() - 3600000).toISOString() }], projectKey: "BUG" },
        { id: "BUG-002", title: "Pagination breaks with > 100 items", description: "When there are more than 100 items, the pagination component renders incorrectly.", status: "todo", priority: "high", type: "bug", labels: ["pagination", "ui"], assignee: "Bob", reporter: "Alice", createdAt: new Date(Date.now() - 86400000 * 4).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(), comments: [], projectKey: "BUG" },
      ],
    };
    localStorage.setItem("localticket_data", JSON.stringify(sampleData));
    handleUseLocalStorage();
  };

  const handlePullFromCloud = async () => {
    if (!activeProvider) return;
    setIsPulling(true);
    try {
      const json = await pullDataFromCloud();
      if (!json) {
        toast.error(`No data file found in ${providerLabel}. Start fresh by creating a new file.`);
        setIsPulling(false);
        return;
      }
      const parsed: AppData = JSON.parse(json);
      // Store in localStorage as the working copy, then load it
      localStorage.setItem("localticket_data", json);
      handleUseLocalStorage();
      toast.success(`Data restored from ${providerLabel} — ${parsed.tickets?.length ?? 0} tickets loaded`);
    } catch (err: any) {
      toast.error("Pull failed: " + (err?.message ?? "Unknown error"));
      setIsPulling(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center shadow-md">
          <Ticket className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            LocalTicket
          </h1>
          <p className="text-xs text-muted-foreground font-mono tracking-wide">v1.0 · Lightweight Issue Tracker</p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-8 text-center max-w-xs">
        A lightweight issue tracker that stores all data in a local JSON file on your machine.
      </p>

      {/* Main card */}
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-border bg-secondary/30">
          <h2 className="text-sm font-semibold text-foreground">Choose your data storage</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            All tickets stored locally — no server, no tracking.
          </p>
        </div>

        <div className="p-4 space-y-2">

          {/* ── Pull from cloud (shown prominently when a provider is connected) ── */}
          {activeProvider && (
            <>
              <div className="rounded-lg border-2 border-primary/30 bg-primary/5 overflow-hidden">
                <button
                  onClick={handlePullFromCloud}
                  disabled={isPulling}
                  className="group w-full flex items-start gap-3.5 p-3.5 hover:bg-primary/10 transition-all duration-150 text-left disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 bg-primary/15 group-hover:bg-primary/25 transition-colors">
                    {isPulling
                      ? <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      : <CloudDownload className="w-4 h-4 text-primary" />
                    }
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-primary">
                      {isPulling ? "Restoring from cloud…" : `Restore from ${providerLabel}`}
                    </div>
                    <div className="text-xs text-primary/70 mt-0.5">
                      {isPulling
                        ? "Downloading your data file…"
                        : `Load your saved data from ${providerLabel} — recommended for returning users`
                      }
                    </div>
                  </div>
                </button>
                <div className="px-4 pb-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-green-700 dark:text-green-400 font-medium">{providerLabel} connected</span>
                </div>
              </div>

              <div className="flex items-center gap-3 py-0.5">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">or start fresh</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            </>
          )}

          {/* Open existing file */}
          <StorageOption
            icon={<FolderOpen className="w-4 h-4 text-primary" />}
            iconBg="bg-primary/10 group-hover:bg-primary/20"
            title="Open existing file"
            description={<>Load a <code className="font-mono text-xs bg-secondary px-1 rounded">localticket-data.json</code> from your computer</>}
            onClick={handleOpenFile}
            disabled={!hasFSAA}
          />

          {/* Create new file */}
          <StorageOption
            icon={<FilePlus className="w-4 h-4 text-amber-700" />}
            iconBg="bg-amber-50 dark:bg-amber-950/30 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/40"
            title="Create new file"
            description="Choose where to save a new .json data file on your computer"
            onClick={handleCreateFile}
            disabled={!hasFSAA}
          />

          {/* Divider */}
          <div className="flex items-center gap-3 py-0.5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* localStorage */}
          <StorageOption
            icon={<HardDrive className="w-4 h-4 text-slate-500" />}
            iconBg="bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-200 dark:group-hover:bg-slate-700"
            title="Use browser storage"
            description="Store in localStorage — no file needed, but data stays in this browser only"
            onClick={handleUseLocalStorage}
          />

          {/* Try with sample data */}
          <StorageOption
            icon={<Sparkles className="w-4 h-4 text-purple-500" />}
            iconBg="bg-purple-50 dark:bg-purple-950/30 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/40"
            title="Try with sample data"
            description="Load demo projects in browser storage to explore the interface"
            onClick={handleLoadSample}
          />
        </div>

        {!hasFSAA && (
          <div className="mx-4 mb-4 flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-300">
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>
              File System Access API requires <strong>Chrome</strong> or <strong>Edge</strong>.
              Firefox/Safari users must use browser storage.
            </span>
          </div>
        )}
      </div>

      {/* Feature list */}
      <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs text-muted-foreground max-w-sm">
        {[
          "Ticket IDs (PROJ-001)",
          "Status & priority tracking",
          "Kanban board view",
          "Comments & labels",
          "Sortable list view",
          "JSON file — AI-readable",
          "No auth required",
          "Cloud sync optional",
        ].map((f) => (
          <div key={f} className="flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-primary/40" />
            {f}
          </div>
        ))}
      </div>
    </div>
  );
}

function StorageOption({
  icon, iconBg, title, description, onClick, disabled,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="group w-full flex items-start gap-3.5 p-3.5 rounded-lg border border-border hover:border-primary/30 hover:bg-secondary/40 transition-all duration-150 text-left disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${iconBg}`}>
        {icon}
      </div>
      <div>
        <div className="font-medium text-sm text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
      </div>
    </button>
  );
}
