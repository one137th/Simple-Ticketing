/**
 * TicketRow — Single row in the ticket list
 * Design: Blueprint — dense table row, priority strip, status badge
 */

import { cn } from "@/lib/utils";
import type { Ticket } from "@/lib/types";
import { STATUS_CONFIG, PRIORITY_CONFIG, TYPE_CONFIG } from "@/lib/types";
import { formatDistanceToNow } from "@/lib/dateUtils";
import { MessageSquare } from "lucide-react";

interface Props {
  ticket: Ticket;
  isSelected: boolean;
  onClick: () => void;
}

const PRIORITY_STRIP: Record<string, string> = {
  critical: "border-l-red-500",
  high:     "border-l-orange-400",
  medium:   "border-l-amber-400",
  low:      "border-l-blue-300",
};

export default function TicketRow({ ticket, isSelected, onClick }: Props) {
  const status = STATUS_CONFIG[ticket.status];
  const priority = PRIORITY_CONFIG[ticket.priority];
  const type = TYPE_CONFIG[ticket.type];

  return (
    <tr
      onClick={onClick}
      className={cn(
        "ticket-row border-l-[3px] cursor-pointer select-none",
        PRIORITY_STRIP[ticket.priority],
        isSelected ? "bg-primary/5 border-l-primary" : ""
      )}
    >
      {/* Ticket ID */}
      <td className="pl-4 pr-2 py-2.5 w-28">
        <span className="font-mono text-xs font-medium text-muted-foreground whitespace-nowrap">
          {ticket.id}
        </span>
      </td>

      {/* Type */}
      <td className="px-2 py-2.5 w-24 hidden sm:table-cell">
        <span className={cn("text-xs font-medium", type.color)}>
          {type.label}
        </span>
      </td>

      {/* Title */}
      <td className="px-2 py-2.5">
        <span className={cn(
          "text-sm font-medium text-foreground line-clamp-1",
          ticket.status === "done" || ticket.status === "cancelled" ? "line-through text-muted-foreground" : ""
        )}>
          {ticket.title}
        </span>
        {ticket.labels.length > 0 && (
          <div className="flex gap-1 mt-0.5 flex-wrap">
            {ticket.labels.slice(0, 3).map((label) => (
              <span key={label} className="text-xs bg-secondary text-muted-foreground px-1.5 py-0 rounded-sm border border-border">
                {label}
              </span>
            ))}
          </div>
        )}
      </td>

      {/* Status */}
      <td className="px-2 py-2.5 w-32 hidden md:table-cell">
        <span className={cn(
          "inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full",
          status.bgColor, status.color
        )}>
          <span className={cn("w-1.5 h-1.5 rounded-full", status.dotColor)} />
          {status.label}
        </span>
      </td>

      {/* Priority */}
      <td className="px-2 py-2.5 w-20 hidden lg:table-cell">
        <span className={cn("text-xs font-medium", priority.color)}>
          {priority.label}
        </span>
      </td>

      {/* Assignee */}
      <td className="px-2 py-2.5 w-28 hidden lg:table-cell">
        {ticket.assignee ? (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
              {ticket.assignee.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-muted-foreground truncate">{ticket.assignee}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground/40">—</span>
        )}
      </td>

      {/* Comments */}
      <td className="px-2 py-2.5 w-16 hidden xl:table-cell">
        {ticket.comments.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MessageSquare className="w-3 h-3" />
            {ticket.comments.length}
          </div>
        )}
      </td>

      {/* Updated */}
      <td className="pr-4 pl-2 py-2.5 w-28 hidden xl:table-cell">
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDistanceToNow(ticket.updatedAt)}
        </span>
      </td>
    </tr>
  );
}
