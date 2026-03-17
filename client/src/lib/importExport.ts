/**
 * importExport.ts — CSV and Excel import/export for LocalTicket
 *
 * Export: converts AppData tickets to CSV or XLSX
 * Import: parses CSV/XLSX and maps columns to Ticket fields with validation
 * Template: generates a sample CSV/XLSX file with documented columns
 */

import * as XLSX from "xlsx";
import type { Ticket, Project, AppData } from "./types";
import { nanoid } from "nanoid";

// ── Column definitions ────────────────────────────────────────────────────────

export const TICKET_COLUMNS = [
  { key: "id",          label: "ID",          required: false, example: "PROJ-001",    note: "Auto-generated if blank. Format: KEY-NNN" },
  { key: "projectKey",  label: "Project Key", required: true,  example: "PROJ",        note: "Must match an existing project key" },
  { key: "title",       label: "Title",       required: true,  example: "Fix login bug", note: "Short summary of the ticket" },
  { key: "description", label: "Description", required: false, example: "Steps to reproduce...", note: "Full description (can be multi-line)" },
  { key: "status",      label: "Status",      required: false, example: "todo",        note: "todo | backlog | in_progress | in_review | done | cancelled" },
  { key: "priority",    label: "Priority",    required: false, example: "medium",      note: "critical | high | medium | low" },
  { key: "type",        label: "Type",        required: false, example: "bug",         note: "bug | feature | task | improvement | question" },
  { key: "assignee",    label: "Assignee",    required: false, example: "Alice",       note: "Name of the person assigned" },
  { key: "reporter",    label: "Reporter",    required: false, example: "Bob",         note: "Name of the person who reported it" },
  { key: "labels",      label: "Labels",      required: false, example: "ui,auth",     note: "Comma-separated list of labels" },
  { key: "dueAt",       label: "Due Date",    required: false, example: "2025-12-31",  note: "ISO date YYYY-MM-DD or blank" },
  { key: "notes",       label: "Notes",       required: false, example: "See Slack thread", note: "Internal notes" },
] as const;

export type ColumnKey = typeof TICKET_COLUMNS[number]["key"];

// ── Export ────────────────────────────────────────────────────────────────────

function ticketToRow(ticket: Ticket): Record<string, string> {
  return {
    ID:           ticket.id,
    "Project Key": ticket.projectKey,
    Title:        ticket.title,
    Description:  ticket.description ?? "",
    Status:       ticket.status,
    Priority:     ticket.priority,
    Type:         ticket.type,
    Assignee:     ticket.assignee ?? "",
    Reporter:     ticket.reporter ?? "",
    Labels:       (ticket.labels ?? []).join(","),
    "Due Date":   ticket.dueAt ?? "",
    Notes:        ticket.notes ?? "",
    "Created At": ticket.createdAt,
    "Updated At": ticket.updatedAt,
  };
}

export function exportToCSV(tickets: Ticket[], filename = "localticket-export.csv"): void {
  const rows = tickets.map(ticketToRow);
  if (rows.length === 0) {
    rows.push(Object.fromEntries(Object.keys(ticketToRow({} as Ticket)).map((k) => [k, ""])));
  }
  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  downloadBlob(csv, filename, "text/csv;charset=utf-8;");
}

