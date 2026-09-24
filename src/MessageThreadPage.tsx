import { useEffect, useRef, useState, type ChangeEvent, type MouseEvent } from "react";
import {
  ArrowLeft,
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  SendHorizontal,
  ShieldAlert,
  Video,
  X,
} from "lucide-react";
import type { Conversation, MessageThreadItem, MessageReportReason } from "./types";
import { useAuthUser } from "./hooks/useAuthUser";
import { EVENTS_PATH, navigateToLogin, navigateToListingDetails, navigateToPath, navigateToSellerProfile } from "./lib/appNavigation";
import { navigateToMessages, getConversationIdFromUrl, consumePendingConversation } from "./lib/messagesNavigation";
import { deleteConversation, fetchConversation, markConversationRead, sendMessage } from "./lib/messages";
import { blockConversationUser, markConversationSpam, reportConversation, unblockConversationUser } from "./lib/messageModeration";
import ConversationActionsMenu from "./components/messages/ConversationActionsMenu";
import ActionConfirmDialog from "./components/messages/ActionConfirmDialog";
import MessageReportDialog from "./components/messages/MessageReportDialog";
import MessageAttachmentPicker, { type MessageAttachmentCategory } from "./components/messages/MessageAttachmentPicker";

const MAX_MESSAGE_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const ACCEPT_BY_CATEGORY: Record<MessageAttachmentCategory, string> = {
  image: "image/*",
  video: "video/*",
  file: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/csv",
    "text/plain",
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".csv",
    ".txt",
  ].join(","),
};

const FILE_MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  csv: "text/csv",
  txt: "text/plain",
};

