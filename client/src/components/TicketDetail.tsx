/**
 * TicketDetail — Slide-over panel showing full ticket info + editing
 * Design: Blueprint — right panel, 1px borders, inline editing
 */

import { useState, useEffect } from "react";
import { X, Trash2, Send, Edit2, Check, Calendar, XCircle } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import type { TicketStatus, TicketPriority, TicketType } from "@/lib/types";
import { STATUS_CONFIG, PRIORITY_CONFIG, TYPE_CONFIG } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatDateTime, formatDistanceToNow } from "@/lib/dateUtils";
import FileAttachments from "./FileAttachments";

interface Props {
  ticketId: string;
  onClose: () => void;
}

export default function TicketDetail({ ticketId, onClose }: Props) {
  const { data, updateTicket, deleteTicket, addCommentToTicket, deleteComment } = useApp();
  const ticket = data?.tickets.find((t) => t.id === ticketId);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState("");
  const [commentText, setCommentText] = useState("");
  const [commentAuthor, setCommentAuthor] = useState("Me");
  const [labelInput, setLabelInput] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");

  useEffect(() => {
    if (ticket) {
      setTitleDraft(ticket.title);
      setDescDraft(ticket.description);
    }
  }, [ticket?.id]);

  if (!ticket) return null;

  const status = STATUS_CONFIG[ticket.status];
  const priority = PRIORITY_CONFIG[ticket.priority];
  const type = TYPE_CONFIG[ticket.type];

  const saveTitle = async () => {
    if (titleDraft.trim() && titleDraft !== ticket.title) {
      await updateTicket(ticket.id, { title: titleDraft.trim() });
    }
    setEditingTitle(false);
  };

  const saveDesc = async () => {
    if (descDraft !== ticket.description) {
      await updateTicket(ticket.id, { description: descDraft });
    }
    setEditingDesc(false);
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    await addCommentToTicket(ticket.id, commentAuthor, commentText.trim());
    setCommentText("");
  };

  const handleAddLabel = async () => {
    const l = labelInput.trim();
    if (l && !ticket.labels.includes(l)) {
      await updateTicket(ticket.id, { labels: [...ticket.labels, l] });
    }
    setLabelInput("");
  };

  const handleRemoveLabel = async (l: string) => {
    await updateTicket(ticket.id, { labels: ticket.labels.filter((x) => x !== l) });
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    await deleteTicket(ticket.id);
    onClose();
  };

  return (
    <div className="w-[480px] flex-shrink-0 border-l border-border bg-card flex flex-col h-screen overflow-hidden slide-over-enter">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <span className="font-mono text-xs font-medium text-muted-foreground">{ticket.id}</span>
        <div className="flex-1" />
        <button
          onClick={handleDelete}
          className={cn(
            "p-1.5 rounded hover:bg-destructive/10 transition-colors",
            confirmDelete ? "text-destructive" : "text-muted-foreground hover:text-destructive"
          )}
          title={confirmDelete ? "Click again to confirm delete" : "Delete ticket"}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onClose}
          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Title */}
        <div className="px-4 pt-4 pb-3 border-b border-border">
          {editingTitle ? (
            <div className="flex gap-2">
              <Input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") setEditingTitle(false); }}
                className="text-sm font-semibold flex-1"
                autoFocus
              />
              <Button size="sm" onClick={saveTitle} className="h-8"><Check className="w-3.5 h-3.5" /></Button>
            </div>
          ) : (
            <div className="group flex items-start gap-2">
              <h2 className="text-base font-semibold text-foreground leading-snug flex-1">{ticket.title}</h2>
              <button
                onClick={() => { setTitleDraft(ticket.title); setEditingTitle(true); }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-foreground transition-all"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Metadata grid */}
        <div className="px-4 py-3 border-b border-border grid grid-cols-2 gap-x-4 gap-y-3">
          <MetaField label="Status">
            <Select value={ticket.status} onValueChange={(v) => updateTicket(ticket.id, { status: v as TicketStatus })}>
              <SelectTrigger className="h-7 text-xs border-0 bg-transparent p-0 hover:bg-secondary rounded px-2 -mx-2 w-auto gap-1">
                <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full", status.bgColor, status.color)}>
                  <span className={cn("w-1.5 h-1.5 rounded-full", status.dotColor)} />
                  {status.label}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="backlog">Backlog</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="in_review">In Review</SelectItem>
                <SelectItem value="done">Done</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </MetaField>

          <MetaField label="Priority">
            <Select value={ticket.priority} onValueChange={(v) => updateTicket(ticket.id, { priority: v as TicketPriority })}>
              <SelectTrigger className="h-7 text-xs border-0 bg-transparent p-0 hover:bg-secondary rounded px-2 -mx-2 w-auto gap-1">
                <span className={cn("text-xs font-medium", priority.color)}>{priority.label}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </MetaField>

          <MetaField label="Type">
            <Select value={ticket.type} onValueChange={(v) => updateTicket(ticket.id, { type: v as TicketType })}>
              <SelectTrigger className="h-7 text-xs border-0 bg-transparent p-0 hover:bg-secondary rounded px-2 -mx-2 w-auto gap-1">
                <span className={cn("text-xs font-medium", type.color)}>{type.label}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="task">Task</SelectItem>
                <SelectItem value="bug">Bug</SelectItem>
                <SelectItem value="feature">Feature</SelectItem>
                <SelectItem value="improvement">Improvement</SelectItem>
                <SelectItem value="question">Question</SelectItem>
              </SelectContent>
            </Select>
          </MetaField>

          <MetaField label="Assignee">
            <InlineEdit
              value={ticket.assignee}
              placeholder="Unassigned"
              onSave={(v) => updateTicket(ticket.id, { assignee: v })}
            />
          </MetaField>

          <MetaField label="Reporter">
            <InlineEdit
              value={ticket.reporter}
              placeholder="Unknown"
              onSave={(v) => updateTicket(ticket.id, { reporter: v })}
            />
          </MetaField>

          <MetaField label="Created">
            <span className="text-xs text-muted-foreground" title={formatDateTime(ticket.createdAt)}>
              {formatDistanceToNow(ticket.createdAt)}
            </span>
          </MetaField>

          <MetaField label="Updated">
            <span className="text-xs text-muted-foreground" title={formatDateTime(ticket.updatedAt)}>
              {formatDistanceToNow(ticket.updatedAt)}
            </span>
          </MetaField>

          <MetaField label="Due Date">
            <DueDatePicker
              value={ticket.dueAt ?? null}
              onSave={(v) => updateTicket(ticket.id, { dueAt: v })}
            />
          </MetaField>
        </div>

        {/* Labels */}
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Labels</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {ticket.labels.map((l) => (
              <span key={l} className="flex items-center gap-1 text-xs bg-secondary border border-border px-2 py-0.5 rounded-sm">
                {l}
                <button onClick={() => handleRemoveLabel(l)} className="text-muted-foreground hover:text-destructive">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
            {ticket.labels.length === 0 && <span className="text-xs text-muted-foreground/50">No labels</span>}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add label…"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddLabel(); } }}
              className="h-7 text-xs flex-1"
            />
            <Button variant="outline" size="sm" onClick={handleAddLabel} className="h-7 text-xs px-2">Add</Button>
          </div>
        </div>

        {/* Description */}
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Description</p>
          {editingDesc ? (
            <div className="space-y-2">
              <Textarea
                value={descDraft}
                onChange={(e) => setDescDraft(e.target.value)}
                rows={6}
                className="text-sm"
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveDesc} className="h-7 text-xs">Save</Button>
                <Button size="sm" variant="outline" onClick={() => { setDescDraft(ticket.description); setEditingDesc(false); }} className="h-7 text-xs">Cancel</Button>
              </div>
            </div>
          ) : (
            <div
              className="group cursor-text min-h-[3rem] text-sm text-foreground/80 whitespace-pre-wrap hover:bg-secondary/40 rounded p-2 -mx-2 transition-colors"
              onClick={() => { setDescDraft(ticket.description); setEditingDesc(true); }}
            >
              {ticket.description || (
                <span className="text-muted-foreground/50 italic">Click to add description…</span>
              )}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Notes</p>
          {editingNotes ? (
            <div className="space-y-2">
              <Textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                rows={8}
                placeholder="Add private notes, context, links, or anything useful…"
                className="text-sm font-mono text-xs"
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={async () => { await updateTicket(ticket.id, { notes: notesDraft }); setEditingNotes(false); }} className="h-7 text-xs">Save</Button>
                <Button size="sm" variant="outline" onClick={() => { setNotesDraft(ticket.notes ?? ""); setEditingNotes(false); }} className="h-7 text-xs">Cancel</Button>
              </div>
            </div>
          ) : (
            <div
              className="group cursor-text min-h-[3rem] text-sm text-foreground/80 whitespace-pre-wrap hover:bg-secondary/40 rounded p-2 -mx-2 transition-colors font-mono text-xs"
              onClick={() => { setNotesDraft(ticket.notes ?? ""); setEditingNotes(true); }}
            >
              {ticket.notes || (
                <span className="text-muted-foreground/50 italic font-sans text-sm">Click to add notes…</span>
              )}
            </div>
          )}
        </div>

        {/* File Attachments */}
        <FileAttachments ticketId={ticketId} />

        {/* Comments */}
        <div className="px-4 py-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Comments ({ticket.comments.length})
          </p>

          <div className="space-y-3 mb-4">
            {ticket.comments.map((comment) => (
              <div key={comment.id} className="group">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {comment.author.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium text-foreground">{comment.author}</span>
                  <span className="text-xs text-muted-foreground" title={formatDateTime(comment.createdAt)}>
                    {formatDistanceToNow(comment.createdAt)}
                  </span>
                  <button
                    onClick={() => deleteComment(ticket.id, comment.id)}
                    className="ml-auto opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-foreground hover:text-destructive transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="ml-7 text-sm text-foreground/80 whitespace-pre-wrap bg-secondary/40 rounded p-2">
                  {comment.body}
                </div>
              </div>
            ))}
          </div>

          {/* Add comment */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Your name"
                value={commentAuthor}
                onChange={(e) => setCommentAuthor(e.target.value)}
                className="h-7 text-xs w-32"
              />
            </div>
            <div className="flex gap-2">
              <Textarea
                placeholder="Add a comment…"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={2}
                className="text-sm flex-1 resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
              />
            </div>
            <Button
              size="sm"
              onClick={handleAddComment}
              disabled={!commentText.trim()}
              className="h-7 text-xs gap-1.5"
            >
              <Send className="w-3 h-3" />
              Comment
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MetaField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      {children}
    </div>
  );
}

function InlineEdit({
  value,
  placeholder,
  onSave,
}: {
  value: string;
  placeholder: string;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => { setDraft(value); }, [value]);

  const save = () => {
    onSave(draft);
    setEditing(false);
  };

  if (editing) {
    return (
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
        className="h-6 text-xs px-1"
        autoFocus
      />
    );
  }

  return (
    <button
      onClick={() => { setDraft(value); setEditing(true); }}
      className="text-xs text-left hover:underline text-foreground/80 hover:text-foreground transition-colors"
    >
      {value || <span className="text-muted-foreground/50 italic">{placeholder}</span>}
    </button>
  );
}

function DueDatePicker({
  value,
  onSave,
}: {
  value: string | null;
  onSave: (v: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);

  // Convert ISO string to YYYY-MM-DD for <input type="date">
  const toInputValue = (iso: string | null) => {
    if (!iso) return "";
    return iso.slice(0, 10);
  };

  const fromInputValue = (v: string) => {
    if (!v) return null;
    return new Date(v + "T00:00:00").toISOString();
  };

  const isOverdue = value && new Date(value) < new Date() && !value.startsWith("9999");
  const isDueSoon = value && !isOverdue && (() => {
    const diff = new Date(value).getTime() - Date.now();
    return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000; // within 3 days
  })();

  const formatDue = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="date"
          defaultValue={toInputValue(value)}
          autoFocus
          onChange={(e) => {
            onSave(fromInputValue(e.target.value));
            setEditing(false);
          }}
          onBlur={() => setEditing(false)}
          className="h-6 text-xs px-1 border border-border rounded bg-card focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
      </div>
    );
  }

  if (!value) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex items-center gap-1 text-xs text-muted-foreground/50 italic hover:text-primary transition-colors"
      >
        <Calendar className="w-3 h-3" />
        Set due date
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => setEditing(true)}
        className={cn(
          "flex items-center gap-1 text-xs font-medium transition-colors",
          isOverdue ? "text-red-600 hover:text-red-700" : isDueSoon ? "text-amber-600 hover:text-amber-700" : "text-foreground/80 hover:text-foreground"
        )}
      >
        <Calendar className="w-3 h-3" />
        {formatDue(value)}
        {isOverdue && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">Overdue</span>}
        {isDueSoon && !isOverdue && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">Due soon</span>}
      </button>
      <button
        onClick={() => onSave(null)}
        className="text-muted-foreground hover:text-destructive transition-colors"
        title="Clear due date"
      >
        <XCircle className="w-3 h-3" />
      </button>
    </div>
  );
}
