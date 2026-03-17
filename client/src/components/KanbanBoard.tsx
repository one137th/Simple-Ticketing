/**
 * KanbanBoard — Drag-free kanban board view
 * Design: Blueprint — columns with status headers, card-based tickets
 */

import { useState } from "react";
import { Plus } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import type { TicketStatus } from "@/lib/types";
import { STATUS_CONFIG, PRIORITY_CONFIG } from "@/lib/types";
import { cn } from "@/lib/utils";
import NewTicketDialog from "./NewTicketDialog";

const BOARD_COLUMNS: TicketStatus[] = ["backlog", "todo", "in_progress", "in_review", "done"];

interface Props {
  onSelectTicket: (id: string) => void;
  selectedTicketId: string | null;
}

export default function KanbanBoard({ onSelectTicket, selectedTicketId }: Props) {
  const { data, selectedProjectKey, updateTicket } = useApp();
  const [newTicketStatus, setNewTicketStatus] = useState<TicketStatus | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TicketStatus | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const tickets = (data?.tickets ?? []).filter((t) => t.projectKey === selectedProjectKey);

  const handleDragStart = (e: React.DragEvent, ticketId: string) => {
    e.dataTransfer.setData("ticketId", ticketId);
    setDraggingId(ticketId);
  };

  const handleDrop = async (e: React.DragEvent, status: TicketStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("ticketId");
    if (id) {
      await updateTicket(id, { status });
    }
    setDragOverCol(null);
    setDraggingId(null);
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
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-3 p-4 h-full min-w-max">
          {BOARD_COLUMNS.map((status) => {
            const cfg = STATUS_CONFIG[status];
            const colTickets = tickets.filter((t) => t.status === status);
            const isDragOver = dragOverCol === status;

            return (
              <div
                key={status}
                className={cn(
                  "flex flex-col w-64 rounded-lg border transition-colors",
                  isDragOver ? "border-primary/40 bg-primary/5" : "border-border bg-secondary/30"
                )}
                onDragOver={(e) => { e.preventDefault(); setDragOverCol(status); }}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={(e) => handleDrop(e, status)}
              >
                {/* Column header */}
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
                  <span className={cn("w-2 h-2 rounded-full", cfg.dotColor)} />
                  <span className="text-xs font-semibold text-foreground">{cfg.label}</span>
                  <span className="ml-auto text-xs font-mono text-muted-foreground">{colTickets.length}</span>
                  <button
                    onClick={() => setNewTicketStatus(status)}
                    className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
                    title={`Add ticket to ${cfg.label}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {colTickets.map((ticket) => {
                    const pCfg = PRIORITY_CONFIG[ticket.priority];
                    const isSelected = selectedTicketId === ticket.id;
                    const isDragging = draggingId === ticket.id;

                    return (
                      <div
                        key={ticket.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, ticket.id)}
                        onDragEnd={() => setDraggingId(null)}
                        onClick={() => onSelectTicket(ticket.id)}
                        className={cn(
                          "bg-card border rounded-md p-3 cursor-pointer transition-all select-none",
                          "hover:shadow-sm hover:border-primary/30",
                          isSelected ? "border-primary/50 shadow-sm" : "border-border",
                          isDragging ? "opacity-40" : ""
                        )}
                      >
                        {/* Ticket ID + type */}
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="font-mono text-xs text-muted-foreground">{ticket.id}</span>
                          <span className="ml-auto text-xs text-muted-foreground">{ticket.type}</span>
                        </div>

                        {/* Title */}
                        <p className={cn(
                          "text-xs font-medium text-foreground leading-snug line-clamp-2",
                          ticket.status === "done" ? "line-through text-muted-foreground" : ""
                        )}>
                          {ticket.title}
                        </p>

                        {/* Footer */}
                        <div className="flex items-center gap-2 mt-2">
                          <span className={cn("text-xs font-medium", pCfg.color)}>{pCfg.label}</span>
                          {ticket.assignee && (
                            <div className="ml-auto w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                              {ticket.assignee.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>

                        {/* Labels */}
                        {ticket.labels.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {ticket.labels.slice(0, 2).map((l) => (
                              <span key={l} className="text-xs bg-secondary border border-border px-1.5 py-0 rounded-sm text-muted-foreground">
                                {l}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {colTickets.length === 0 && (
                    <div
                      className="flex items-center justify-center h-16 rounded-md border border-dashed border-border text-xs text-muted-foreground/50 cursor-pointer hover:border-primary/30 hover:text-muted-foreground transition-colors"
                      onClick={() => setNewTicketStatus(status)}
                    >
                      Drop here or click +
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {newTicketStatus && (
        <NewTicketDialog
          open={true}
          onClose={() => setNewTicketStatus(null)}
          projectKey={selectedProjectKey}
          defaultStatus={newTicketStatus}
        />
      )}
    </>
  );
}
