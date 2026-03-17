/**
 * FilterBar — Keyword search + quick-filter chips for the ticket list
 * Design: Blueprint — compact toolbar, pill chips, clear affordances
 */

import { useRef, useState } from "react";
import { Search, X, ChevronDown, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_CONFIG, PRIORITY_CONFIG, TYPE_CONFIG } from "@/lib/types";
import type { TicketStatus, TicketPriority, TicketType } from "@/lib/types";

export interface FilterState {
  query: string;
  statuses: TicketStatus[];
  priorities: TicketPriority[];
  types: TicketType[];
  assignees: string[];
}

export const EMPTY_FILTERS: FilterState = {
  query: "",
  statuses: [],
  priorities: [],
  types: [],
  assignees: [],
};

export function hasActiveFilters(f: FilterState) {
  return (
    f.query.trim() !== "" ||
    f.statuses.length > 0 ||
    f.priorities.length > 0 ||
    f.types.length > 0 ||
    f.assignees.length > 0
  );
}

interface Props {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  availableAssignees: string[];
}

type DropdownType = "status" | "priority" | "type" | "assignee" | null;

export default function FilterBar({ filters, onChange, availableAssignees }: Props) {
  const [openDropdown, setOpenDropdown] = useState<DropdownType>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const active = hasActiveFilters(filters);
  const activeCount =
    filters.statuses.length +
    filters.priorities.length +
    filters.types.length +
    filters.assignees.length;

  const setQuery = (query: string) => onChange({ ...filters, query });
  const clearAll = () => { onChange(EMPTY_FILTERS); setOpenDropdown(null); };

  const toggleStatus = (s: TicketStatus) =>
    onChange({
      ...filters,
      statuses: filters.statuses.includes(s)
        ? filters.statuses.filter((x) => x !== s)
        : [...filters.statuses, s],
    });

  const togglePriority = (p: TicketPriority) =>
    onChange({
      ...filters,
      priorities: filters.priorities.includes(p)
        ? filters.priorities.filter((x) => x !== p)
        : [...filters.priorities, p],
    });

  const toggleType = (t: TicketType) =>
    onChange({
      ...filters,
      types: filters.types.includes(t)
        ? filters.types.filter((x) => x !== t)
        : [...filters.types, t],
    });

  const toggleAssignee = (a: string) =>
    onChange({
      ...filters,
      assignees: filters.assignees.includes(a)
        ? filters.assignees.filter((x) => x !== a)
        : [...filters.assignees, a],
    });

  const toggle = (type: DropdownType) =>
    setOpenDropdown((prev) => (prev === type ? null : type));

  return (
    <div className="flex flex-col gap-0">
      {/* Main toolbar row */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-background">
        {/* Search input */}
        <div className="relative flex-1 min-w-0 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            ref={searchRef}
            type="text"
            value={filters.query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, ID, label, assignee…"
            className="w-full h-8 pl-8 pr-7 text-xs bg-secondary/40 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 placeholder:text-muted-foreground/60 transition-colors"
          />
          {filters.query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-border flex-shrink-0" />

        {/* Filter chips row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <FilterChip
            label="Status"
            count={filters.statuses.length}
            open={openDropdown === "status"}
            onToggle={() => toggle("status")}
          />
          <FilterChip
            label="Priority"
            count={filters.priorities.length}
            open={openDropdown === "priority"}
            onToggle={() => toggle("priority")}
          />
          <FilterChip
            label="Type"
            count={filters.types.length}
            open={openDropdown === "type"}
            onToggle={() => toggle("type")}
          />
          {availableAssignees.length > 0 && (
            <FilterChip
              label="Assignee"
              count={filters.assignees.length}
              open={openDropdown === "assignee"}
              onToggle={() => toggle("assignee")}
            />
          )}
        </div>

        {/* Clear all */}
        {active && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground ml-1 flex-shrink-0 transition-colors"
          >
            <X className="w-3 h-3" />
            Clear
            {activeCount > 0 && (
              <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </button>
        )}

        {/* Dropdown panels — rendered inline relative to toolbar */}
        <div className="relative">
          {openDropdown === "status" && (
            <FilterDropdown onClose={() => setOpenDropdown(null)} title="Filter by Status">
              {(Object.entries(STATUS_CONFIG) as [TicketStatus, typeof STATUS_CONFIG[TicketStatus]][]).map(([s, cfg]) => (
                <DropdownItem
                  key={s}
                  checked={filters.statuses.includes(s)}
                  onToggle={() => toggleStatus(s)}
                  label={cfg.label}
                  dot={<span className={cn("w-2 h-2 rounded-full flex-shrink-0", cfg.dotColor)} />}
                />
              ))}
            </FilterDropdown>
          )}

          {openDropdown === "priority" && (
            <FilterDropdown onClose={() => setOpenDropdown(null)} title="Filter by Priority">
              {(Object.entries(PRIORITY_CONFIG) as [TicketPriority, typeof PRIORITY_CONFIG[TicketPriority]][]).map(([p, cfg]) => (
                <DropdownItem
                  key={p}
                  checked={filters.priorities.includes(p)}
                  onToggle={() => togglePriority(p)}
                  label={cfg.label}
                  dot={<span className={cn("text-xs font-bold", cfg.color)}>●</span>}
                />
              ))}
            </FilterDropdown>
          )}

          {openDropdown === "type" && (
            <FilterDropdown onClose={() => setOpenDropdown(null)} title="Filter by Type">
              {(Object.entries(TYPE_CONFIG) as [TicketType, typeof TYPE_CONFIG[TicketType]][]).map(([t, cfg]) => (
                <DropdownItem
                  key={t}
                  checked={filters.types.includes(t)}
                  onToggle={() => toggleType(t)}
                  label={cfg.label}
                  dot={<span className={cn("text-xs font-medium", cfg.color)}>■</span>}
                />
              ))}
            </FilterDropdown>
          )}

          {openDropdown === "assignee" && (
            <FilterDropdown onClose={() => setOpenDropdown(null)} title="Filter by Assignee">
              {availableAssignees.map((a) => (
                <DropdownItem
                  key={a}
                  checked={filters.assignees.includes(a)}
                  onToggle={() => toggleAssignee(a)}
                  label={a}
                  dot={
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                      {a.charAt(0).toUpperCase()}
                    </div>
                  }
                />
              ))}
            </FilterDropdown>
          )}
        </div>
      </div>

      {/* Active filter pills row */}
      {activeCount > 0 && (
        <div className="flex items-center gap-1.5 px-4 py-1.5 bg-primary/5 border-b border-border flex-wrap">
          <SlidersHorizontal className="w-3 h-3 text-primary/60 flex-shrink-0" />
          {filters.statuses.map((s) => (
            <ActivePill key={s} label={STATUS_CONFIG[s].label} onRemove={() => toggleStatus(s)} color="bg-blue-100 text-blue-700" />
          ))}
          {filters.priorities.map((p) => (
            <ActivePill key={p} label={PRIORITY_CONFIG[p].label} onRemove={() => togglePriority(p)} color="bg-orange-100 text-orange-700" />
          ))}
          {filters.types.map((t) => (
            <ActivePill key={t} label={TYPE_CONFIG[t].label} onRemove={() => toggleType(t)} color="bg-purple-100 text-purple-700" />
          ))}
          {filters.assignees.map((a) => (
            <ActivePill key={a} label={a} onRemove={() => toggleAssignee(a)} color="bg-green-100 text-green-700" />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function FilterChip({
  label, count, open, onToggle,
}: { label: string; count: number; open: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-all",
        open
          ? "bg-primary text-primary-foreground border-primary"
          : count > 0
          ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/15"
          : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
      )}
    >
      {label}
      {count > 0 && (
        <span className={cn(
          "text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center",
          open ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary text-primary-foreground"
        )}>
          {count}
        </span>
      )}
      <ChevronDown className={cn("w-3 h-3 transition-transform", open ? "rotate-180" : "")} />
    </button>
  );
}

function FilterDropdown({
  title, children, onClose,
}: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <>
      {/* Click-away overlay */}
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 top-2 z-20 bg-card border border-border rounded-lg shadow-xl overflow-hidden min-w-[180px]">
        <div className="px-3 py-2 border-b border-border">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</span>
        </div>
        <div className="py-1">{children}</div>
      </div>
    </>
  );
}

function DropdownItem({
  checked, onToggle, label, dot,
}: { checked: boolean; onToggle: () => void; label: string; dot: React.ReactNode }) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-secondary transition-colors text-left"
    >
      <div className={cn(
        "w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 transition-colors",
        checked ? "bg-primary border-primary" : "border-border"
      )}>
        {checked && (
          <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" viewBox="0 0 12 12">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      {dot}
      <span className="font-medium">{label}</span>
    </button>
  );
}

function ActivePill({
  label, onRemove, color,
}: { label: string; onRemove: () => void; color: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
      color
    )}>
      {label}
      <button onClick={onRemove} className="hover:opacity-70 transition-opacity">
        <X className="w-2.5 h-2.5" />
      </button>
    </span>
  );
}
