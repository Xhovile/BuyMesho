import { useState } from "react";
import { Download, FileText, Loader2, X } from "lucide-react";
import { auth } from "../../firebase";
import type { MessageThreadItem } from "../../types";

type AttachmentMessage = Pick<
  MessageThreadItem,
  "id" | "conversation_id" | "message_type" | "attachment_url" | "attachment_name" | "attachment_mime" | "attachment_size"
>;

type Props = {
  message: AttachmentMessage;
  mine?: boolean;
};

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function attachmentDownloadUrl(message: AttachmentMessage) {
  return `/api/messages/${message.conversation_id}/messages/${message.id}/attachment`;
}

export default function MessageAttachmentViewer({ message, mine = false }: Props) {
  const [imageOpen, setImageOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownload = async () => {
    if (downloading) return;

    const user = auth.currentUser;
    if (!user) {
      setDownloadError("Please sign in again to download this file.");
      return;
    }

    setDownloading(true);
    setDownloadError(null);

    try {
      let token = await user.getIdToken();
      let response = await fetch(attachmentDownloadUrl(message), {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: "same-origin",
      });

      if (response.status === 401) {
        token = await user.getIdToken(true);
        response = await fetch(attachmentDownloadUrl(message), {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          credentials: "same-origin",
        });
      }

      if (!response.ok) {
        let errorMessage = "Download failed.";
        try {
          const payload = await response.json();
          if (typeof payload?.error === "string" && payload.error.trim()) errorMessage = payload.error.trim();
        } catch {
          // Keep the generic download error.
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = message.attachment_name || "attachment";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : "Download failed.");
    } finally {
      setDownloading(false);
    }
  };

  if (!message.attachment_url) return null;

  if (message.message_type === "image") {
    return (
      <>
        <button
          type="button"
          onClick={() => setImageOpen(true)}
          className="mt-2 block max-w-[20rem] overflow-hidden rounded-2xl text-left"
          aria-label={`Open ${message.attachment_name || "image attachment"}`}
        >
          <img
            src={message.attachment_url}
            alt={message.attachment_name || "Image attachment"}
            className="max-h-80 w-full object-cover transition-opacity hover:opacity-95"
            loading="lazy"
          />
        </button>
        {imageOpen ? (
          <div
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4"
            role="dialog"
            aria-modal="true"
            aria-label={message.attachment_name || "Image preview"}
            onClick={() => setImageOpen(false)}
          >
            <button
              type="button"
              onClick={() => setImageOpen(false)}
              className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white backdrop-blur hover:bg-white/20"
              aria-label="Close image preview"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={message.attachment_url}
              alt={message.attachment_name || "Image attachment"}
              className="max-h-[90vh] max-w-[94vw] rounded-2xl object-contain"
              onClick={(event) => event.stopPropagation()}
            />
          </div>
        ) : null}
      </>
    );
  }

  if (message.message_type === "video") {
    return (
      <video
        className="mt-2 max-h-80 w-full max-w-[22rem] rounded-2xl bg-black"
        controls
        preload="metadata"
        src={message.attachment_url}
      >
        Your browser does not support video playback.
      </video>
    );
  }

  return (
    <div className="mt-2 max-w-[22rem]">
      <button
        type="button"
        onClick={() => void handleDownload()}
        disabled={downloading}
        aria-busy={downloading}
        aria-label={`Download ${message.attachment_name || "file attachment"}`}
        className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors disabled:cursor-wait disabled:opacity-80 ${
          mine ? "border-white/10 bg-white/10 hover:bg-white/15" : "border-zinc-300 bg-white hover:bg-zinc-50"
        }`}
      >
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
          mine ? "bg-white/10 text-white" : "bg-zinc-100 text-zinc-700"
        }`}>
          <FileText className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-black">{message.attachment_name || "File attachment"}</span>
          <span className={`mt-0.5 block text-[11px] font-semibold ${
            mine ? "text-zinc-300" : "text-zinc-500"
          }`}>{message.attachment_size ? formatFileSize(Number(message.attachment_size)) : "File"}</span>
        </span>
        <span className={`inline-flex min-w-[5.5rem] shrink-0 items-center justify-center gap-1 rounded-xl px-2.5 py-2 text-xs font-black ${
          mine ? "bg-white text-zinc-900" : "bg-zinc-900 text-white"
        }`}>
          {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-label="Downloading" /> : <Download className="h-3.5 w-3.5" />}
          <span>{downloading ? "Downloading" : "Download"}</span>
        </span>
      </button>
      {downloadError ? (
        <p className={`mt-1 px-1 text-[11px] font-semibold ${
          mine ? "text-red-200" : "text-red-600"
        }`}>{downloadError}</p>
      ) : null}
    </div>
  );
}