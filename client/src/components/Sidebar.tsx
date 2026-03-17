/**
 * Sidebar — Project navigation + status filters
 * Design: Blueprint — 240px fixed, warm gray bg, navy active state
 */

import { useState } from "react";
import { Plus, Ticket, LayoutGrid, List, ChevronDown, ChevronRight, FolderOpen, Settings, Save, Bot, Sun, Moon, Monitor } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { STATUS_CONFIG } from "@/lib/types";
import type { TicketStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/useTheme";
import NewProjectDialog from "./NewProjectDialog";

interface SidebarProps {
  view: "list" | "board";
  onViewChange: (v: "list" | "board") => void;
  statusFilter: TicketStatus | null;
  onStatusFilter: (s: TicketStatus | null) => void;
  onOpenSettings: () => void;
  onOpenAgentSetup?: () => void;
}

export default function Sidebar({ view, onViewChange, statusFilter, onStatusFilter, onOpenSettings, onOpenAgentSetup = () => {} }: SidebarProps) {
  const { data, selectedProjectKey, setSelectedProjectKey, isSaving, fileName, fileMode } = useApp();
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [statusOpen, setStatusOpen] = useState(true);
  const [showNewProject, setShowNewProject] = useState(false);
  const { resolvedTheme, toggleTheme } = useTheme();

  const projects = data?.projects ?? [];
  const tickets = data?.tickets ?? [];

  const statusCounts = Object.keys(STATUS_CONFIG).reduce((acc, s) => {
    const status = s as TicketStatus;
    acc[status] = tickets.filter(
      (t) => t.projectKey === selectedProjectKey && t.status === status
    ).length;
    return acc;
  }, {} as Record<TicketStatus, number>);

  return (
    <>
      <aside className="w-60 flex-shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col h-screen overflow-hidden">
        {/* Brand header */}
        <div className="px-4 py-4 border-b border-sidebar-border flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <Ticket className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="font-bold text-sm text-foreground tracking-tight">LocalTicket</span>
          {isSaving && (
            <span className="ml-auto">
              <Save className="w-3 h-3 text-muted-foreground animate-pulse" />
            </span>
          )}
        </div>

        {/* File indicator */}
        <div className="px-4 py-2 border-b border-sidebar-border">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <FolderOpen className="w-3 h-3 flex-shrink-0" />
            <span className="truncate font-mono" title={fileName ?? ""}>
              {fileName ?? "No file"}
            </span>
            {fileMode === "localStorage" && (
              <span className="ml-auto text-amber-600 font-medium">LS</span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {/* View toggle */}
          <div className="px-3 mb-2">
            <div className="flex rounded-md overflow-hidden border border-border">
              <button
                onClick={() => onViewChange("list")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium transition-colors",
                  view === "list"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="w-3 h-3" />
                List
              </button>
              <button
                onClick={() => onViewChange("board")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium transition-colors",
                  view === "board"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="w-3 h-3" />
                Board
              </button>
            </div>
          </div>

          {/* Projects section */}
          <div className="px-3 mt-3">
            <button
              onClick={() => setProjectsOpen((v) => !v)}
              className="w-full flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider py-1 hover:text-foreground transition-colors"
            >
              {projectsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Projects
              <button
                onClick={(e) => { e.stopPropagation(); setShowNewProject(true); }}
                className="ml-auto p-0.5 rounded hover:bg-sidebar-accent transition-colors"
                title="New project"
              >
                <Plus className="w-3 h-3" />
              </button>
            </button>

            {projectsOpen && (
              <div className="mt-1 space-y-0.5">
                {projects.length === 0 && (
                  <p className="text-xs text-muted-foreground px-2 py-1">No projects yet</p>
                )}
                {projects.map((project) => {
                  const count = tickets.filter((t) => t.projectKey === project.key).length;
                  const isActive = selectedProjectKey === project.key;
                  return (
                    <button
                      key={project.key}
                      onClick={() => setSelectedProjectKey(project.key)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors text-left",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground hover:bg-sidebar-accent"
                      )}
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: project.color }}
                      />
                      <span className="truncate flex-1 font-medium text-xs">{project.name}</span>
                      <span className={cn(
                        "text-xs font-mono px-1 rounded",
                        isActive ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Status filter */}
          {selectedProjectKey && (
            <div className="px-3 mt-4">
              <button
                onClick={() => setStatusOpen((v) => !v)}
                className="w-full flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider py-1 hover:text-foreground transition-colors"
              >
                {statusOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                Filter by Status
              </button>

              {statusOpen && (
                <div className="mt-1 space-y-0.5">
                  <button
                    onClick={() => onStatusFilter(null)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors text-left",
                      statusFilter === null
                        ? "bg-sidebar-accent text-foreground font-medium"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                    )}
                  >
                    <span className="w-2 h-2 rounded-full bg-slate-300" />
                    All
                    <span className="ml-auto font-mono text-xs">{tickets.filter(t => t.projectKey === selectedProjectKey).length}</span>
                  </button>
                  {(Object.entries(STATUS_CONFIG) as [TicketStatus, typeof STATUS_CONFIG[TicketStatus]][]).map(([status, cfg]) => (
                    <button
                      key={status}
                      onClick={() => onStatusFilter(status)}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors text-left",
                        statusFilter === status
                          ? "bg-sidebar-accent text-foreground font-medium"
                          : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                      )}
                    >
                      <span className={cn("w-2 h-2 rounded-full", cfg.dotColor)} />
                      {cfg.label}
                      <span className="ml-auto font-mono text-xs">{statusCounts[status]}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-sidebar-border px-3 py-3 space-y-0.5">
          <button
            onClick={onOpenAgentSetup}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-700 transition-colors font-medium"
          >
            <Bot className="w-3.5 h-3.5" />
            AI Agent Setup
          </button>
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            Settings & Export
          </button>
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
            title={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {resolvedTheme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
          </button>
        </div>
      </aside>

      <NewProjectDialog open={showNewProject} onClose={() => setShowNewProject(false)} />
    </>
  );
}
