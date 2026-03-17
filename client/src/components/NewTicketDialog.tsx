/**
 * NewTicketDialog — Create a new ticket
 * Design: Blueprint
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/contexts/AppContext";
import type { TicketStatus, TicketPriority, TicketType } from "@/lib/types";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  projectKey: string;
  defaultStatus?: TicketStatus;
}

export default function NewTicketDialog({ open, onClose, projectKey, defaultStatus }: Props) {
  const { addTicket } = useApp();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TicketStatus>(defaultStatus ?? "todo");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [type, setType] = useState<TicketType>("task");
  const [assignee, setAssignee] = useState("");
  const [reporter, setReporter] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [labels, setLabels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLabel = () => {
    const l = labelInput.trim();
    if (l && !labels.includes(l)) {
      setLabels((prev) => [...prev, l]);
    }
    setLabelInput("");
  };

  const removeLabel = (l: string) => setLabels((prev) => prev.filter((x) => x !== l));

  const reset = () => {
    setTitle(""); setDescription(""); setStatus(defaultStatus ?? "todo");
    setPriority("medium"); setType("task"); setAssignee(""); setReporter("");
    setLabels([]); setLabelInput("");
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setLoading(true);
    try {
      await addTicket({ title, description, status, priority, type, assignee, reporter, labels, projectKey });
      reset();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Ticket — <span className="font-mono text-muted-foreground">{projectKey}</span></DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="t-title">Title <span className="text-destructive">*</span></Label>
            <Input
              id="t-title"
              placeholder="Short, descriptive title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="t-desc">Description</Label>
            <Textarea
              id="t-desc"
              placeholder="Describe the issue, feature, or task…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as TicketType)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="bug">Bug</SelectItem>
                  <SelectItem value="feature">Feature</SelectItem>
                  <SelectItem value="improvement">Improvement</SelectItem>
                  <SelectItem value="question">Question</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TicketStatus)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
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
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="t-assignee">Assignee</Label>
              <Input
                id="t-assignee"
                placeholder="Name or @handle"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="t-reporter">Reporter</Label>
            <Input
              id="t-reporter"
              placeholder="Who is reporting this?"
              value={reporter}
              onChange={(e) => setReporter(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Labels</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add label…"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLabel(); } }}
                className="h-8 text-xs flex-1"
              />
              <Button variant="outline" size="sm" onClick={addLabel} className="h-8 text-xs">Add</Button>
            </div>
            {labels.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {labels.map((l) => (
                  <span key={l} className="flex items-center gap-1 text-xs bg-secondary border border-border px-2 py-0.5 rounded-sm">
                    {l}
                    <button onClick={() => removeLabel(l)} className="text-muted-foreground hover:text-foreground">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || loading}>
            {loading ? "Creating…" : "Create Ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
