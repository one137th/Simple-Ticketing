/**
 * BulkActionBar — Floating action bar for bulk ticket operations
 * Design: Blueprint — anchored bottom bar, navy bg, clear affordances
 */

import { useState } from "react";
import { X, ChevronDown, CheckSquare } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import type { TicketStatus, TicketPriority } from "@/lib/types";
import { STATUS_CONFIG, PRIORITY_CONFIG } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  selectedIds: string[];
  totalVisible: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
}

type DropdownType = "status" | "priority" | null;

export default function BulkActionBar({
  selectedIds,
  totalVisible,
  onSelectAll,
  onClearSelection,
}: Props) {
  const { bulkUpdateTickets } = useApp();
  const [openDropdown, setOpenDropdown] = useState<DropdownType>(null);
  const [applying, setApplying] = useState(false);

  const count = selectedIds.length;

  const applyStatus = async (status: TicketStatus) => {
    setApplying(true);
    setOpenDropdown(null);
    await bulkUpdateTickets(selectedIds, { status });
    setApplying(false);
    onClearSelection();
  };

  const applyPriority = async (priority: TicketPriority) => {
    setApplying(true);
    setOpenDropdown(null);
    await bulkUpdateTickets(selectedIds, { priority });
    setApplying(false);
    onClearSelection();
  };

  const toggleDropdown = (type: DropdownType) => {
    setOpenDropdown((prev) => (prev === type ? null : type));
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
      <div
        className="pointer-events-auto flex items-center gap-1 bg-primary text-primary-foreground rounded-xl shadow-lg px-3 py-2 text-sm font-medium"
        style={{ boxShadow: "0 4px 24px rgba(30,58,95,0.25)" }}
      >
        {/* Count + select all */}
        <div className="flex items-center gap-2 pr-3 border-r border-primary-foreground/20">
          <CheckSquare className="w-3.5 h-3.5 opacity-80" />
          <span className="text-xs font-semibold tabular-nums">
            {count} selected
          </span>
          {count < totalVisible && (
            <button
              onClick={onSelectAll}
              className="text-xs text-primary-foreground/70 hover:text-primary-foreground underline underline-offset-2 transition-colors"
            >
              Select all {totalVisible}
            </button>
          )}
        </div>

        {/* Status dropdown */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown("status")}
            disabled={applying}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary-foreground/10 transition-colors disabled:opacity-50"
          >
            Set Status
            <ChevronDown className={cn("w-3 h-3 transition-transform", openDropdown === "status" ? "rotate-180" : "")} />
          </button>

          {openDropdown === "status" && (
            <div className="absolute bottom-full mb-2 left-0 bg-card border border-border rounded-lg shadow-xl overflow-hidden min-w-[160px]">
              {(Object.entries(STATUS_CONFIG) as [TicketStatus, typeof STATUS_CONFIG[TicketStatus]][]).map(([status, cfg]) => (
                <button
                  key={status}
                  onClick={() => applyStatus(status)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-secondary transition-colors text-left"
                >
                  <span className={cn("w-2 h-2 rounded-full flex-shrink-0", cfg.dotColor)} />
                  <span className="font-medium">{cfg.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Priority dropdown */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown("priority")}
            disabled={applying}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary-foreground/10 transition-colors disabled:opacity-50"
          >
            Set Priority
            <ChevronDown className={cn("w-3 h-3 transition-transform", openDropdown === "priority" ? "rotate-180" : "")} />
          </button>

          {openDropdown === "priority" && (
            <div className="absolute bottom-full mb-2 left-0 bg-card border border-border rounded-lg shadow-xl overflow-hidden min-w-[140px]">
              {(Object.entries(PRIORITY_CONFIG) as [TicketPriority, typeof PRIORITY_CONFIG[TicketPriority]][]).map(([priority, cfg]) => (
                <button
                  key={priority}
                  onClick={() => applyPriority(priority)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-secondary transition-colors text-left"
                >
                  <span className={cn("text-xs font-bold", cfg.color)}>●</span>
                  <span className="font-medium">{cfg.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Divider + clear */}
        <div className="pl-2 border-l border-primary-foreground/20">
          <button
            onClick={onClearSelection}
            className="p-1.5 rounded-lg hover:bg-primary-foreground/10 transition-colors"
            title="Clear selection"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
