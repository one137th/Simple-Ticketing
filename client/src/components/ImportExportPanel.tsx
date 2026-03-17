/**
 * ImportExportPanel — Import/Export UI for Settings
 * Supports CSV and Excel export, CSV/Excel import with validation, and template download
 */

import { useState, useRef } from "react";
import {
  Download, Upload, FileSpreadsheet, FileText, AlertTriangle,
  CheckCircle2, ChevronDown, ChevronUp, Info, RefreshCw
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import {
  exportToCSV,
  exportToExcel,
  exportAllProjectsToExcel,
  downloadCSVTemplate,
  downloadExcelTemplate,
  importFromFile,
  applyImport,
  type ImportResult,
} from "@/lib/importExport";
import { generateTicketId } from "@/lib/store";
import type { Ticket } from "@/lib/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ImportExportPanel() {
  const { data, selectedProjectKey, updateData } = useApp();
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importMode, setImportMode] = useState<"append" | "replace">("append");
  const [showErrors, setShowErrors] = useState(false);
  const [showWarnings, setShowWarnings] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [pendingTickets, setPendingTickets] = useState<Partial<Ticket>[] | null>(null);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const project = data?.projects.find((p) => p.key === selectedProjectKey);
  const currentTickets = data?.tickets.filter((t) => t.projectKey === selectedProjectKey) ?? [];
  const allTickets = data?.tickets ?? [];

  // ── Export ────────────────────────────────────────────────────────────────

  const handleExportCurrentCSV = () => {
    if (!project) { toast.error("Select a project first"); return; }
    exportToCSV(currentTickets, `${project.key.toLowerCase()}-tickets.csv`);
    toast.success(`Exported ${currentTickets.length} tickets to CSV`);
  };

  const handleExportCurrentExcel = () => {
    if (!project) { toast.error("Select a project first"); return; }
    exportToExcel(currentTickets, project.name, `${project.key.toLowerCase()}-tickets.xlsx`);
    toast.success(`Exported ${currentTickets.length} tickets to Excel`);
  };

  const handleExportAllExcel = () => {
    if (!data) return;
    exportAllProjectsToExcel(data);
    toast.success(`Exported all ${allTickets.length} tickets across ${data.projects.length} projects`);
  };

  // ── Template ──────────────────────────────────────────────────────────────

  const handleDownloadCSVTemplate = () => {
    downloadCSVTemplate();
    toast.success("CSV template downloaded");
  };

  const handleDownloadExcelTemplate = () => {
    downloadExcelTemplate();
    toast.success("Excel template downloaded (includes Column Reference and Valid Values sheets)");
  };

  // ── Import ────────────────────────────────────────────────────────────────

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !data) return;
    setIsImporting(true);
    setImportResult(null);
    setPendingTickets(null);
    setImportFileName(file.name);

    try {
      const result = await importFromFile(file, allTickets, data.projects);
      setImportResult(result);
      setPendingTickets(result.tickets);
      if (result.errors.length === 0) {
        toast.success(`Parsed ${result.tickets.length} tickets — review and confirm below`);
      } else {
        toast.warning(`Parsed with ${result.errors.length} error(s) — review before importing`);
      }
    } catch (err: any) {
      toast.error("Failed to parse file: " + (err?.message ?? "Unknown error"));
    } finally {
      setIsImporting(false);
      // Reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleConfirmImport = () => {
    if (!pendingTickets || !data) return;

    // Assign proper ticket IDs
    const ticketsWithIds: Ticket[] = pendingTickets.map((t) => {
      const projectKey = t.projectKey ?? selectedProjectKey ?? "";
      const allProjectTickets = [
        ...(importMode === "replace"
          ? data.tickets.filter((x) => x.projectKey !== projectKey)
          : data.tickets),
      ];
      const id = generateTicketId(projectKey, allProjectTickets);
      // Push to allProjectTickets so next ticket gets incremented ID
      const ticket: Ticket = {
        id,
        title: t.title ?? "Untitled",
        description: t.description ?? "",
        status: t.status ?? "todo",
        priority: t.priority ?? "medium",
        type: t.type ?? "task",
        labels: t.labels ?? [],
        assignee: t.assignee ?? "",
        reporter: t.reporter ?? "",
        projectKey,
        createdAt: t.createdAt ?? new Date().toISOString(),
        updatedAt: t.updatedAt ?? new Date().toISOString(),
        comments: t.comments ?? [],
        dueAt: t.dueAt,
        notes: t.notes,
      };
      allProjectTickets.push(ticket);
      return ticket;
    });

    let newTickets: Ticket[];
    if (importMode === "replace") {
      newTickets = [
        ...data.tickets.filter((t) => t.projectKey !== selectedProjectKey),
        ...ticketsWithIds,
      ];
    } else {
      newTickets = [...data.tickets, ...ticketsWithIds];
    }

    updateData({ ...data, tickets: newTickets });
    toast.success(
      importMode === "replace"
        ? `Replaced ${currentTickets.length} tickets with ${ticketsWithIds.length} imported tickets`
        : `Imported ${ticketsWithIds.length} tickets into ${project?.name ?? selectedProjectKey}`
    );
    setImportResult(null);
    setPendingTickets(null);
    setImportFileName(null);
  };

  const handleCancelImport = () => {
    setImportResult(null);
    setPendingTickets(null);
    setImportFileName(null);
  };

  return (
    <div className="space-y-6">

      {/* ── Export ──────────────────────────────────────────────────────────── */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-1">Export</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Download tickets as CSV or Excel. The current project exports only that project's tickets;
          "All Projects" creates one sheet per project.
        </p>

        <div className="grid grid-cols-1 gap-2">
          {/* Current project */}
          {project && (
            <div className="rounded-lg border border-border p-3 bg-card">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: project.color }}
                />
                <span className="text-xs font-medium text-foreground">{project.name}</span>
                <span className="text-xs text-muted-foreground font-mono">({currentTickets.length} tickets)</span>
              </div>
              <div className="flex gap-2">
                <ExportButton
                  icon={<FileText className="w-3.5 h-3.5" />}
                  label="Export CSV"
                  onClick={handleExportCurrentCSV}
                  disabled={currentTickets.length === 0}
                />
                <ExportButton
                  icon={<FileSpreadsheet className="w-3.5 h-3.5" />}
                  label="Export Excel"
                  onClick={handleExportCurrentExcel}
                  disabled={currentTickets.length === 0}
                />
              </div>
            </div>
          )}

          {/* All projects */}
          {data && data.projects.length > 1 && (
            <div className="rounded-lg border border-border p-3 bg-card">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-foreground">All Projects</span>
                <span className="text-xs text-muted-foreground font-mono">({allTickets.length} tickets, {data.projects.length} sheets)</span>
              </div>
              <ExportButton
                icon={<FileSpreadsheet className="w-3.5 h-3.5" />}
                label="Export All to Excel"
                onClick={handleExportAllExcel}
                disabled={allTickets.length === 0}
              />
            </div>
          )}
        </div>
      </section>

      {/* ── Templates ───────────────────────────────────────────────────────── */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-1">Import Templates</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Download a template file to see the expected column format. The Excel template includes
          a <strong>Column Reference</strong> sheet and a <strong>Valid Values</strong> sheet.
        </p>
        <div className="flex gap-2">
          <ExportButton
            icon={<FileText className="w-3.5 h-3.5" />}
            label="Download CSV Template"
            onClick={handleDownloadCSVTemplate}
            variant="secondary"
          />
          <ExportButton
            icon={<FileSpreadsheet className="w-3.5 h-3.5" />}
            label="Download Excel Template"
            onClick={handleDownloadExcelTemplate}
            variant="secondary"
          />
        </div>
        <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>The template includes example rows. Remove them before importing your real data.</span>
        </div>
      </section>

      {/* ── Import ──────────────────────────────────────────────────────────── */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-1">Import</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Import tickets from a CSV or Excel file. Columns are matched by name (case-insensitive).
          The <strong>Project Key</strong> column must match an existing project.
        </p>

        {/* Import mode */}
        <div className="flex gap-2 mb-3">
          {(["append", "replace"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setImportMode(mode)}
              className={cn(
                "flex-1 py-1.5 px-3 rounded-md text-xs font-medium border transition-colors",
                importMode === mode
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:bg-secondary/60"
              )}
            >
              {mode === "append" ? "Append to existing" : "Replace current project"}
            </button>
          ))}
        </div>

        {importMode === "replace" && (
          <div className="mb-3 flex items-start gap-1.5 p-2.5 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-400">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>Replace mode will <strong>delete all existing tickets</strong> in the current project before importing.</span>
          </div>
        )}

        {/* File picker */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting || !selectedProjectKey}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border-2 border-dashed border-border hover:border-primary/40 hover:bg-secondary/30 transition-colors text-sm text-muted-foreground",
            isImporting && "opacity-60 cursor-not-allowed",
            !selectedProjectKey && "opacity-40 cursor-not-allowed"
          )}
        >
          {isImporting
            ? <><RefreshCw className="w-4 h-4 animate-spin" /> Parsing file…</>
            : <><Upload className="w-4 h-4" /> Click to select CSV or Excel file</>
          }
        </button>
        {!selectedProjectKey && (
          <p className="text-xs text-muted-foreground mt-1.5 text-center">Select a project in the sidebar first</p>
        )}

        {/* Import preview */}
        {importResult && pendingTickets && (
          <div className="mt-4 rounded-lg border border-border overflow-hidden">
            {/* Header */}
            <div className="px-3 py-2.5 bg-secondary/40 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-xs font-semibold text-foreground">
                  {importFileName} — {pendingTickets.length} tickets ready to import
                </span>
              </div>
            </div>

            {/* Errors */}
            {importResult.errors.length > 0 && (
              <div className="border-b border-border">
                <button
                  onClick={() => setShowErrors((v) => !v)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
                >
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {importResult.errors.length} row(s) skipped due to errors
                  </span>
                  {showErrors ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {showErrors && (
                  <div className="px-3 pb-2 space-y-1">
                    {importResult.errors.map((e, i) => (
                      <p key={i} className="text-xs text-red-600 dark:text-red-400">Row {e.row}: {e.message}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Warnings */}
            {importResult.warnings.length > 0 && (
              <div className="border-b border-border">
                <button
                  onClick={() => setShowWarnings((v) => !v)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                >
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {importResult.warnings.length} warning(s)
                  </span>
                  {showWarnings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {showWarnings && (
                  <div className="px-3 pb-2 space-y-1">
                    {importResult.warnings.map((w, i) => (
                      <p key={i} className="text-xs text-amber-600 dark:text-amber-400">Row {w.row}: {w.message}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Preview table */}
            <div className="overflow-x-auto max-h-48">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-secondary/30">
                    {["Project", "Title", "Status", "Priority", "Type", "Assignee"].map((h) => (
                      <th key={h} className="px-2 py-1.5 text-left font-medium text-muted-foreground border-b border-border whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pendingTickets.slice(0, 20).map((t, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-secondary/20">
                      <td className="px-2 py-1 font-mono text-muted-foreground">{t.projectKey}</td>
                      <td className="px-2 py-1 max-w-[200px] truncate">{t.title}</td>
                      <td className="px-2 py-1 text-muted-foreground">{t.status}</td>
                      <td className="px-2 py-1 text-muted-foreground">{t.priority}</td>
                      <td className="px-2 py-1 text-muted-foreground">{t.type}</td>
                      <td className="px-2 py-1 text-muted-foreground">{t.assignee}</td>
                    </tr>
                  ))}
                  {pendingTickets.length > 20 && (
                    <tr>
                      <td colSpan={6} className="px-2 py-1.5 text-center text-muted-foreground italic">
                        …and {pendingTickets.length - 20} more
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Confirm / Cancel */}
            <div className="flex gap-2 p-3 bg-secondary/20 border-t border-border">
              <button
                onClick={handleConfirmImport}
                className="flex-1 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
              >
                Confirm Import ({pendingTickets.length} tickets)
              </button>
              <button
                onClick={handleCancelImport}
                className="px-3 py-1.5 rounded-md border border-border text-xs text-foreground hover:bg-secondary/60 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function ExportButton({
  icon, label, onClick, disabled, variant = "default",
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "secondary";
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
        variant === "default"
          ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
          : "bg-background text-foreground border-border hover:bg-secondary/60",
        disabled && "opacity-40 cursor-not-allowed"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
