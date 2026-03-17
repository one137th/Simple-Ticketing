/**
 * TicketList — Main list view with sortable table + bulk selection
 * Design: Blueprint — dense table, 1px separators, sticky header, bulk action bar
 */

import { useState, useMemo, useCallback } from "react";
import { Plus, Search, SortAsc, SortDesc, ArrowUpDown } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import type { Ticket, TicketStatus, TicketPriority } from "@/lib/types";
import { STATUS_CONFIG, PRIORITY_CONFIG } from "@/lib/types";
import TicketRow from "./TicketRow";
import BulkActionBar from "./BulkActionBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import NewTicketDialog from "./NewTicketDialog";

type SortKey = "id" | "title" | "status" | "priority" | "updatedAt" | "createdAt";

interface Props {
  statusFilter: TicketStatus | null;
  onSelectTicket: (id: string) => void;
  selectedTicketId: string | null;
}

const PRIORITY_ORDER: Record<TicketPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const STATUS_ORDER: Record<TicketStatus, number> = {
  in_progress: 0, in_review: 1, todo: 2, backlog: 3, done: 4, cancelled: 5,
};

export default function TicketList({ statusFilter, onSelectTicket, selectedTicketId }: Props) {
  const { data, selectedProjectKey } = useApp();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showNewTicket, setShowNewTicket] = useState(false);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const project = data?.projects.find((p) => p.key === selectedProjectKey);

  const tickets = useMemo(() => {
    let list = (data?.tickets ?? []).filter((t) => t.projectKey === selectedProjectKey);

    if (statusFilter) {
      list = list.filter((t) => t.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.assignee.toLowerCase().includes(q) ||
          t.labels.some((l) => l.toLowerCase().includes(q))
      );
    }

    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "id":    cmp = a.id.localeCompare(b.id); break;
        case "title": cmp = a.title.localeCompare(b.title); break;
        case "status":   cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]; break;
        case "priority": cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]; break;
        case "updatedAt": cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(); break;
        case "createdAt": cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [data, selectedProjectKey, statusFilter, search, sortKey, sortDir]);

  // Clear selection when project/filter changes
  useMemo(() => { setSelectedIds(new Set()); }, [selectedProjectKey, statusFilter]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  // ── Bulk selection helpers ────────────────────────────────────────────────

  const toggleSelect = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const allVisibleSelected =
    tickets.length > 0 && tickets.every((t) => selectedIds.has(t.id));

  const someSelected = selectedIds.size > 0 && !allVisibleSelected;

  const toggleSelectAll = useCallback(() => {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tickets.map((t) => t.id)));
    }
  }, [allVisibleSelected, tickets]);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(tickets.map((t) => t.id)));
  }, [tickets]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    return sortDir === "asc"
      ? <SortAsc className="w-3 h-3 text-primary" />
      : <SortDesc className="w-3 h-3 text-primary" />;
  };

  if (!selectedProjectKey) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Select or create a project to get started
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background sticky top-0 z-10">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {project && (
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: project.color }}
              />
            )}
            <h2 className="font-semibold text-sm text-foreground truncate">
              {project?.name ?? selectedProjectKey}
            </h2>
            {statusFilter && (
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0",
                STATUS_CONFIG[statusFilter].bgColor,
                STATUS_CONFIG[statusFilter].color
              )}>
                {STATUS_CONFIG[statusFilter].label}
              </span>
            )}
            <span className="text-xs text-muted-foreground font-mono flex-shrink-0">
              {tickets.length} ticket{tickets.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="relative w-52 flex-shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search tickets…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); clearSelection(); }}
              className="pl-8 h-8 text-xs"
            />
          </div>

          <Button size="sm" onClick={() => setShowNewTicket(true)} className="h-8 text-xs gap-1.5 flex-shrink-0">
            <Plus className="w-3.5 h-3.5" />
            New Ticket
          </Button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
              <p className="text-sm">
                {search ? "No tickets match your search" : "No tickets yet"}
              </p>
              {!search && (
                <Button variant="outline" size="sm" onClick={() => setShowNewTicket(true)} className="text-xs gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  Create first ticket
                </Button>
              )}
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border bg-secondary/40">
                  {/* Checkbox column */}
                  <th className="pl-3 pr-1 py-2 w-8">
                    <div
                      onClick={toggleSelectAll}
                      className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-colors flex-shrink-0",
                        allVisibleSelected
                          ? "bg-primary border-primary"
                          : someSelected
                          ? "bg-primary/30 border-primary"
                          : "border-border hover:border-primary/60 bg-card"
                      )}
                      title={allVisibleSelected ? "Deselect all" : "Select all"}
                    >
                      {allVisibleSelected && (
                        <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" viewBox="0 0 12 12">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      {someSelected && !allVisibleSelected && (
                        <svg className="w-2.5 h-2.5 text-primary" fill="none" viewBox="0 0 12 12">
                          <path d="M2.5 6h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      )}
                    </div>
                  </th>

                  <th className="pl-2 pr-2 py-2 text-left w-28">
                    <button onClick={() => handleSort("id")} className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground">
                      ID <SortIcon k="id" />
                    </button>
                  </th>
                  <th className="px-2 py-2 text-left hidden sm:table-cell">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</span>
                  </th>
                  <th className="px-2 py-2 text-left">
                    <button onClick={() => handleSort("title")} className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground">
                      Title <SortIcon k="title" />
                    </button>
                  </th>
                  <th className="px-2 py-2 text-left hidden md:table-cell">
                    <button onClick={() => handleSort("status")} className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground">
                      Status <SortIcon k="status" />
                    </button>
                  </th>
                  <th className="px-2 py-2 text-left hidden lg:table-cell">
                    <button onClick={() => handleSort("priority")} className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground">
                      Priority <SortIcon k="priority" />
                    </button>
                  </th>
                  <th className="px-2 py-2 text-left hidden lg:table-cell">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Assignee</span>
                  </th>
                  <th className="px-2 py-2 text-left hidden xl:table-cell">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Comments</span>
                  </th>
                  <th className="pr-4 pl-2 py-2 text-left hidden xl:table-cell">
                    <button onClick={() => handleSort("updatedAt")} className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground">
                      Updated <SortIcon k="updatedAt" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tickets.map((ticket) => (
                  <TicketRow
                    key={ticket.id}
                    ticket={ticket}
                    isSelected={selectedTicketId === ticket.id}
                    isChecked={selectedIds.has(ticket.id)}
                    onCheck={(e) => toggleSelect(ticket.id, e)}
                    onClick={() => {
                      // If in bulk-select mode, clicking a row toggles it
                      if (selectedIds.size > 0) {
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(ticket.id)) next.delete(ticket.id);
                          else next.add(ticket.id);
                          return next;
                        });
                      } else {
                        onSelectTicket(ticket.id);
                      }
                    }}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <BulkActionBar
            selectedIds={Array.from(selectedIds)}
            totalVisible={tickets.length}
            onSelectAll={selectAll}
            onClearSelection={clearSelection}
          />
        )}
      </div>

      <NewTicketDialog
        open={showNewTicket}
        onClose={() => setShowNewTicket(false)}
        projectKey={selectedProjectKey}
      />
    </>
  );
}
