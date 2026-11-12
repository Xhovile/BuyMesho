import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, Loader2, MessageCircle, ShieldAlert } from "lucide-react";
import type { Conversation } from "./types";
import { useAuthUser } from "./hooks/useAuthUser";
import { navigateBackOrPath, navigateToLogin } from "./lib/appNavigation";
import { deleteConversation, fetchInbox, fetchSellerInbox } from "./lib/messages";
import {
  blockConversationUser,
  markConversationSpam,
  reportConversation,
  unblockConversationUser,
} from "./lib/messageModeration";
import { navigateToConversation } from "./lib/messagesNavigation";
import ConversationActionsMenu from "./components/messages/ConversationActionsMenu";
import ActionConfirmDialog from "./components/messages/ActionConfirmDialog";

type InboxFilter = "all" | "read" | "unread";

function timeLabel(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

function sortByLatest(a: Conversation, b: Conversation) {
  return (b.last_message_at || "").localeCompare(a.last_message_at || "");
}

function FilterMenu({ value, onChange }: { value: InboxFilter; onChange: (value: InboxFilter) => void }) {
  const [open, setOpen] = useState(false);
  const label = value === "all" ? "All" : value === "read" ? "Read" : "Unread";
  return (
    <div className="relative inline-block max-w-full">
      <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-2 rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface px-4 py-2 text-sm font-bold text-bm-text dark:text-bm-text-muted shadow-sm hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted">
        {label}<ChevronDown className="h-4 w-4" />
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-40 overflow-hidden rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface shadow-xl sm:right-0">
          {["all", "read", "unread"].map((item) => (
            <button key={item} type="button" onClick={() => { onChange(item as InboxFilter); setOpen(false); }} className={`block w-full px-4 py-3 text-left text-sm font-bold ${value === item ? "bg-bm-brand text-bm-on-brand" : "text-bm-text dark:text-bm-text-muted hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted"}`}>
              {item === "all" ? "All" : item === "read" ? "Read" : "Unread"}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ConversationRow({ convo, onOpen, onDelete, onBlock, onUnblock, onReport, onSpam }: { convo: Conversation; onOpen: () => void; onDelete: () => void; onBlock: () => void; onUnblock: () => void; onReport: () => void; onSpam: () => void }) {
  const unread = Number(convo.unread_count || 0);
  const blocked = Boolean(convo.blocked_by_you || convo.blocked_by_other);
  const threadType = String(convo.thread_type || "listing");
  const isEventThread = threadType === "event";
  const isSellerThread = threadType === "seller";
  const title = isEventThread ? convo.event?.title || convo.listing.name : isSellerThread ? convo.seller.business_name : convo.listing.name;
  const subtitle = isEventThread ? `Event · ${convo.event?.organizer_name || convo.seller.business_name}` : isSellerThread ? "Seller" : convo.seller.business_name;
  return (
    <div className="rounded-3xl border border-bm-border dark:border-bm-border bg-bm-surface p-4 shadow-sm transition-colors hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted">
      <div className="flex items-start gap-3">
        <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-start gap-3 text-left">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-bm-brand text-bm-on-brand"><MessageCircle className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-extrabold text-bm-text dark:text-bm-text">{title}</p><p className="truncate text-xs font-semibold text-bm-text-subtle dark:text-bm-text-subtle">{subtitle}</p></div><span className="shrink-0 text-[11px] font-semibold text-bm-text-subtle">{timeLabel(convo.last_message_at)}</span></div>
            <p className="mt-2 line-clamp-2 text-sm text-bm-text-muted dark:text-bm-text-muted">{convo.last_message_preview || "Start the conversation."}</p>
            {blocked ? <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-bm-warning-bg px-2.5 py-1 text-[11px] font-bold text-bm-warning"><ShieldAlert className="h-3.5 w-3.5" />Messaging restricted</div> : null}
            <div className="mt-3 flex items-center justify-between gap-2">{unread > 0 ? <span className="inline-flex rounded-full bg-bm-brand/10 px-2.5 py-1 text-[11px] font-bold text-bm-brand">{unread} unread</span> : <span className="inline-flex rounded-full bg-bm-surface-muted dark:bg-bm-surface-muted px-2.5 py-1 text-[11px] font-bold text-bm-text-subtle dark:text-bm-text-subtle">Read</span>}<span className="text-[11px] font-semibold text-bm-text-subtle">Open</span></div>
          </div>
        </button>
        <ConversationActionsMenu className="shrink-0" onDelete={onDelete} onBlock={onBlock} onUnblock={onUnblock} onReport={onReport} onSpam={onSpam} blockedByYou={Boolean(convo.blocked_by_you)} blockedByOther={Boolean(convo.blocked_by_other)} />
      </div>
    </div>
  );
}

export default function MessagesInboxPage() {
  const { user, loading: authLoading } = useAuthUser();
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [inbox, setInbox] = useState<Conversation[]>([]);
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null);
  const sellerScope = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("scope") === "seller";

  const fetchScopedInbox = async () => sellerScope ? fetchSellerInbox() : fetchInbox();
  const loadInbox = async () => setInbox(await fetchScopedInbox());

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigateToLogin(); return; }
    let cancelled = false;
    const load = async () => {
      try {
        const items = await fetchScopedInbox();
        if (!cancelled) setInbox(items);
      } catch (error: any) {
        if (!cancelled) setStatus(error?.message || "Failed to load messages.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [authLoading, user, sellerScope]);

  const counts = useMemo(() => { const unread = inbox.filter((item) => Number(item.unread_count || 0) > 0).length; return { all: inbox.length, unread, read: inbox.length - unread }; }, [inbox]);
  const filteredInbox = useMemo(() => { const sorted = [...inbox].sort(sortByLatest); if (filter === "unread") return sorted.filter((item) => Number(item.unread_count || 0) > 0); if (filter === "read") return sorted.filter((item) => Number(item.unread_count || 0) === 0); return sorted; }, [filter, inbox]);
  const withBusy = async (conversationId: number, callback: () => Promise<void>) => { setBusyId(conversationId); try { await callback(); } finally { setBusyId(null); } };
  const openDeleteDialog = (conversation: Conversation) => { setDeleteTarget(conversation); setDeleteOpen(true); };

  const confirmDeleteConversation = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try { await deleteConversation(deleteTarget.id); await loadInbox(); setDeleteOpen(false); setDeleteTarget(null); }
    catch (error: any) { setStatus(error?.message || "Failed to delete chat."); }
    finally { setBusyId(null); }
  };

  if (loading || authLoading) return <div className="flex min-h-screen items-center justify-center bg-bm-surface-muted dark:bg-bm-surface-muted"><Loader2 className="h-10 w-10 animate-spin text-bm-text-muted dark:text-bm-text-muted" /></div>;

  return (
    <div className="min-h-screen bg-bm-surface-muted dark:bg-bm-surface-muted text-bm-text dark:text-bm-text">
      <header className="buymesho-brand-header sticky top-0 z-40 border-b border-bm-border dark:border-bm-border bg-bm-surface-muted/95 backdrop-blur"><div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8"><div className="rounded-3xl border border-bm-border dark:border-bm-border bg-bm-surface px-4 py-2.5 shadow-sm"><div className="flex items-center justify-between gap-3"><button type="button" onClick={() => navigateBackOrPath("/")} className="inline-flex items-center gap-2 rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface-muted dark:bg-bm-surface-subtle px-4 py-2 text-sm font-bold text-bm-text dark:text-bm-text-muted hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted"><ArrowLeft className="h-4 w-4" />Back</button><p className="text-sm font-extrabold uppercase tracking-[0.2em] text-bm-text-subtle">Messages</p><div className="w-[72px]" /></div></div></div></header>
      <div className="pointer-events-none sticky top-[78px] z-30"><div className="mx-auto flex max-w-7xl justify-end px-4 pt-2 sm:px-6 lg:px-8 overflow-x-visible"><div className="pointer-events-auto relative"><FilterMenu value={filter} onChange={setFilter} /></div></div></div>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {status ? <div className="mb-6 rounded-2xl border border-bm-danger/25 bg-bm-danger-bg px-4 py-3 text-sm text-bm-danger">{status}</div> : null}
        <div className="space-y-3"><div className="rounded-3xl border border-bm-border dark:border-bm-border bg-bm-surface p-4 shadow-sm"><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-bm-text-subtle">Conversations</p></div>
          <div className="space-y-3">{filteredInbox.length ? filteredInbox.map((convo) => <div key={convo.id} className={busyId === convo.id ? "opacity-60 pointer-events-none" : ""}><ConversationRow convo={convo} onOpen={() => navigateToConversation(convo.id)} onDelete={() => openDeleteDialog(convo)} onBlock={() => { void withBusy(convo.id, async () => { await blockConversationUser(convo.id, { scope: "messages" }); await loadInbox(); }); }} onUnblock={() => { void withBusy(convo.id, async () => { await unblockConversationUser(convo.id); await loadInbox(); }); }} onReport={() => { void withBusy(convo.id, async () => { await reportConversation(convo.id, { reason: "spam", details: "Reported from inbox actions" }); setStatus("Conversation reported for moderation review."); }); }} onSpam={() => { void withBusy(convo.id, async () => { await markConversationSpam(convo.id); setStatus("Conversation flagged as spam."); }); }} /></div>) : <div className="rounded-3xl border border-dashed border-bm-border dark:border-bm-border bg-bm-surface p-6 text-center text-sm text-bm-text-subtle dark:text-bm-text-subtle">{filter === "unread" ? "No unread messages right now." : filter === "read" ? "No read conversations yet." : "No messages yet. Open a listing and tap Message in app to start."}</div>}</div>
          <div className="grid grid-cols-3 gap-2 pt-1 text-xs font-bold text-bm-text-subtle dark:text-bm-text-subtle"><span className="rounded-full bg-bm-surface px-3 py-2 text-center shadow-sm">All {counts.all}</span><span className="rounded-full bg-bm-surface px-3 py-2 text-center shadow-sm">Unread {counts.unread}</span><span className="rounded-full bg-bm-surface px-3 py-2 text-center shadow-sm">Read {counts.read}</span></div>
        </div>
      </main>
      <ActionConfirmDialog open={deleteOpen} title="Delete chat" description="This removes the conversation from your inbox view. The server keeps it for moderation and dispute handling." confirmLabel="Delete chat" busy={busyId !== null} onClose={() => { setDeleteOpen(false); setDeleteTarget(null); }} onConfirm={confirmDeleteConversation} />
    </div>
  );
}
