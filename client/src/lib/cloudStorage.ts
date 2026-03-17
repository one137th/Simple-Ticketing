/**
 * cloudStorage.ts — Browser-only cloud storage adapters
 *
 * Supported providers:
 *  - Google Drive  (OAuth PKCE via Google Identity Services popup)
 *  - OneDrive / SharePoint  (OAuth PKCE via MSAL popup)
 *  - Dropbox  (OAuth PKCE via Dropbox SDK popup)
 *
 * Each adapter exposes:
 *  - connect()          → opens OAuth popup, stores token in localStorage
 *  - disconnect()       → clears stored token
 *  - isConnected()      → boolean
 *  - readJsonFile()     → downloads the data JSON → AppData string
 *  - writeJsonFile()    → uploads the data JSON
 *  - uploadFile(file)   → uploads a File object, returns { id, name, url }
 *  - deleteFile(id)     → deletes a file by provider ID
 *  - listFiles(ticketId)→ lists attachments for a ticket
 */

export type CloudProvider = "google" | "onedrive" | "dropbox";

export interface CloudFile {
  id: string;
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
  provider: CloudProvider;
  ticketId: string;
}

export interface CloudProviderConfig {
  provider: CloudProvider;
  clientId: string;
  /** For OneDrive: tenant ID or "common" */
  tenantId?: string;
  /** Folder name in the provider root to store JSON + attachments */
  folderName?: string;
}

const STORAGE_KEY = "localticket_cloud_configs";
const TOKEN_KEY = "localticket_cloud_tokens";
const FILES_KEY = "localticket_cloud_files";

// ── Config persistence ────────────────────────────────────────────────────────

export function getCloudConfigs(): Partial<Record<CloudProvider, CloudProviderConfig>> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch { return {}; }
}

export function saveCloudConfig(config: CloudProviderConfig) {
  const all = getCloudConfigs();
  all[config.provider] = config;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function removeCloudConfig(provider: CloudProvider) {
  const all = getCloudConfigs();
  delete all[provider];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

// ── Token persistence ─────────────────────────────────────────────────────────

function getTokens(): Partial<Record<CloudProvider, { accessToken: string; expiresAt: number }>> {
  try {
    return JSON.parse(localStorage.getItem(TOKEN_KEY) ?? "{}");
  } catch { return {}; }
}

function saveToken(provider: CloudProvider, accessToken: string, expiresIn = 3600) {
  const all = getTokens();
  all[provider] = { accessToken, expiresAt: Date.now() + expiresIn * 1000 };
  localStorage.setItem(TOKEN_KEY, JSON.stringify(all));
}

function clearToken(provider: CloudProvider) {
  const all = getTokens();
  delete all[provider];
  localStorage.setItem(TOKEN_KEY, JSON.stringify(all));
}

function getValidToken(provider: CloudProvider): string | null {
  const all = getTokens();
  const t = all[provider];
  if (!t) return null;
  if (Date.now() > t.expiresAt - 60_000) return null; // 1 min buffer
  return t.accessToken;
}

// ── File metadata persistence ─────────────────────────────────────────────────

export function getCloudFiles(): CloudFile[] {
  try {
    return JSON.parse(localStorage.getItem(FILES_KEY) ?? "[]");
  } catch { return []; }
}

export function addCloudFile(file: CloudFile) {
  const all = getCloudFiles();
  all.push(file);
  localStorage.setItem(FILES_KEY, JSON.stringify(all));
}

export function removeCloudFile(fileId: string) {
  const all = getCloudFiles().filter((f) => f.id !== fileId);
  localStorage.setItem(FILES_KEY, JSON.stringify(all));
}

export function getFilesForTicket(ticketId: string): CloudFile[] {
  return getCloudFiles().filter((f) => f.ticketId === ticketId);
}

// ── PKCE helpers ──────────────────────────────────────────────────────────────

async function generateCodeVerifier(): Promise<string> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...Array.from(array)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...Array.from(new Uint8Array(digest))))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/** Opens a popup and waits for the OAuth redirect to bring back a token */
function openOAuthPopup(url: string, expectedOrigin: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const popup = window.open(url, "oauth_popup", "width=600,height=700,scrollbars=yes");
    if (!popup) { reject(new Error("Popup blocked — please allow popups for this site")); return; }

    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        window.removeEventListener("message", handler);
        reject(new Error("OAuth popup was closed before completing"));
      }
    }, 500);

    const handler = (event: MessageEvent) => {
      if (event.origin !== expectedOrigin) return;
      if (event.data?.type !== "oauth_callback") return;
      clearInterval(timer);
      window.removeEventListener("message", handler);
      popup.close();
      if (event.data.error) reject(new Error(event.data.error));
      else resolve(event.data.accessToken);
    };
    window.addEventListener("message", handler);
  });
}

