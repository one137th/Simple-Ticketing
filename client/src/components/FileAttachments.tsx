/**
 * FileAttachments — Upload and list file attachments for a ticket
 * Only shown when a cloud storage provider is connected
 */

import { useState, useRef } from "react";
import { Paperclip, Upload, Trash2, ExternalLink, Loader2, FileText, Image, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getFilesForTicket,
  getCloudConfigs,
  getActiveProvider,
  type CloudFile,
  googleUploadFile,
  googleDeleteFile,
  onedriveUploadFile,
  onedriveDeleteFile,
  dropboxUploadFile,
  dropboxDeleteFile,
} from "@/lib/cloudStorage";

interface FileAttachmentsProps {
  ticketId: string;
}

function fileIcon(mimeType?: string) {
  if (!mimeType) return <FileText className="w-3.5 h-3.5" />;
  if (mimeType.startsWith("image/")) return <Image className="w-3.5 h-3.5" />;
  if (mimeType.includes("zip") || mimeType.includes("archive")) return <Archive className="w-3.5 h-3.5" />;
  return <FileText className="w-3.5 h-3.5" />;
}

function formatBytes(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileAttachments({ ticketId }: FileAttachmentsProps) {
  const [files, setFiles] = useState<CloudFile[]>(() => getFilesForTicket(ticketId));
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeProvider = getActiveProvider();
  const configs = getCloudConfigs();

  if (!activeProvider) {
    return (
      <div className="px-4 py-3 border-b border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Attachments</p>
        <p className="text-xs text-muted-foreground italic">
          Connect a cloud storage provider in Settings → Cloud Storage to enable file attachments.
        </p>
      </div>
    );
  }

  const cfg = configs[activeProvider];
  const folderName = cfg?.folderName ?? "LocalTicket";

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { toast.error("File too large (max 50 MB)"); return; }
    setUploading(true);
    try {
      let cf: CloudFile;
      if (activeProvider === "google") cf = await googleUploadFile(cfg!.clientId, folderName, file, ticketId);
      else if (activeProvider === "onedrive") cf = await onedriveUploadFile(cfg!.clientId, folderName, file, ticketId);
      else cf = await dropboxUploadFile(cfg!.clientId, folderName, file, ticketId);
      setFiles(getFilesForTicket(ticketId));
      toast.success(`Uploaded ${file.name}`);
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDelete = async (file: CloudFile) => {
    setDeleting(file.id);
    try {
      if (file.provider === "google") await googleDeleteFile(file.id);
      else if (file.provider === "onedrive") await onedriveDeleteFile(file.id);
      else await dropboxDeleteFile(file.id);
      setFiles(getFilesForTicket(ticketId));
      toast.success("File deleted");
    } catch (err: any) {
      toast.error("Delete failed: " + err.message);
    } finally {
      setDeleting(null);
    }
  };

  const providerLabel = activeProvider === "google" ? "Google Drive" : activeProvider === "onedrive" ? "OneDrive" : "Dropbox";

  return (
    <div className="px-4 py-3 border-b border-border">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Attachments <span className="font-normal normal-case">via {providerLabel}</span>
        </p>
        <Button
          size="sm"
          variant="outline"
          className="h-6 text-xs px-2 gap-1"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
          {uploading ? "Uploading…" : "Attach file"}
        </Button>
        <input ref={inputRef} type="file" className="hidden" onChange={handleUpload} />
      </div>

      {files.length === 0 ? (
        <p className="text-xs text-muted-foreground/60 italic">No attachments yet</p>
      ) : (
        <div className="space-y-1.5">
          {files.map((file) => (
            <div key={file.id} className="flex items-center gap-2 group p-1.5 rounded hover:bg-secondary/40 transition-colors">
              <span className="text-muted-foreground">{fileIcon(file.mimeType)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{file.name}</p>
                {file.size && <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>}
              </div>
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 rounded text-muted-foreground hover:text-primary transition-colors"
                title="Open file"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                onClick={() => handleDelete(file)}
                disabled={deleting === file.id}
                className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                title="Delete file"
              >
                {deleting === file.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
