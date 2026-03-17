/**
 * LocalTicket — App Context
 * Provides global state: data, file handle status, CRUD operations.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { AppData, Ticket, Project, Comment } from "@/lib/types";
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
  deleteTicket: (id: string) => Promise<void>;
  addCommentToTicket: (ticketId: string, author: string, body: string) => Promise<void>;
  deleteComment: (ticketId: string, commentId: string) => Promise<void>;

  // Filters
  selectedProjectKey: string | null;
  setSelectedProjectKey: (key: string | null) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fileMode, setFileMode] = useState<"file" | "localStorage" | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedProjectKey, setSelectedProjectKey] = useState<string | null>(null);

  // Persist & save helper
  const persist = useCallback(async (newData: AppData) => {
    setData(newData);
    setIsSaving(true);
    try {
      if (hasFileHandle()) {
        await saveData(newData);
      } else {
        saveToLocalStorage(newData);
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
    deleteTicket,
    addCommentToTicket,
    deleteComment,
    selectedProjectKey,
    setSelectedProjectKey,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