// ── Google Drive ──────────────────────────────────────────────────────────────

const GOOGLE_SCOPES = "https://www.googleapis.com/auth/drive.file";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export async function googleConnect(clientId: string): Promise<void> {
  const verifier = await generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const redirectUri = `${window.location.origin}/oauth-callback.html`;
  sessionStorage.setItem("pkce_verifier_google", verifier);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES,
    code_challenge: challenge,
    code_challenge_method: "S256",
    access_type: "offline",
    prompt: "consent",
  });

  const token = await openOAuthPopup(`${GOOGLE_AUTH_URL}?${params}`, window.location.origin);
  saveToken("google", token, 3600);
}

export async function googleExchangeCode(clientId: string, code: string): Promise<string> {
  const verifier = sessionStorage.getItem("pkce_verifier_google") ?? "";
  const redirectUri = `${window.location.origin}/oauth-callback.html`;
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code, client_id: clientId, redirect_uri: redirectUri,
      code_verifier: verifier, grant_type: "authorization_code",
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error_description ?? data.error);
  saveToken("google", data.access_token, data.expires_in ?? 3600);
  return data.access_token;
}

async function googleGetOrCreateFolder(token: string, folderName: string): Promise<string> {
  // Search for existing folder
  const q = encodeURIComponent(`name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (data.files?.length > 0) return data.files[0].id;

  // Create folder
  const create = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: folderName, mimeType: "application/vnd.google-apps.folder" }),
  });
  const folder = await create.json();
  return folder.id;
}

export async function googleReadJson(clientId: string, folderName: string): Promise<string | null> {
  const token = getValidToken("google");
  if (!token) throw new Error("Not connected to Google Drive");
  const folderId = await googleGetOrCreateFolder(token, folderName);
  const q = encodeURIComponent(`name='localticket-data.json' and '${folderId}' in parents and trashed=false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!data.files?.length) return null;
  const fileId = data.files[0].id;
  const content = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return content.text();
}

export async function googleWriteJson(clientId: string, folderName: string, json: string): Promise<void> {
  const token = getValidToken("google");
  if (!token) throw new Error("Not connected to Google Drive");
  const folderId = await googleGetOrCreateFolder(token, folderName);

  // Check if file exists
  const q = encodeURIComponent(`name='localticket-data.json' and '${folderId}' in parents and trashed=false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  const blob = new Blob([json], { type: "application/json" });

  if (data.files?.length) {
    // Update existing
    const fileId = data.files[0].id;
    await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: blob,
    });
  } else {
    // Create new
    const meta = JSON.stringify({ name: "localticket-data.json", parents: [folderId] });
    const form = new FormData();
    form.append("metadata", new Blob([meta], { type: "application/json" }));
    form.append("file", blob);
    await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
  }
}

export async function googleUploadFile(clientId: string, folderName: string, file: File, ticketId: string): Promise<CloudFile> {
  const token = getValidToken("google");
  if (!token) throw new Error("Not connected to Google Drive");
  const folderId = await googleGetOrCreateFolder(token, folderName);
  const meta = JSON.stringify({ name: file.name, parents: [folderId] });
  const form = new FormData();
  form.append("metadata", new Blob([meta], { type: "application/json" }));
  form.append("file", file);
  const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,mimeType,webViewLink", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const data = await res.json();
  // Make file publicly readable
  await fetch(`https://www.googleapis.com/drive/v3/files/${data.id}/permissions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });
  const cf: CloudFile = {
    id: data.id, name: data.name,
    url: `https://drive.google.com/file/d/${data.id}/view`,
    size: data.size ? parseInt(data.size) : undefined,
    mimeType: data.mimeType, provider: "google", ticketId,
  };
  addCloudFile(cf);
  return cf;
}

export async function googleDeleteFile(fileId: string): Promise<void> {
  const token = getValidToken("google");
  if (!token) throw new Error("Not connected to Google Drive");
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  removeCloudFile(fileId);
}

// ── OneDrive / SharePoint ─────────────────────────────────────────────────────

const ONEDRIVE_SCOPES = "Files.ReadWrite offline_access";

export async function onedriveConnect(clientId: string, tenantId = "common"): Promise<void> {
  const verifier = await generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const redirectUri = `${window.location.origin}/oauth-callback.html`;
  sessionStorage.setItem("pkce_verifier_onedrive", verifier);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: ONEDRIVE_SCOPES,
    code_challenge: challenge,
    code_challenge_method: "S256",
    response_mode: "query",
  });

  const token = await openOAuthPopup(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params}`,
    window.location.origin
  );
  saveToken("onedrive", token, 3600);
}

export async function onedriveExchangeCode(clientId: string, tenantId: string, code: string): Promise<string> {
  const verifier = sessionStorage.getItem("pkce_verifier_onedrive") ?? "";
  const redirectUri = `${window.location.origin}/oauth-callback.html`;
  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code, client_id: clientId, redirect_uri: redirectUri,
      code_verifier: verifier, grant_type: "authorization_code",
      scope: ONEDRIVE_SCOPES,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error_description ?? data.error);
  saveToken("onedrive", data.access_token, data.expires_in ?? 3600);
  return data.access_token;
}

async function onedriveGetOrCreateFolder(token: string, folderName: string): Promise<string> {
  const res = await fetch(`https://graph.microsoft.com/v1.0/me/drive/root:/${folderName}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.ok) {
    const data = await res.json();
    return data.id;
  }
  // Create folder
  const create = await fetch("https://graph.microsoft.com/v1.0/me/drive/root/children", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: folderName, folder: {}, "@microsoft.graph.conflictBehavior": "rename" }),
  });
  const folder = await create.json();
  return folder.id;
}

