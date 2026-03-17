/**
 * Filter Presets — localStorage persistence, per project
 */

import type { FilterState } from "@/components/FilterBar";

export interface FilterPreset {
  id: string;
  name: string;
  filters: FilterState;
  createdAt: string;
  builtIn?: boolean;
}

const storageKey = (projectKey: string) => `localticket_presets_${projectKey}`;

export function loadPresets(projectKey: string): FilterPreset[] {
  try {
    const raw = localStorage.getItem(storageKey(projectKey));
    if (raw) return JSON.parse(raw) as FilterPreset[];
  } catch {}
  return [];
}

export function savePresets(projectKey: string, presets: FilterPreset[]): void {
  // Never persist built-in presets — they're always generated fresh
  const toSave = presets.filter((p) => !p.builtIn);
  localStorage.setItem(storageKey(projectKey), JSON.stringify(toSave));
}

export function addPreset(projectKey: string, name: string, filters: FilterState): FilterPreset[] {
  const existing = loadPresets(projectKey);
  const preset: FilterPreset = {
    id: `preset_${Date.now()}`,
    name: name.trim(),
    filters,
    createdAt: new Date().toISOString(),
  };
  const updated = [...existing, preset];
  savePresets(projectKey, updated);
  return updated;
}

export function deletePreset(projectKey: string, id: string): FilterPreset[] {
  const existing = loadPresets(projectKey).filter((p) => p.id !== id);
  savePresets(projectKey, existing);
  return existing;
}

/** Built-in presets — generated fresh, not stored */
export function getBuiltInPresets(assignees: string[]): FilterPreset[] {
  const presets: FilterPreset[] = [
    {
      id: "__bugs__",
      name: "Bugs",
      builtIn: true,
      createdAt: "",
      filters: {
        query: "",
        statuses: [],
        priorities: [],
        types: ["bug"],
        assignees: [],
      },
    },
    {
      id: "__high_priority__",
      name: "High Priority",
      builtIn: true,
      createdAt: "",
      filters: {
        query: "",
        statuses: ["todo", "in_progress", "in_review"],
        priorities: ["critical", "high"],
        types: [],
        assignees: [],
      },
    },
    {
      id: "__open__",
      name: "Open",
      builtIn: true,
      createdAt: "",
      filters: {
        query: "",
        statuses: ["backlog", "todo", "in_progress", "in_review"],
        priorities: [],
        types: [],
        assignees: [],
      },
    },
    {
      id: "__in_progress__",
      name: "In Progress",
      builtIn: true,
      createdAt: "",
      filters: {
        query: "",
        statuses: ["in_progress"],
        priorities: [],
        types: [],
        assignees: [],
      },
    },
  ];
  return presets;
}
