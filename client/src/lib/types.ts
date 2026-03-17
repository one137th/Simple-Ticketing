/**
 * LocalTicket — Core Data Types
 * Design: Blueprint — Swiss grid, DM Sans + IBM Plex Mono, warm white + navy + amber
 */

export type TicketStatus = "backlog" | "todo" | "in_progress" | "in_review" | "done" | "cancelled";
export type TicketPriority = "critical" | "high" | "medium" | "low";
export type TicketType = "bug" | "feature" | "task" | "improvement" | "question";

export interface Comment {
  id: string;
  author: string;
  body: string;
  createdAt: string;
}

export interface Ticket {
  id: string;          // e.g. "PROJ-001"
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  type: TicketType;
  labels: string[];
  assignee: string;
  reporter: string;
  createdAt: string;
  updatedAt: string;
  comments: Comment[];
  projectKey: string;
}

export interface Project {
  key: string;         // e.g. "PROJ"
  name: string;
  description: string;
  createdAt: string;
  color: string;       // hex color for project badge
}

export interface AppData {
  version: string;
  projects: Project[];
  tickets: Ticket[];
  lastUpdated: string;
}

export const DEFAULT_DATA: AppData = {
  version: "1.0.0",
  projects: [],
  tickets: [],
  lastUpdated: new Date().toISOString(),
};

export const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; bgColor: string; dotColor: string }> = {
  backlog:     { label: "Backlog",     color: "text-slate-500",  bgColor: "bg-slate-100",   dotColor: "bg-slate-400" },
  todo:        { label: "To Do",       color: "text-blue-600",   bgColor: "bg-blue-50",     dotColor: "bg-blue-400" },
  in_progress: { label: "In Progress", color: "text-amber-600",  bgColor: "bg-amber-50",    dotColor: "bg-amber-400" },
  in_review:   { label: "In Review",   color: "text-purple-600", bgColor: "bg-purple-50",   dotColor: "bg-purple-400" },
  done:        { label: "Done",        color: "text-green-600",  bgColor: "bg-green-50",    dotColor: "bg-green-500" },
  cancelled:   { label: "Cancelled",   color: "text-red-500",    bgColor: "bg-red-50",      dotColor: "bg-red-400" },
};

export const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string; icon: string }> = {
  critical: { label: "Critical", color: "text-red-600",    icon: "⬆⬆" },
  high:     { label: "High",     color: "text-orange-500", icon: "⬆" },
  medium:   { label: "Medium",   color: "text-amber-500",  icon: "➡" },
  low:      { label: "Low",      color: "text-blue-400",   icon: "⬇" },
};

export const TYPE_CONFIG: Record<TicketType, { label: string; color: string }> = {
  bug:         { label: "Bug",         color: "text-red-500" },
  feature:     { label: "Feature",     color: "text-blue-600" },
  task:        { label: "Task",        color: "text-slate-600" },
  improvement: { label: "Improvement", color: "text-green-600" },
  question:    { label: "Question",    color: "text-purple-500" },
};

export const PROJECT_COLORS = [
  "#1e3a5f", "#2563eb", "#7c3aed", "#db2777",
  "#dc2626", "#d97706", "#16a34a", "#0891b2",
];
