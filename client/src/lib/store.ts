/**
 * LocalTicket — File System Store
 * Uses File System Access API to read/write a local JSON file.
 * Falls back to localStorage for browsers without FSAA support.
 */

import { nanoid } from "nanoid";
import type { AppData, Ticket, Project, Comment } from "./types";
import { DEFAULT_DATA } from "./types";

const LOCALSTORAGE_KEY = "localticket_data";
const LOCALSTORAGE_FILE_KEY = "localticket_last_file_path";

// ─── File Handle persistence ────────────────────────────────────────────────

let _fileHandle: FileSystemFileHandle | null = null;

export function hasFileHandle(): boolean {
  return _fileHandle !== null;
}

export function getFileHandleName(): string | null {
  return _fileHandle?.name ?? null;
}

// ─── Read / Write ────────────────────────────────────────────────────────────

async function readFromFile(handle: FileSystemFileHandle): Promise<AppData> {
  const file = await handle.getFile();
  const text = await file.text();
  const parsed = JSON.parse(text) as AppData;
  return parsed;
}

async function writeToFile(handle: FileSystemFileHandle, data: AppData): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(data, null, 2));
  await writable.close();
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function openFile(): Promise<AppData> {
  if (!("showOpenFilePicker" in window)) {
    throw new Error("File System Access API not supported in this browser. Use Chrome or Edge.");
  }
  const [handle] = await (window as any).showOpenFilePicker({
    types: [{ description: "JSON Files", accept: { "application/json": [".json"] } }],
    multiple: false,
  });
  _fileHandle = handle;
  const data = await readFromFile(handle);
  return data;
}

export async function createNewFile(): Promise<AppData> {
  if (!("showSaveFilePicker" in window)) {
    throw new Error("File System Access API not supported in this browser. Use Chrome or Edge.");
  }
  const handle = await (window as any).showSaveFilePicker({
    suggestedName: "localticket-data.json",
    types: [{ description: "JSON Files", accept: { "application/json": [".json"] } }],
  });
  _fileHandle = handle;
  const data: AppData = { ...DEFAULT_DATA, lastUpdated: new Date().toISOString() };
  await writeToFile(handle, data);
  return data;
}

export async function saveData(data: AppData): Promise<void> {
  const updated: AppData = { ...data, lastUpdated: new Date().toISOString() };
  if (_fileHandle) {
    await writeToFile(_fileHandle, updated);
  } else {
    // localStorage fallback
    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(updated));
  }
}

export function loadFromLocalStorage(): AppData | null {
  try {
    const raw = localStorage.getItem(LOCALSTORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppData;
  } catch {
    return null;
  }
}

export function saveToLocalStorage(data: AppData): void {
  localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify({ ...data, lastUpdated: new Date().toISOString() }));
}

// ─── Data Helpers ─────────────────────────────────────────────────────────────

export function generateTicketId(projectKey: string, tickets: Ticket[]): string {
  const projectTickets = tickets.filter((t) => t.projectKey === projectKey);
  const maxNum = projectTickets.reduce((max, t) => {
    const num = parseInt(t.id.split("-")[1] ?? "0", 10);
    return num > max ? num : max;
  }, 0);
  return `${projectKey}-${String(maxNum + 1).padStart(3, "0")}`;
}

export function createTicket(
  data: Partial<Ticket> & { title: string; projectKey: string },
  allTickets: Ticket[]
): Ticket {
  const now = new Date().toISOString();
  return {
    id: generateTicketId(data.projectKey, allTickets),
    title: data.title,
    description: data.description ?? "",
    status: data.status ?? "todo",
    priority: data.priority ?? "medium",
    type: data.type ?? "task",
    labels: data.labels ?? [],
    assignee: data.assignee ?? "",
    reporter: data.reporter ?? "",
    createdAt: now,
    updatedAt: now,
    comments: [],
    projectKey: data.projectKey,
  };
}

export function createProject(data: Partial<Project> & { key: string; name: string }): Project {
  return {
    key: data.key.toUpperCase(),
    name: data.name,
    description: data.description ?? "",
    createdAt: new Date().toISOString(),
    color: data.color ?? "#1e3a5f",
  };
}

export function addComment(ticket: Ticket, author: string, body: string): Ticket {
  const comment: Comment = {
    id: nanoid(8),
    author,
    body,
    createdAt: new Date().toISOString(),
  };
  return {
    ...ticket,
    comments: [...ticket.comments, comment],
    updatedAt: new Date().toISOString(),
  };
}
