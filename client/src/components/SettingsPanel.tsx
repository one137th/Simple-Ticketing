/**
 * SettingsPanel — File management, project settings, export
 * Design: Blueprint
 */

import { useState } from "react";
import { X, FolderOpen, FilePlus, Download, Trash2, Edit2, Check, AlertTriangle } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { PROJECT_COLORS } from "@/lib/types";
import { formatDateTime } from "@/lib/dateUtils";
import { toast } from "sonner";

interface Props {
  onClose: () => void;
}

export default function SettingsPanel({ onClose }: Props) {
  const {
    data, fileName, fileMode,
    handleOpenFile, handleCreateFile,
    updateProject, deleteProject,
    selectedProjectKey, setSelectedProjectKey,
  } = useApp();

  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editColor, setEditColor] = useState("");
  const [confirmDeleteProject, setConfirmDeleteProject] = useState<string | null>(null);

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

  const startEditProject = (key: string) => {
    const p = projects.find((x) => x.key === key);
    if (!p) return;
    setEditName(p.name);
    setEditDesc(p.description);
    setEditColor(p.color);
    setEditingProject(key);
  };

  const saveEditProject = async () => {
    if (!editingProject) return;
    await updateProject(editingProject, { name: editName, description: editDesc, color: editColor });
    setEditingProject(null);
    toast.success("Project updated");
  };

  const handleDeleteProject = async (key: string) => {
    if (confirmDeleteProject !== key) {
      setConfirmDeleteProject(key);
      return;
    }
    await deleteProject(key);
    setConfirmDeleteProject(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/20" onClick={onClose} />

      {/* Panel */}
      <div className="w-[480px] bg-card border-l border-border flex flex-col h-screen overflow-hidden shadow-xl slide-over-enter">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <h2 className="font-semibold text-sm text-foreground">Settings & Export</h2>
          <button onClick={onClose} className="ml-auto p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* File section */}
          <section className="px-4 py-4 border-b border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Data File</h3>

            <div className="bg-secondary/50 rounded-lg p-3 mb-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Current:</span>
                <span className="font-mono font-medium text-foreground truncate">{fileName ?? "None"}</span>
                {fileMode === "localStorage" && (
                  <span className="ml-auto text-amber-600 font-semibold">localStorage</span>
                )}
              </div>
              {data && (
                <div className="mt-1 text-muted-foreground">
                  Last updated: {formatDateTime(data.lastUpdated)} · {tickets.length} tickets · {projects.length} projects
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleOpenFile} className="text-xs gap-1.5 flex-1">
                <FolderOpen className="w-3.5 h-3.5" />
                Open File
              </Button>
              <Button variant="outline" size="sm" onClick={handleCreateFile} className="text-xs gap-1.5 flex-1">
                <FilePlus className="w-3.5 h-3.5" />
                New File
              </Button>
            </div>
          </section>

          {/* Export section */}
          <section className="px-4 py-4 border-b border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Export</h3>
            <Button variant="outline" size="sm" onClick={handleExport} className="text-xs gap-1.5">
              <Download className="w-3.5 h-3.5" />
              Download JSON Export
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Downloads a copy of all data as a JSON file — useful for backups or sharing with AI agents.
            </p>
          </section>

          {/* Projects section */}
          <section className="px-4 py-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Projects</h3>

            <div className="space-y-2">
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
                      <button
                        onClick={() => isEditing ? setEditingProject(null) : startEditProject(project.key)}
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteProject(project.key)}
                        className={cn(
                          "p-1 rounded transition-colors",
                          confirmDeleteProject === project.key
                            ? "text-destructive bg-destructive/10"
                            : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        )}
                        title={confirmDeleteProject === project.key ? "Click again to confirm" : "Delete project"}
                      >
                        {confirmDeleteProject === project.key
                          ? <AlertTriangle className="w-3 h-3" />
                          : <Trash2 className="w-3 h-3" />
                        }
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
                              <button
                                key={c}
                                onClick={() => setEditColor(c)}
                                className={cn(
                                  "w-6 h-6 rounded-full border-2 transition-all",
                                  editColor === c ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                                )}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveEditProject} className="h-7 text-xs gap-1">
                            <Check className="w-3 h-3" /> Save
                          </Button>
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
          </section>

          {/* JSON Schema info */}
          <section className="px-4 py-4 border-t border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">JSON Schema</h3>
            <p className="text-xs text-muted-foreground mb-2">
              The data file follows this structure — AI agents can read and write it directly:
            </p>
            <pre className="text-xs bg-secondary/50 rounded-md p-3 overflow-x-auto font-mono text-foreground/70 leading-relaxed">
{`{
  "version": "1.0.0",
  "projects": [{ "key", "name", "description",
    "color", "createdAt" }],
  "tickets": [{
    "id",        // e.g. "PROJ-001"
    "title", "description",
    "status",    // backlog|todo|in_progress|
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
          </section>
        </div>
      </div>
    </div>
  );
}