export async function onedriveReadJson(clientId: string, folderName: string): Promise<string | null> {
  const token = getValidToken("onedrive");
  if (!token) throw new Error("Not connected to OneDrive");
  const res = await fetch(`https://graph.microsoft.com/v1.0/me/drive/root:/${folderName}/localticket-data.json:/content`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  return res.text();
}

export async function onedriveWriteJson(clientId: string, folderName: string, json: string): Promise<void> {
  const token = getValidToken("onedrive");
  if (!token) throw new Error("Not connected to OneDrive");
  await fetch(`https://graph.microsoft.com/v1.0/me/drive/root:/${folderName}/localticket-data.json:/content`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: json,
  });
}

export async function onedriveUploadFile(clientId: string, folderName: string, file: File, ticketId: string): Promise<CloudFile> {
  const token = getValidToken("onedrive");
  if (!token) throw new Error("Not connected to OneDrive");
  const res = await fetch(`https://graph.microsoft.com/v1.0/me/drive/root:/${folderName}/${file.name}:/content`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  const data = await res.json();
  // Get share link
  const shareRes = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${data.id}/createLink`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "view", scope: "anonymous" }),
  });
  const shareData = await shareRes.json();
  const cf: CloudFile = {
    id: data.id, name: data.name,
    url: shareData.link?.webUrl ?? data.webUrl ?? "",
    size: data.size, mimeType: file.type, provider: "onedrive", ticketId,
  };
  addCloudFile(cf);
  return cf;
}

export async function onedriveDeleteFile(fileId: string): Promise<void> {
  const token = getValidToken("onedrive");
  if (!token) throw new Error("Not connected to OneDrive");
  await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${fileId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  removeCloudFile(fileId);
}

// ── Dropbox ───────────────────────────────────────────────────────────────────

export async function dropboxConnect(appKey: string): Promise<void> {
  const verifier = await generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const redirectUri = `${window.location.origin}/oauth-callback.html`;
  sessionStorage.setItem("pkce_verifier_dropbox", verifier);

  const params = new URLSearchParams({
    client_id: appKey,
    redirect_uri: redirectUri,
    response_type: "code",
    code_challenge: challenge,
    code_challenge_method: "S256",
    token_access_type: "offline",
  });

  const token = await openOAuthPopup(
    `https://www.dropbox.com/oauth2/authorize?${params}`,
    window.location.origin
  );
  saveToken("dropbox", token, 14400); // Dropbox tokens last 4h
}

