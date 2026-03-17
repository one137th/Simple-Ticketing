/**
 * LocalTicket — Remote Sync Adapters
 * All client-side. No backend required.
 *
 * Supported backends:
 *  1. GitHub Gist  — uses the GitHub REST API with a Personal Access Token
 *  2. Cloudflare KV — uses a tiny public Cloudflare Worker URL you deploy once
 *
 * Config is stored in localStorage under "localticket_sync_config".
 */

import type { AppData } from "./types";

// ─── Config types ────────────────────────────────────────────────────────────

export type SyncBackend = "none" | "github_gist" | "cloudflare_kv";

export interface GistSyncConfig {
  backend: "github_gist";
  token: string;       // GitHub Personal Access Token (gist scope)
  gistId: string;      // Leave blank to auto-create on first push
  filename: string;    // e.g. "localticket-data.json"
}

export interface CloudflareSyncConfig {
  backend: "cloudflare_kv";
  workerUrl: string;   // e.g. https://localticket-kv.yourname.workers.dev
  secret: string;      // Bearer token you set in the Worker env
}

export interface NoSyncConfig {
  backend: "none";
}

export type SyncConfig = GistSyncConfig | CloudflareSyncConfig | NoSyncConfig;

const STORAGE_KEY = "localticket_sync_config";

export function loadSyncConfig(): SyncConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as SyncConfig;
  } catch {}
  return { backend: "none" };
}

export function saveSyncConfig(cfg: SyncConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

// ─── Sync result ─────────────────────────────────────────────────────────────

export interface SyncResult {
  ok: boolean;
  message: string;
  gistId?: string;  // returned after first Gist creation
}

// ─── GitHub Gist adapter ─────────────────────────────────────────────────────

async function gistPush(cfg: GistSyncConfig, data: AppData): Promise<SyncResult> {
  const body = JSON.stringify(data, null, 2);
  const headers = {
    "Authorization": `Bearer ${cfg.token}`,
    "Accept": "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  if (!cfg.gistId) {
    // Create new gist
    const res = await fetch("https://api.github.com/gists", {
      method: "POST",
      headers,
      body: JSON.stringify({
        description: "LocalTicket data — managed by LocalTicket app",
        public: false,
        files: { [cfg.filename]: { content: body } },
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, message: `GitHub API error: ${res.status} ${(err as any)?.message ?? ""}` };
    }
    const gist = await res.json() as { id: string };
    return { ok: true, message: "Gist created successfully", gistId: gist.id };
  } else {
    // Update existing gist
    const res = await fetch(`https://api.github.com/gists/${cfg.gistId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        files: { [cfg.filename]: { content: body } },
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, message: `GitHub API error: ${res.status} ${(err as any)?.message ?? ""}` };
    }
    return { ok: true, message: "Gist updated" };
  }
}

async function gistPull(cfg: GistSyncConfig): Promise<{ ok: boolean; data?: AppData; message: string }> {
  if (!cfg.gistId) return { ok: false, message: "No Gist ID configured. Push first to create one." };

  const res = await fetch(`https://api.github.com/gists/${cfg.gistId}`, {
    headers: {
      "Authorization": `Bearer ${cfg.token}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) return { ok: false, message: `GitHub API error: ${res.status}` };

  const gist = await res.json() as { files: Record<string, { content: string }> };
  const file = gist.files[cfg.filename];
  if (!file) return { ok: false, message: `File "${cfg.filename}" not found in Gist` };

  try {
    const data = JSON.parse(file.content) as AppData;
    return { ok: true, data, message: "Pulled from Gist" };
  } catch {
    return { ok: false, message: "Failed to parse Gist content as JSON" };
  }
}

// ─── Cloudflare KV Worker adapter ────────────────────────────────────────────
//
// The Worker must expose two endpoints:
//   GET  /  → returns the stored JSON
//   PUT  /  → body is the JSON to store (Authorization: Bearer <secret>)
//
// A minimal Worker script is provided in the AI Agent Setup panel.

async function kvPush(cfg: CloudflareSyncConfig, data: AppData): Promise<SyncResult> {
  const url = cfg.workerUrl.replace(/\/$/, "");
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${cfg.secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, message: `Worker error: ${res.status} ${text}` };
  }
  return { ok: true, message: "Pushed to Cloudflare KV" };
}

async function kvPull(cfg: CloudflareSyncConfig): Promise<{ ok: boolean; data?: AppData; message: string }> {
  const url = cfg.workerUrl.replace(/\/$/, "");
  const res = await fetch(url, {
    headers: { "Authorization": `Bearer ${cfg.secret}` },
  });
  if (!res.ok) return { ok: false, message: `Worker error: ${res.status}` };
  try {
    const data = await res.json() as AppData;
    return { ok: true, data, message: "Pulled from Cloudflare KV" };
  } catch {
    return { ok: false, message: "Failed to parse Worker response as JSON" };
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function syncPush(cfg: SyncConfig, data: AppData): Promise<SyncResult> {
  if (cfg.backend === "none") return { ok: true, message: "No sync configured" };
  if (cfg.backend === "github_gist") return gistPush(cfg, data);
  if (cfg.backend === "cloudflare_kv") return kvPush(cfg, data);
  return { ok: false, message: "Unknown backend" };
}

export async function syncPull(cfg: SyncConfig): Promise<{ ok: boolean; data?: AppData; message: string }> {
  if (cfg.backend === "none") return { ok: false, message: "No sync configured" };
  if (cfg.backend === "github_gist") return gistPull(cfg);
  if (cfg.backend === "cloudflare_kv") return kvPull(cfg);
  return { ok: false, message: "Unknown backend" };
}

// ─── Cloudflare Worker template ──────────────────────────────────────────────
// Copy-paste this into a new Cloudflare Worker (wrangler or dashboard).
// Set the KV binding name to TICKETS and add a secret BEARER_TOKEN.

export const CLOUDFLARE_WORKER_TEMPLATE = `// LocalTicket KV Worker
// 1. Create a KV namespace called LOCALTICKET in your Cloudflare dashboard
// 2. Bind it to this Worker as: Variable name = TICKETS
// 3. Add a secret env var: BEARER_TOKEN = <any strong random string>
// 4. Deploy and paste the Worker URL into LocalTicket → Settings → Sync

const DATA_KEY = "localticket_data";

export default {
  async fetch(request, env) {
    // CORS — allow the LocalTicket web app to call this Worker
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Auth check
    const auth = request.headers.get("Authorization") ?? "";
    if (auth !== \`Bearer \${env.BEARER_TOKEN}\`) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    if (request.method === "GET") {
      const value = await env.TICKETS.get(DATA_KEY);
      if (!value) return new Response("{}", { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(value, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (request.method === "PUT") {
      const body = await request.text();
      await env.TICKETS.put(DATA_KEY, body);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  },
};
`;
