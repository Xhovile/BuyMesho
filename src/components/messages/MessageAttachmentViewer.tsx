import { useState } from "react";
import { Download, FileText, X } from "lucide-react";
import type { MessageThreadItem } from "../../types";

type AttachmentMessage = Pick<
  MessageThreadItem,
  "message_type" | "attachment_url" | "attachment_name" | "attachment_mime" | "attachment_size"
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

export default function MessageAttachmentViewer({ message, mine = false }: Props) {
  const [imageOpen, setImageOpen] = useState(false);

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
    <a
      href={message.attachment_url}
      download={message.attachment_name || undefined}
      className={`mt-2 flex max-w-[22rem] items-center gap-3 rounded-2xl border px-3 py-3 transition-colors ${
        mine ? "border-white/10 bg-white/10 hover:bg-white/15" : "border-zinc-300 bg-white hover:bg-zinc-50"
      }`}
      aria-label={`Download ${message.attachment_name || "file attachment"}`}
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
      <span className={`inline-flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-2 text-xs font-black ${
        mine ? "bg-white text-zinc-900" : "bg-zinc-900 text-white"
      }`}>
        <Download className="h-3.5 w-3.5" />
        Download
      </span>
    </a>
  );
}