function timeLabel(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

function hasBlockedState(conversation: Conversation | null) {
  return Boolean(conversation?.blocked_by_you || conversation?.blocked_by_other);
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExtension(filename: string) {
  const match = String(filename || "").toLowerCase().match(/\.([a-z0-9]{1,12})$/);
  return match?.[1] ?? "";
}

function resolveAttachmentMime(file: File) {
  const mime = String(file.type || "").trim().toLowerCase();
  if (mime && mime !== "application/octet-stream") return mime;
  return FILE_MIME_BY_EXTENSION[getFileExtension(file.name)] ?? mime;
}

function getCategoryForMime(mime: string): MessageAttachmentCategory {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "file";
}

function fileMatchesCategory(file: File, category: MessageAttachmentCategory) {
  const mime = resolveAttachmentMime(file);
  if (!mime || mime === "image/svg+xml") return false;
  if (category === "image") return mime.startsWith("image/");
  if (category === "video") return mime.startsWith("video/");
  return Object.values(FILE_MIME_BY_EXTENSION).includes(mime);
}

function renderMessageAttachment(message: MessageThreadItem, mine: boolean) {
  if (!message.attachment_url) return null;

  if (message.message_type === "image") {
    return (
      <a href={message.attachment_url} target="_blank" rel="noreferrer" className="mt-2 block overflow-hidden rounded-2xl">
        <img src={message.attachment_url} alt={message.attachment_name || "Image attachment"} className="max-h-80 w-full max-w-[20rem] object-cover" loading="lazy" />
      </a>
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
      target="_blank"
      rel="noreferrer"
      className={`mt-2 flex max-w-[22rem] items-center gap-3 rounded-2xl border px-3 py-3 transition-colors ${
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
        }`}>{message.attachment_size ? formatFileSize(message.attachment_size) : "File"}</span>
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

export default function MessageThreadPage() {
  const { user, loading: authLoading } = useAuthUser();
  const [conversationId] = useState<number | null>(() => getConversationIdFromUrl());
  const preloadedConversation = consumePendingConversation(conversationId);
  const [loading, setLoading] = useState(!preloadedConversation);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [conversation, setConversation] = useState<Conversation | null>(preloadedConversation);
  const [messages, setMessages] = useState<MessageThreadItem[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [attachmentPickerOpen, setAttachmentPickerOpen] = useState(false);
  const [attachmentCategory, setAttachmentCategory] = useState<MessageAttachmentCategory | null>(null);
  const [pendingAttachment, setPendingAttachment] = useState<File | null>(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState<string | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);

  const reloadConversation = async (id: number) => {
    const result = await fetchConversation(id);
    setConversation(result.conversation);
    setMessages(result.messages);
    await markConversationRead(id);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigateToLogin(); return; }
    if (!conversationId || Number.isNaN(conversationId)) { navigateToMessages(); return; }

    let cancelled = false;
    const load = async () => {
      setStatus(null);
      try {
        const result = await fetchConversation(conversationId);
        if (cancelled) return;
        setConversation(result.conversation);
        setMessages(result.messages);
        await markConversationRead(conversationId);
      } catch (error: any) {
        if (!cancelled) setStatus(error?.message || "Failed to load conversation.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (preloadedConversation) {
      setLoading(false);
      void load();
    } else {
      setLoading(true);
      void load();
    }

    return () => { cancelled = true; };
  }, [authLoading, user, conversationId]);

  useEffect(() => {
    if (loading || authLoading || !conversation) return;
    const raf = window.requestAnimationFrame(() => {
      threadEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [messages, loading, authLoading, conversation]);

  useEffect(() => {
    if (!pendingAttachment) {
      setAttachmentPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingAttachment);
    setAttachmentPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingAttachment]);

  const handleAttachmentCategory = (category: MessageAttachmentCategory) => {
    setAttachmentPickerOpen(false);
    setAttachmentCategory(category);
    setAttachmentError(null);
    const input = attachmentInputRef.current;
    if (!input) return;
    input.accept = ACCEPT_BY_CATEGORY[category];
    input.value = "";
    window.setTimeout(() => input.click(), 0);
  };

  const handleAttachmentChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file || !attachmentCategory) return;

    if (file.size > MAX_MESSAGE_ATTACHMENT_SIZE) {
      setAttachmentError("Attachments must be 10 MB or smaller.");
      setPendingAttachment(null);
      return;
    }

    if (!fileMatchesCategory(file, attachmentCategory)) {
      setAttachmentError(`Please choose a valid ${attachmentCategory === "image" ? "image" : attachmentCategory === "video" ? "video" : "file"}.`);
      setPendingAttachment(null);
      return;
    }

    setAttachmentError(null);
    setPendingAttachment(file);
  };

  const removePendingAttachment = () => {
    setPendingAttachment(null);
    setAttachmentCategory(null);
    setAttachmentError(null);
    if (attachmentInputRef.current) attachmentInputRef.current.value = "";
  };

  const handleSend = async () => {
    if (!conversationId || (!draft.trim() && !pendingAttachment)) return;
    setBusy(true);
    setStatus(null);
    try {
      const result = await sendMessage(conversationId, draft.trim(), pendingAttachment);
      setConversation(result.conversation);
      setMessages((prev) => [...prev, result.message]);
      setDraft("");
      removePendingAttachment();
      window.requestAnimationFrame(() => {
        threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      });
    } catch (error: any) {
      setStatus(error?.message || "Failed to send message.");
    } finally {
      setBusy(false);
    }
  };

  const confirmDeleteChat = async () => {
    if (!conversationId) return;
    setBusy(true);
    try {
      await deleteConversation(conversationId);
      setDeleteOpen(false);
      navigateToMessages();
    } catch (error: any) {
      setStatus(error?.message || "Failed to delete chat.");
    } finally {
      setBusy(false);
    }
  };

  const confirmBlock = async () => {
    if (!conversationId) return;
    setBusy(true);
    try {
      await blockConversationUser(conversationId, { scope: "messages" });
      await reloadConversation(conversationId);
      setBlockOpen(false);
    } catch (error: any) {
      setStatus(error?.message || "Failed to block user.");
    } finally {
      setBusy(false);
    }
  };

  const confirmReport = async (payload: { reason: MessageReportReason; details: string }) => {
    if (!conversationId) return;
    setBusy(true);
    try {
      await reportConversation(conversationId, payload);
      setStatus("Conversation reported.");
      setReportOpen(false);
    } catch (error: any) {
      setStatus(error?.message || "Failed to report conversation.");
    } finally {
      setBusy(false);
    }
  };

  const handleSpam = async () => {
    if (!conversationId) return;
    setBusy(true);
    try {
      await markConversationSpam(conversationId);
      setStatus("Marked as spam and sent to moderation.");
    } catch (error: any) {
      setStatus(error?.message || "Failed to mark as spam.");
    } finally {
      setBusy(false);
    }
  };

  const handleUnblock = async () => {
    if (!conversationId) return;
    setBusy(true);
    try {
      await unblockConversationUser(conversationId);
      await reloadConversation(conversationId);
    } catch (error: any) {
      setStatus(error?.message || "Failed to unblock user.");
    } finally {
      setBusy(false);
    }
  };

  const isPlainLeftClick = (event: MouseEvent<HTMLAnchorElement>) =>
    event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

  if (loading || authLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-zinc-100"><Loader2 className="h-10 w-10 animate-spin text-zinc-700" /></div>;
  }

  if (!conversation) {
    return (
      <div className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-900 sm:px-6 lg:px-8">
        <button type="button" onClick={() => navigateToMessages()} className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-bold text-white">
          <ArrowLeft className="h-4 w-4" />Back to inbox
        </button>
        {status ? <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{status}</div> : null}
      </div>
    );
  }

  const blocked = hasBlockedState(conversation);
  const canReply = conversation.can_reply !== false && !blocked;
  const threadType = String(conversation.thread_type || "listing");
  const isEventThread = threadType === "event" && !!conversation.event;
  const isSellerThread = threadType === "seller";
  const isOrderThread = threadType === "order" && !!conversation.order_id;
  const listingName = conversation.listing?.name || "Listing";
  const sellerName = conversation.seller?.business_name || "Seller";
  const eventTitle = conversation.event?.title || "Event";
  const listingPrice = Number(conversation.listing?.price || 0);
  const sellerProfileHref = `/seller?uid=${encodeURIComponent(conversation.seller.uid)}`;

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-zinc-100 text-zinc-900">
      <header className="z-20 shrink-0 border-b border-zinc-200 bg-zinc-100/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-4">
          <button type="button" onClick={() => navigateToMessages()} className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </button>

          {isOrderThread ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-extrabold text-zinc-900 sm:text-lg">Dispute conversation</p>
              <p className="text-sm font-semibold text-zinc-500">Order {conversation.order_id}</p>
            </div>
          ) : isSellerThread ? (
            <a href={sellerProfileHref} onClick={(event) => { if (!isPlainLeftClick(event)) return; event.preventDefault(); navigateToSellerProfile(conversation.seller.uid); }} className="min-w-0 flex-1 text-left">
              <p className="truncate text-base font-extrabold text-zinc-900 sm:text-lg">{sellerName}</p>
              <p className="text-sm font-semibold text-zinc-500">Seller profile</p>
            </a>
          ) : isEventThread ? (
            <a href={`${EVENTS_PATH}?event=${conversation.event?.id}`} onClick={(event) => { if (!isPlainLeftClick(event)) return; event.preventDefault(); if (conversation.event) navigateToPath(`${EVENTS_PATH}?event=${conversation.event.id}`); }} className="min-w-0 flex-1 text-left">
              <p className="truncate text-base font-extrabold text-zinc-900 sm:text-lg">{eventTitle}</p>
              <p className="text-sm font-semibold text-zinc-500">{listingPrice > 0 ? `MWK ${listingPrice.toLocaleString()}` : "Free event"}</p>
            </a>
          ) : (
            <a href={`/listing?listing=${conversation.listing.id}`} onClick={(event) => { if (!isPlainLeftClick(event)) return; event.preventDefault(); navigateToListingDetails(conversation.listing.id, 0); }} className="min-w-0 flex-1 text-left">
              <p className="truncate text-base font-extrabold text-zinc-900 sm:text-lg">{listingName}</p>
              <p className="text-sm font-semibold text-zinc-500">{listingPrice > 0 ? `MWK ${listingPrice.toLocaleString()}` : "Price unavailable"}</p>
            </a>
          )}

          {isOrderThread || !isEventThread ? (
            <a href={sellerProfileHref} onClick={(event) => { if (!isPlainLeftClick(event)) return; event.preventDefault(); navigateToSellerProfile(conversation.seller.uid); }} className="ml-auto max-w-[10rem] shrink-0 text-right sm:max-w-[14rem]">
              <p className="truncate text-sm font-bold text-zinc-900 sm:text-base">{sellerName}</p>
              <p className="text-[11px] font-semibold text-zinc-500">Seller profile</p>
            </a>
          ) : (
            <div className="ml-auto max-w-[10rem] shrink-0 text-right sm:max-w-[14rem]">
              <p className="truncate text-sm font-bold text-zinc-900 sm:text-base">{conversation.event?.organizer_name || sellerName}</p>
              <p className="text-[11px] font-semibold text-zinc-500">Event owner</p>
            </div>
          )}

          <ConversationActionsMenu
            className="ml-1 shrink-0"
            onDelete={() => setDeleteOpen(true)}
            onBlock={() => setBlockOpen(true)}
            onUnblock={handleUnblock}
            onReport={() => setReportOpen(true)}
            onSpam={handleSpam}
            blockedByYou={Boolean(conversation.blocked_by_you)}
            blockedByOther={Boolean(conversation.blocked_by_other)}
          />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {(conversation.blocked_by_you || conversation.blocked_by_other) ? (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <div className="flex items-center gap-2 font-semibold"><ShieldAlert className="h-4 w-4" />Messaging is restricted.</div>
            <p className="mt-1 text-xs">{conversation.blocked_by_you ? "You blocked this user. Unblock them from the actions menu if needed." : "This user blocked messaging. You cannot send new messages here."}</p>
          </div>
        ) : null}

        {status ? <div className="mx-4 mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{status}</div> : null}

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.length ? messages.map((msg) => {
            const mine = msg.sender_uid === user?.uid;
            return (
              <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] rounded-3xl px-4 py-3 text-sm ${mine ? "bg-zinc-900 text-white" : "bg-zinc-200 text-zinc-900"}`}>
                  {msg.body ? <p className="whitespace-pre-wrap break-words">{msg.body}</p> : null}
                  {renderMessageAttachment(msg, mine)}
                  <p className={`mt-2 text-[11px] ${mine ? "text-zinc-300" : "text-zinc-500"}`}>{timeLabel(msg.created_at)}</p>
                </div>
              </div>
            );
          }) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500">No messages yet.</div>
          )}
          <div ref={threadEndRef} />
        </div>

        <div className="shrink-0 border-t border-zinc-200 bg-white px-4 py-4">
          {pendingAttachment ? (
            <div className="mb-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
              <div className="flex items-center gap-3">
                {attachmentCategory === "image" && attachmentPreviewUrl ? (
                  <img src={attachmentPreviewUrl} alt="Selected attachment preview" className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
                ) : attachmentCategory === "video" && attachmentPreviewUrl ? (
                  <video src={attachmentPreviewUrl} className="h-16 w-16 shrink-0 rounded-2xl bg-black object-cover" muted playsInline />
                ) : (
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-zinc-700">
                    <FileText className="h-6 w-6" />
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-zinc-900">{pendingAttachment.name}</p>
                  <p className="mt-1 text-xs font-semibold text-zinc-500">{formatFileSize(pendingAttachment.size)}</p>
                </div>

                <button type="button" onClick={removePendingAttachment} disabled={busy} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-zinc-500 hover:bg-zinc-100 disabled:opacity-40" aria-label="Remove attachment">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          ) : null}

          {attachmentError ? <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700">{attachmentError}</div> : null}

          <div className="flex items-end gap-3">
            <button
              type="button"
              onClick={() => setAttachmentPickerOpen(true)}
              disabled={!canReply || busy}
              aria-label="Add attachment"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-400"
            >
              <Paperclip className="h-5 w-5" />
            </button>

            <input
              ref={attachmentInputRef}
              type="file"
              className="hidden"
              accept={attachmentCategory ? ACCEPT_BY_CATEGORY[attachmentCategory] : ACCEPT_BY_CATEGORY.file}
              onChange={handleAttachmentChange}
            />

            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={canReply ? "Type your message..." : "Messaging is blocked."}
              disabled={!canReply}
              className="min-h-12 flex-1 resize-none rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none disabled:bg-zinc-100 disabled:text-zinc-500"
            />

            <button
              type="button"
              disabled={busy || (!draft.trim() && !pendingAttachment) || !canReply}
              onClick={() => void handleSend()}
              className="inline-flex items-center justify-center rounded-2xl bg-zinc-900 px-4 py-3 text-white disabled:opacity-50"
              aria-label="Send message"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-label="Sending" /> : <SendHorizontal className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      <MessageAttachmentPicker
        open={attachmentPickerOpen}
        disabled={busy || !canReply}
        onClose={() => setAttachmentPickerOpen(false)}
        onSelect={handleAttachmentCategory}
      />

      <ActionConfirmDialog open={deleteOpen} title="Delete chat" description="This removes the conversation from your inbox view. The server keeps it for moderation and dispute handling." confirmLabel="Delete chat" busy={busy} onClose={() => setDeleteOpen(false)} onConfirm={confirmDeleteChat} />
      <ActionConfirmDialog open={blockOpen} title="Block user" description="Blocking stops new messages and hides future chat access from this user." confirmLabel="Block user" busy={busy} onClose={() => setBlockOpen(false)} onConfirm={confirmBlock} />
      <MessageReportDialog open={reportOpen} busy={busy} onClose={() => setReportOpen(false)} onSubmit={confirmReport} />
    </div>
  );
}