export function exportToExcel(tickets: Ticket[], projectName: string, filename = "localticket-export.xlsx"): void {
  const wb = XLSX.utils.book_new();
  const rows = tickets.map(ticketToRow);
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
  // Column widths
  ws["!cols"] = [
    { wch: 12 }, { wch: 12 }, { wch: 40 }, { wch: 50 }, { wch: 14 },
    { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 20 },
    { wch: 14 }, { wch: 30 }, { wch: 22 }, { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, projectName.slice(0, 31));
  XLSX.writeFile(wb, filename);
}

export function exportAllProjectsToExcel(data: AppData, filename = "localticket-all-projects.xlsx"): void {
  const wb = XLSX.utils.book_new();
  for (const project of data.projects) {
    const tickets = data.tickets.filter((t) => t.projectKey === project.key);
    const rows = tickets.map(ticketToRow);
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
    ws["!cols"] = [
      { wch: 12 }, { wch: 12 }, { wch: 40 }, { wch: 50 }, { wch: 14 },
      { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 20 },
      { wch: 14 }, { wch: 30 }, { wch: 22 }, { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, project.name.slice(0, 31));
  }
  XLSX.writeFile(wb, filename);
}

// ── Template ──────────────────────────────────────────────────────────────────

const TEMPLATE_ROWS = [
  {
    ID: "",
    "Project Key": "PROJ",
    Title: "Fix login bug on Safari",
    Description: "The login form throws a TypeError on Safari 16.",
    Status: "todo",
    Priority: "high",
    Type: "bug",
    Assignee: "Alice",
    Reporter: "Bob",
    Labels: "safari,auth",
    "Due Date": "2025-12-31",
    Notes: "Reproduced on macOS Ventura",
    "Created At": "",
    "Updated At": "",
  },
  {
    ID: "",
    "Project Key": "PROJ",
    Title: "Add dark mode support",
    Description: "Implement a dark theme toggle using CSS variables.",
    Status: "backlog",
    Priority: "medium",
    Type: "feature",
    Assignee: "",
    Reporter: "Alice",
    Labels: "ui,accessibility",
    "Due Date": "",
    Notes: "",
    "Created At": "",
    "Updated At": "",
  },
  {
    ID: "",
    "Project Key": "PROJ",
    Title: "Write API documentation",
    Description: "Document all REST endpoints using OpenAPI spec.",
    Status: "in_progress",
    Priority: "low",
    Type: "task",
    Assignee: "Bob",
    Reporter: "Alice",
    Labels: "docs",
    "Due Date": "2026-01-15",
    Notes: "See Confluence for existing docs",
    "Created At": "",
    "Updated At": "",
  },
];

export function downloadCSVTemplate(filename = "localticket-import-template.csv"): void {
  const ws = XLSX.utils.json_to_sheet(TEMPLATE_ROWS);
  const csv = XLSX.utils.sheet_to_csv(ws);
  downloadBlob(csv, filename, "text/csv;charset=utf-8;");
}

export function downloadExcelTemplate(filename = "localticket-import-template.xlsx"): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Template data
  const ws = XLSX.utils.json_to_sheet(TEMPLATE_ROWS);
  ws["!cols"] = [
    { wch: 12 }, { wch: 12 }, { wch: 40 }, { wch: 50 }, { wch: 14 },
    { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 20 },
    { wch: 14 }, { wch: 30 }, { wch: 22 }, { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Tickets");

  // Sheet 2: Column reference
  const refRows = TICKET_COLUMNS.map((c) => ({
    Column:   c.label,
    Required: c.required ? "Yes" : "No",
    Example:  c.example,
    Notes:    c.note,
  }));
  const refWs = XLSX.utils.json_to_sheet(refRows);
  refWs["!cols"] = [{ wch: 16 }, { wch: 10 }, { wch: 30 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, refWs, "Column Reference");

  // Sheet 3: Valid values
  const validRows = [
    { Field: "Status",   ValidValues: "todo, backlog, in_progress, in_review, done, cancelled" },
    { Field: "Priority", ValidValues: "critical, high, medium, low" },
    { Field: "Type",     ValidValues: "bug, feature, task, improvement, question" },
    { Field: "Labels",   ValidValues: "Any comma-separated strings, e.g. ui,auth,backend" },
    { Field: "Due Date", ValidValues: "ISO date format: YYYY-MM-DD, e.g. 2025-12-31. Leave blank for no due date." },
  ];
  const validWs = XLSX.utils.json_to_sheet(validRows);
  validWs["!cols"] = [{ wch: 12 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(wb, validWs, "Valid Values");

  XLSX.writeFile(wb, filename);
}

// ── Import ────────────────────────────────────────────────────────────────────

export interface ImportResult {
  tickets: Partial<Ticket>[];
  errors: { row: number; message: string }[];
  warnings: { row: number; message: string }[];
}

const VALID_STATUSES = new Set(["todo", "backlog", "in_progress", "in_review", "done", "cancelled"]);
const VALID_PRIORITIES = new Set(["critical", "high", "medium", "low"]);
const VALID_TYPES = new Set(["bug", "feature", "task", "improvement", "question"]);

function normalise(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, "_");
}

function parseRow(
  row: Record<string, string>,
  rowIndex: number,
  existingTickets: Ticket[],
  projectKeys: Set<string>
): { ticket: Partial<Ticket> | null; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Flexible column name matching (case-insensitive, normalised)
  const get = (keys: string[]): string => {
    for (const k of keys) {
      const found = Object.keys(row).find((rk) => normalise(rk) === normalise(k));
      if (found !== undefined) return (row[found] ?? "").trim();
    }
    return "";
  };

  const projectKey = get(["project key", "projectkey", "project"]).toUpperCase();
  const title = get(["title", "summary", "name"]);

  if (!title) { errors.push("Title is required"); }
  if (!projectKey) { errors.push("Project Key is required"); }
  else if (!projectKeys.has(projectKey)) { warnings.push(`Project key "${projectKey}" not found — ticket will be skipped unless project is created`); }

  const rawStatus = normalise(get(["status"]));
  const status = VALID_STATUSES.has(rawStatus) ? rawStatus as Ticket["status"] : "todo";
  if (rawStatus && !VALID_STATUSES.has(rawStatus)) warnings.push(`Unknown status "${rawStatus}" — defaulting to "todo"`);

  const rawPriority = normalise(get(["priority"]));
  const priority = VALID_PRIORITIES.has(rawPriority) ? rawPriority as Ticket["priority"] : "medium";
  if (rawPriority && !VALID_PRIORITIES.has(rawPriority)) warnings.push(`Unknown priority "${rawPriority}" — defaulting to "medium"`);

  const rawType = normalise(get(["type"]));
  const type = VALID_TYPES.has(rawType) ? rawType as Ticket["type"] : "task";
  if (rawType && !VALID_TYPES.has(rawType)) warnings.push(`Unknown type "${rawType}" — defaulting to "task"`);

  const rawLabels = get(["labels", "tags"]);
  const labels = rawLabels ? rawLabels.split(",").map((l) => l.trim()).filter(Boolean) : [];

  const rawDue = get(["due date", "duedate", "due_at", "duat"]);
  let dueAt: string | undefined;
  if (rawDue) {
    const d = new Date(rawDue);
    if (isNaN(d.getTime())) warnings.push(`Invalid due date "${rawDue}" — ignored`);
    else dueAt = d.toISOString();
  }

  const now = new Date().toISOString();
  const rawCreatedAt = get(["created at", "createdat", "created_at"]);
  const rawUpdatedAt = get(["updated at", "updatedat", "updated_at"]);
  const createdAt = rawCreatedAt && !isNaN(new Date(rawCreatedAt).getTime()) ? new Date(rawCreatedAt).toISOString() : now;
  const updatedAt = rawUpdatedAt && !isNaN(new Date(rawUpdatedAt).getTime()) ? new Date(rawUpdatedAt).toISOString() : now;

  if (errors.length > 0) return { ticket: null, errors, warnings };

  const ticket: Partial<Ticket> = {
    projectKey,
    title,
    description: get(["description", "details", "body"]),
    status,
    priority,
    type,
    assignee: get(["assignee", "assigned to", "assigned_to"]),
    reporter: get(["reporter", "reported by", "reported_by"]),
    labels,
    dueAt,
    notes: get(["notes", "note", "internal notes"]),
    createdAt,
    updatedAt,
    comments: [],
  };

  return { ticket, errors: [], warnings };
}

export async function importFromFile(
  file: File,
  existingTickets: Ticket[],
  projects: Project[]
): Promise<ImportResult> {
  const projectKeys = new Set(projects.map((p) => p.key));
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName!];
  const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

  const tickets: Partial<Ticket>[] = [];
  const errors: { row: number; message: string }[] = [];
  const warnings: { row: number; message: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const { ticket, errors: rowErrors, warnings: rowWarnings } = parseRow(row, i + 2, existingTickets, projectKeys);
    rowErrors.forEach((msg) => errors.push({ row: i + 2, message: msg }));
    rowWarnings.forEach((msg) => warnings.push({ row: i + 2, message: msg }));
    if (ticket) tickets.push(ticket);
  }

  return { tickets, errors, warnings };
}

export function applyImport(
  importedTickets: Partial<Ticket>[],
  existingTickets: Ticket[],
  mode: "append" | "replace"
): Ticket[] {
  const now = new Date().toISOString();
  const newTickets: Ticket[] = importedTickets.map((t) => ({
    id: nanoid(8), // temporary; will be replaced by generateTicketId in context
    title: t.title ?? "Untitled",
    description: t.description ?? "",
    status: t.status ?? "todo",
    priority: t.priority ?? "medium",
    type: t.type ?? "task",
    labels: t.labels ?? [],
    assignee: t.assignee ?? "",
    reporter: t.reporter ?? "",
    projectKey: t.projectKey ?? "",
    createdAt: t.createdAt ?? now,
    updatedAt: t.updatedAt ?? now,
    comments: t.comments ?? [],
    dueAt: t.dueAt,
    notes: t.notes,
  }));

  if (mode === "replace") return newTickets;
  return [...existingTickets, ...newTickets];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