export async function dropboxExchangeCode(appKey: string, code: string): Promise<string> {
  const verifier = sessionStorage.getItem("pkce_verifier_dropbox") ?? "";
  const redirectUri = `${window.location.origin}/oauth-callback.html`;
  const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code, client_id: appKey, redirect_uri: redirectUri,
      code_verifier: verifier, grant_type: "authorization_code",
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error_description ?? data.error);
  saveToken("dropbox", data.access_token, data.expires_in ?? 14400);
  return data.access_token;
}

export async function dropboxReadJson(appKey: string, folderName: string): Promise<string | null> {
  const token = getValidToken("dropbox");
  if (!token) throw new Error("Not connected to Dropbox");
  const res = await fetch("https://content.dropboxapi.com/2/files/download", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Dropbox-API-Arg": JSON.stringify({ path: `/${folderName}/localticket-data.json` }),
    },
  });
  if (res.status === 409) return null; // File not found
  return res.text();
}

export async function dropboxWriteJson(appKey: string, folderName: string, json: string): Promise<void> {
  const token = getValidToken("dropbox");
  if (!token) throw new Error("Not connected to Dropbox");
  await fetch("https://content.dropboxapi.com/2/files/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
      "Dropbox-API-Arg": JSON.stringify({
        path: `/${folderName}/localticket-data.json`,
        mode: "overwrite",
        autorename: false,
      }),
    },
    body: json,
  });
}

export async function dropboxUploadFile(appKey: string, folderName: string, file: File, ticketId: string): Promise<CloudFile> {
  const token = getValidToken("dropbox");
  if (!token) throw new Error("Not connected to Dropbox");
  const res = await fetch("https://content.dropboxapi.com/2/files/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
      "Dropbox-API-Arg": JSON.stringify({
        path: `/${folderName}/${ticketId}/${file.name}`,
        mode: "add",
        autorename: true,
      }),
    },
    body: file,
  });
  const data = await res.json();

  // Create shared link
  const linkRes = await fetch("https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ path: data.path_display, settings: { requested_visibility: "public" } }),
  });
  const linkData = await linkRes.json();
  const url = linkData.url?.replace("?dl=0", "?dl=1") ?? "";

  const cf: CloudFile = {
    id: data.id ?? data.path_display, name: data.name,
    url, size: data.size, mimeType: file.type, provider: "dropbox", ticketId,
  };
  addCloudFile(cf);
  return cf;
}

export async function dropboxDeleteFile(filePath: string): Promise<void> {
  const token = getValidToken("dropbox");
  if (!token) throw new Error("Not connected to Dropbox");
  await fetch("https://api.dropboxapi.com/2/files/delete_v2", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ path: filePath }),
  });
  removeCloudFile(filePath);
}

// ── Unified adapter ───────────────────────────────────────────────────────────

export function isProviderConnected(provider: CloudProvider): boolean {
  return getValidToken(provider) !== null;
}

export function disconnectProvider(provider: CloudProvider) {
  clearToken(provider);
}

export function getActiveProvider(): CloudProvider | null {
  const configs = getCloudConfigs();
  for (const p of ["google", "onedrive", "dropbox"] as CloudProvider[]) {
    if (configs[p] && isProviderConnected(p)) return p;
  }
  return null;
}

/**
 * Unified pull: reads localticket-data.json from the first connected provider.
 * Returns the raw JSON string, or null if no file exists yet.
 * Throws if no provider is connected or the read fails.
 */
export async function pullDataFromCloud(): Promise<string | null> {
  const provider = getActiveProvider();
  if (!provider) throw new Error("No cloud provider connected");
  const configs = getCloudConfigs();
  const cfg = configs[provider];
  if (!cfg) throw new Error("Provider config missing");
  const folder = cfg.folderName ?? "LocalTicket";

  if (provider === "google") return googleReadJson(cfg.clientId, folder);
  if (provider === "onedrive") return onedriveReadJson(cfg.clientId, folder);
  return dropboxReadJson(cfg.clientId, folder);
}

/** Returns a human-readable label for the active provider, or null */
export function getActiveProviderLabel(): string | null {
  const p = getActiveProvider();
  if (!p) return null;
  const labels: Record<CloudProvider, string> = {
    google: "Google Drive",
    onedrive: "OneDrive",
    dropbox: "Dropbox",
  };
  return labels[p];
}
