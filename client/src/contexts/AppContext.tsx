/**
 * LocalTicket — App Context
 * Provides global state: data, file handle status, CRUD operations.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { AppData, Ticket, Project } from "@/lib/types";
import type { SyncConfig } from "@/lib/remoteSync";
import { loadSyncConfig, saveSyncConfig, syncPush, syncPull } from "@/lib/remoteSync";
import {
  openFile,
  createNewFile,
  saveData,
  loadFromLocalStorage,
  saveToLocalStorage,
  createTicket,
  createProject,
  addComment,
  hasFileHandle,
  getFileHandleName,
} from "@/lib/store";
import { toast } from "sonner";

interface AppContextValue {
  data: AppData | null;
  isLoaded: boolean;
  isSaving: boolean;
  fileMode: "file" | "localStorage" | null;
  fileName: string | null;

  // File operations
  handleOpenFile: () => Promise<void>;
  handleCreateFile: () => Promise<void>;
  handleUseLocalStorage: () => void;

  // Project CRUD
  addProject: (p: Partial<Project> & { key: string; name: string }) => Promise<void>;
  updateProject: (key: string, changes: Partial<Project>) => Promise<void>;
  deleteProject: (key: string) => Promise<void>;

  // Ticket CRUD
  addTicket: (t: Partial<Ticket> & { title: string; projectKey: string }) => Promise<Ticket>;
  updateTicket: (id: string, changes: Partial<Ticket>) => Promise<void>;
  bulkUpdateTickets: (ids: string[], changes: Partial<Ticket>) => Promise<void>;
  deleteTicket: (id: string) => Promise<void>;
  addCommentToTicket: (ticketId: string, author: string, body: string) => Promise<void>;
  deleteComment: (ticketId: string, commentId: string) => Promise<void>;

  // Filters
  selectedProjectKey: string | null;
  setSelectedProjectKey: (key: string | null) => void;

  // Remote sync
  syncConfig: SyncConfig;
  updateSyncConfig: (cfg: SyncConfig) => void;
  pushToRemote: () => Promise<void>;
  pullFromRemote: () => Promise<void>;
  isSyncing: boolean;
  lastSyncResult: string | null;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fileMode, setFileMode] = useState<"file" | "localStorage" | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedProjectKey, setSelectedProjectKey] = useState<string | null>(null);
  const [syncConfig, setSyncConfig] = useState<SyncConfig>(() => loadSyncConfig());
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<string | null>(null);

  // Persist & save helper (also auto-pushes to remote if configured)
  const persist = useCallback(async (newData: AppData) => {
    setData(newData);
    setIsSaving(true);
    try {
      if (hasFileHandle()) {
        await saveData(newData);
      } else {
        saveToLocalStorage(newData);
      }
      // Auto-push to remote backend if configured
      const cfg = loadSyncConfig();
      if (cfg.backend !== "none") {
        const result = await syncPush(cfg, newData);
        if (result.ok) {
          // If a new gist was created, save the returned gistId
          if (result.gistId && cfg.backend === "github_gist") {
            const updated = { ...cfg, gistId: result.gistId };
            saveSyncConfig(updated);
            setSyncConfig(updated);
          }
          setLastSyncResult(`Synced ✓ ${new Date().toLocaleTimeString()}`);
        } else {
          setLastSyncResult(`Sync failed: ${result.message}`);
        }
      }
    } catch (err: any) {
      toast.error("Save failed: " + (err?.message ?? "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  }, []);

  // ── File operations ──────────────────────────────────────────────────────

  const handleOpenFile = useCallback(async () => {
    try {
      const loaded = await openFile();
      setData(loaded);
      setFileMode("file");
      setFileName(getFileHandleName());
      setIsLoaded(true);
      if (loaded.projects.length > 0) {
        setSelectedProjectKey(loaded.projects[0].key);
      }
      toast.success("File loaded successfully");
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        toast.error("Failed to open file: " + (err?.message ?? "Unknown error"));
      }
    }
  }, []);

  const handleCreateFile = useCallback(async () => {
    try {
      const newData = await createNewFile();
      setData(newData);
      setFileMode("file");
      setFileName(getFileHandleName());
      setIsLoaded(true);
      toast.success("New data file created");
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        toast.error("Failed to create file: " + (err?.message ?? "Unknown error"));
      }
    }
  }, []);

  const handleUseLocalStorage = useCallback(() => {
    const existing = loadFromLocalStorage();
    const d = existing ?? {
      version: "1.0.0",
      projects: [],
      tickets: [],
      lastUpdated: new Date().toISOString(),
    };
    setData(d);
    setFileMode("localStorage");
    setFileName("Browser Storage");
    setIsLoaded(true);
    if (d.projects.length > 0) {
      setSelectedProjectKey(d.projects[0].key);
    }
    toast.success("Using browser localStorage");
  }, []);

  // ── Project CRUD ─────────────────────────────────────────────────────────

  const addProject = useCallback(async (p: Partial<Project> & { key: string; name: string }) => {
    if (!data) return;
    const project = createProject(p);
    const newData = { ...data, projects: [...data.projects, project] };
    await persist(newData);
    setSelectedProjectKey(project.key);
    toast.success(`Project "${project.name}" created`);
  }, [data, persist]);

  const updateProject = useCallback(async (key: string, changes: Partial<Project>) => {
    if (!data) return;
    const newData = {
      ...data,
      projects: data.projects.map((p) => p.key === key ? { ...p, ...changes } : p),
    };
    await persist(newData);
  }, [data, persist]);

  const deleteProject = useCallback(async (key: string) => {
    if (!data) return;
    const newData = {
      ...data,
      projects: data.projects.filter((p) => p.key !== key),
      tickets: data.tickets.filter((t) => t.projectKey !== key),
    };
    await persist(newData);
    if (selectedProjectKey === key) {
      setSelectedProjectKey(newData.projects[0]?.key ?? null);
    }
    toast.success("Project deleted");
  }, [data, persist, selectedProjectKey]);

  // ── Ticket CRUD ──────────────────────────────────────────────────────────

  const addTicket = useCallback(async (t: Partial<Ticket> & { title: string; projectKey: string }): Promise<Ticket> => {
    if (!data) throw new Error("No data loaded");
    const ticket = createTicket(t, data.tickets);
    const newData = { ...data, tickets: [...data.tickets, ticket] };
    await persist(newData);
    toast.success(`Ticket ${ticket.id} created`);
    return ticket;
  }, [data, persist]);

  const updateTicket = useCallback(async (id: string, changes: Partial<Ticket>) => {
    if (!data) return;
    const newData = {
      ...data,
      tickets: data.tickets.map((t) =>
        t.id === id ? { ...t, ...changes, updatedAt: new Date().toISOString() } : t
      ),
    };
    await persist(newData);
  }, [data, persist]);

  const bulkUpdateTickets = useCallback(async (ids: string[], changes: Partial<Ticket>) => {
    if (!data) return;
    const now = new Date().toISOString();
    const newData = {
      ...data,
      tickets: data.tickets.map((t) =>
        ids.includes(t.id) ? { ...t, ...changes, updatedAt: now } : t
      ),
    };
    await persist(newData);
    toast.success(`Updated ${ids.length} ticket${ids.length !== 1 ? "s" : ""}`);
  }, [data, persist]);

  const deleteTicket = useCallback(async (id: string) => {
    if (!data) return;
    const newData = { ...data, tickets: data.tickets.filter((t) => t.id !== id) };
    await persist(newData);
    toast.success("Ticket deleted");
  }, [data, persist]);

  const addCommentToTicket = useCallback(async (ticketId: string, author: string, body: string) => {
    if (!data) return;
    const ticket = data.tickets.find((t) => t.id === ticketId);
    if (!ticket) return;
    const updated = addComment(ticket, author, body);
    await updateTicket(ticketId, updated);
  }, [data, updateTicket]);

  const deleteComment = useCallback(async (ticketId: string, commentId: string) => {
    if (!data) return;
    const ticket = data.tickets.find((t) => t.id === ticketId);
    if (!ticket) return;
    const updated = { ...ticket, comments: ticket.comments.filter((c) => c.id !== commentId) };
    await updateTicket(ticketId, updated);
  }, [data, updateTicket]);

  // Auto-select first project when data changes
  useEffect(() => {
    if (data && data.projects.length > 0 && !selectedProjectKey) {
      setSelectedProjectKey(data.projects[0].key);
    }
  }, [data?.projects.length]);

  const updateSyncConfig = useCallback((cfg: SyncConfig) => {
    saveSyncConfig(cfg);
    setSyncConfig(cfg);
    toast.success("Sync settings saved");
  }, []);

  const pushToRemote = useCallback(async () => {
    if (!data) return;
    setIsSyncing(true);
    try {
      const result = await syncPush(syncConfig, data);
      if (result.ok) {
        if (result.gistId && syncConfig.backend === "github_gist") {
          const updated = { ...syncConfig, gistId: result.gistId };
          saveSyncConfig(updated);
          setSyncConfig(updated);
        }
        setLastSyncResult(`Pushed ✓ ${new Date().toLocaleTimeString()}`);
        toast.success("Pushed to remote");
      } else {
        setLastSyncResult(`Push failed: ${result.message}`);
        toast.error(result.message);
      }
    } finally {
      setIsSyncing(false);
    }
  }, [data, syncConfig]);

  const pullFromRemote = useCallback(async () => {
    setIsSyncing(true);
    try {
      const result = await syncPull(syncConfig);
      if (result.ok && result.data) {
        setData(result.data);
        if (hasFileHandle()) await saveData(result.data);
        else saveToLocalStorage(result.data);
        if (result.data.projects.length > 0) setSelectedProjectKey(result.data.projects[0].key);
        setLastSyncResult(`Pulled ✓ ${new Date().toLocaleTimeString()}`);
        toast.success("Pulled from remote");
      } else {
        setLastSyncResult(`Pull failed: ${result.message}`);
        toast.error(result.message);
      }
    } finally {
      setIsSyncing(false);
    }
  }, [syncConfig]);

  const value: AppContextValue = {
    data,
    isLoaded,
    isSaving,
    fileMode,
    fileName,
    handleOpenFile,
    handleCreateFile,
    handleUseLocalStorage,
    addProject,
    updateProject,
    deleteProject,
    addTicket,
    updateTicket,
    bulkUpdateTickets,
    deleteTicket,
    addCommentToTicket,
    deleteComment,
    selectedProjectKey,
    setSelectedProjectKey,
    syncConfig,
    updateSyncConfig,
    pushToRemote,
    pullFromRemote,
    isSyncing,
    lastSyncResult,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
