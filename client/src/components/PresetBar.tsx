/**
 * PresetBar — Saved filter presets row
 * Shows built-in presets + user-saved presets as one-click chips.
 * Includes a "Save current filters" inline form.
 */

import { useState, useEffect, useCallback } from "react";
import { Bookmark, BookmarkCheck, X, Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FilterState } from "./FilterBar";
import { hasActiveFilters, EMPTY_FILTERS } from "./FilterBar";
import type { FilterPreset } from "@/lib/filterPresets";
import {
  loadPresets,
  addPreset,
  deletePreset,
  getBuiltInPresets,
} from "@/lib/filterPresets";

interface Props {
  projectKey: string;
  currentFilters: FilterState;
  activePresetId: string | null;
  onApplyPreset: (preset: FilterPreset) => void;
  onClearPreset: () => void;
  availableAssignees: string[];
}

export default function PresetBar({
  projectKey,
  currentFilters,
  activePresetId,
  onApplyPreset,
  onClearPreset,
  availableAssignees,
}: Props) {
  const [userPresets, setUserPresets] = useState<FilterPreset[]>([]);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const builtInPresets = getBuiltInPresets(availableAssignees);

  // Load user presets from localStorage whenever project changes
  useEffect(() => {
    setUserPresets(loadPresets(projectKey));
    setShowSaveForm(false);
    setPresetName("");
  }, [projectKey]);

  const handleSave = useCallback(() => {
    if (!presetName.trim()) return;
    const updated = addPreset(projectKey, presetName, currentFilters);
    setUserPresets(updated);
    setPresetName("");
    setShowSaveForm(false);
  }, [projectKey, presetName, currentFilters]);

  const handleDelete = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (confirmDelete !== id) {
        setConfirmDelete(id);
        // Auto-clear confirm after 3s
        setTimeout(() => setConfirmDelete(null), 3000);
        return;
      }
      const updated = deletePreset(projectKey, id);
      setUserPresets(updated);
      if (activePresetId === id) onClearPreset();
      setConfirmDelete(null);
    },
    [projectKey, confirmDelete, activePresetId, onClearPreset]
  );

  const isFiltered = hasActiveFilters(currentFilters);
  const allPresets = [...builtInPresets, ...userPresets];

  if (allPresets.length === 0 && !isFiltered) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 border-b border-border bg-secondary/20 overflow-x-auto min-h-[36px]">
      {/* Label */}
      <span className="text-xs text-muted-foreground font-medium flex-shrink-0 flex items-center gap-1">
        <Bookmark className="w-3 h-3" />
        Presets
      </span>

      <div className="w-px h-4 bg-border flex-shrink-0" />

      {/* Built-in preset chips */}
      {builtInPresets.map((preset) => {
        const isActive = activePresetId === preset.id;
        return (
          <button
            key={preset.id}
            onClick={() => isActive ? onClearPreset() : onApplyPreset(preset)}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all flex-shrink-0",
              isActive
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground hover:bg-secondary"
            )}
          >
            <Sparkles className="w-2.5 h-2.5 opacity-60" />
            {preset.name}
          </button>
        );
      })}

      {/* User-saved preset chips */}
      {userPresets.map((preset) => {
        const isActive = activePresetId === preset.id;
        const isConfirming = confirmDelete === preset.id;
        return (
          <div
            key={preset.id}
            className={cn(
              "flex items-center gap-0.5 rounded-full border transition-all flex-shrink-0 overflow-hidden",
              isActive
                ? "bg-primary border-primary"
                : "bg-card border-border hover:border-primary/40"
            )}
          >
            <button
              onClick={() => isActive ? onClearPreset() : onApplyPreset(preset)}
              className={cn(
                "flex items-center gap-1 pl-2.5 pr-1.5 py-1 text-xs font-medium transition-colors",
                isActive ? "text-primary-foreground" : "text-foreground hover:text-foreground"
              )}
            >
              <BookmarkCheck className="w-2.5 h-2.5 opacity-70" />
              {preset.name}
            </button>
            <button
              onClick={(e) => handleDelete(preset.id, e)}
              className={cn(
                "pr-2 py-1 text-xs transition-colors",
                isConfirming
                  ? "text-destructive"
                  : isActive
                  ? "text-primary-foreground/60 hover:text-primary-foreground"
                  : "text-muted-foreground hover:text-destructive"
              )}
              title={isConfirming ? "Click again to delete" : "Delete preset"}
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        );
      })}

      {/* Save current filters as preset */}
      {isFiltered && !showSaveForm && (
        <button
          onClick={() => setShowSaveForm(true)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-dashed border-primary/40 text-primary/70 hover:text-primary hover:border-primary transition-all flex-shrink-0"
        >
          <Plus className="w-2.5 h-2.5" />
          Save filters
        </button>
      )}

      {showSaveForm && (
        <form
          onSubmit={(e) => { e.preventDefault(); handleSave(); }}
          className="flex items-center gap-1 flex-shrink-0"
        >
          <input
            autoFocus
            type="text"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="Preset name…"
            maxLength={32}
            className="h-6 px-2 text-xs bg-card border border-primary/40 rounded-full focus:outline-none focus:ring-1 focus:ring-primary/40 w-32"
          />
          <button
            type="submit"
            disabled={!presetName.trim()}
            className="h-6 px-2.5 text-xs bg-primary text-primary-foreground rounded-full disabled:opacity-40 hover:bg-primary/90 transition-colors"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => { setShowSaveForm(false); setPresetName(""); }}
            className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-full transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </form>
      )}
    </div>
  );
}
