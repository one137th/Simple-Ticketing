/**
 * NewProjectDialog — Create a new project
 * Design: Blueprint
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useApp } from "@/contexts/AppContext";
import { PROJECT_COLORS } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function NewProjectDialog({ open, onClose }: Props) {
  const { addProject, data } = useApp();
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [keyManuallyEdited, setKeyManuallyEdited] = useState(false);
  const [loading, setLoading] = useState(false);

  const derivedKey = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);

  const handleNameChange = (v: string) => {
    setName(v);
    if (!keyManuallyEdited) {
      setKey(v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6));
    }
  };

  const existingKeys = data?.projects.map((p) => p.key) ?? [];
  const keyError = existingKeys.includes(key.toUpperCase()) ? "Key already in use" : "";
  const canSubmit = name.trim().length > 0 && key.trim().length > 0 && !keyError;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      await addProject({ key, name, description, color });
      setName("");
      setKey("");
      setDescription("");
      setColor(PROJECT_COLORS[0]);
      setKeyManuallyEdited(false);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="proj-name">Project Name</Label>
            <Input
              id="proj-name"
              placeholder="e.g. My App"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="proj-key">
              Project Key
              <span className="text-xs text-muted-foreground ml-2">Used as ticket prefix (e.g. MYAPP-001)</span>
            </Label>
            <Input
              id="proj-key"
              placeholder="e.g. MYAPP"
              value={key}
              onChange={(e) => {
                setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8));
                setKeyManuallyEdited(true);
              }}
              className="font-mono uppercase"
            />
            {keyError && <p className="text-xs text-destructive">{keyError}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="proj-desc">Description <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              id="proj-desc"
              placeholder="What is this project about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-7 h-7 rounded-full border-2 transition-all",
                    color === c ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || loading}>
            {loading ? "Creating…" : "Create Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
