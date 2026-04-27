import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, MessageCircle } from "lucide-react";
import type { Conversation, MessageThreadItem } from "./types";
import { useAuthUser } from "./hooks/useAuthUser";
import { navigateBackOrPath, navigateToLogin, navigateToPath } from "./lib/appNavigation";
import { getConversationIdFromUrl, getListingIdFromMessagesUrl, navigateToConversation, navigateToMessages } from "./lib/messagesNavigation";
import { fetchConversation, fetchInbox, markConversationRead, sendMessage, startConversationFromListing } from "./lib/messages";

function timeLabel(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

function ConversationRow({
  convo,
  active,
  onClick,
}: {
  convo: Conversation;
  active: boolean;
  onClick: () => void;
}) {
  const preview = convo.last_message_preview || "Start the conversation.";
  const unread = convo.unread_count || 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-3xl border p-4 text-left transition-colors ${active ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 bg-white hover:bg-zinc-50"}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white">
          <MessageCircle className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-zinc-900">{convo.listing.name}</p>
              <p className="truncate text-xs font-semibold text-zinc-500">{convo.seller.business_name}</p>
            </div>
            <span className="shrink-0 text-[11px] font-semibold text-zinc-400">{timeLabel(convo.last_message_at)}</span>
          </div>
          <p className="mt-2 line-clamp-2 text-sm text-zinc-600">{preview}</p>
          {unread > 0 ? (
            <span className="mt-3 inline-flex rounded-full bg-zinc-900 px-2.5 py-1 text-[11px] font-bold text-white">{unread} unread</span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

export default function MessagesPage() {
  const { user, loading: authLoading } = useAuthUser();
  const [loading, setLoading] = useState(true);
  const [inbox, setInbox] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(() => getConversationIdFromUrl());
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<MessageThreadItem[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const listingIdFromUrl = useMemo(() => getListingIdFromMessagesUrl(), []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigateToLogin();
      return;
    }

    const load = async () => {
      setLoading(true);
      setStatus(null);
      try {
        const items = await fetchInbox();
        setInbox(items);

        if (listingIdFromUrl) {
          const started = await startConversationFromListing(listingIdFromUrl);
          navigateToConversation(started.id);
          const full = await fetchConversation(started.id);
          setActiveConversationId(started.id);
          setActiveConversation(full.conversation);
          setMessages(full.messages);
          await markConversationRead(started.id);
          return;
        }

        const nextId = activeConversationId ?? items[0]?.id ?? null;
        if (nextId) {
          const full = await fetchConversation(nextId);
          setActiveConversationId(nextId);
          setActiveConversation(full.conversation);
          setMessages(full.messages);
          await markConversationRead(nextId);
        } else {
          setActiveConversation(null);
          setMessages([]);
        }
      } catch (error: any) {
        setStatus(error?.message || "Failed to load messages.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [authLoading, user, listingIdFromUrl, activeConversationId]);

  const openConversation = async (conversationId: number) => {
    setActiveConversationId(conversationId);
    navigateToConversation(conversationId);
    setBusy(true);
    try {
      const full = await fetchConversation(conversationId);
      setActiveConversation(full.conversation);
      setMessages(full.messages);
      await markConversationRead(conversationId);
    } catch (error: any) {
      setStatus(error?.message || "Failed to open conversation.");
    } finally {
      setBusy(false);
    }
  };

  const handleSend = async () => {
    if (!activeConversationId || !draft.trim()) return;
    setBusy(true);
    try {
      const result = await sendMessage(activeConversationId, draft.trim());
      setActiveConversation(result.conversation);
      setMessages((prev) => [...prev, result.message]);
      setDraft("");
      setInbox((prev) => {
        const next = prev.map((item) => (item.id === result.conversation.id ? result.conversation : item));
        return next.sort((a, b) => (b.last_message_at || "").localeCompare(a.last_message_at || ""));
      });
    } catch (error: any) {
      setStatus(error?.message || "Failed to send message.");
    } finally {
      setBusy(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100">
        <Loader2 className="h-10 w-10 animate-spin text-zinc-700" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between rounded-3xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <button
            type="button"
            onClick={() => navigateBackOrPath("/")}
            className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-bold text-zinc-800 hover:bg-zinc-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-zinc-400">Messages</p>
          <button
            type="button"
            onClick={() => navigateToPath("/messages")}
            className="rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-800 hover:bg-zinc-50"
          >
            Inbox
          </button>
        </div>

        {status ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{status}</div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-3">
            <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">Conversations</p>
              <p className="mt-1 text-sm text-zinc-600">Text only for now. Attachments are coming soon.</p>
            </div>
            <div className="space-y-3">
              {inbox.length ? (
                inbox.map((convo) => (
                  <ConversationRow
                    key={convo.id}
                    convo={convo}
                    active={convo.id === activeConversationId}
                    onClick={() => void openConversation(convo.id)}
                  />
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-500">
                  No messages yet. Open a listing and tap Message in app to start.
                </div>
              )}
            </div>
          </aside>

          <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
            {activeConversation ? (
              <div className="flex min-h-[70vh] flex-col">
                <div className="border-b border-zinc-200 p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">{activeConversation.listing.university}</p>
                      <h1 className="mt-1 text-xl font-black text-zinc-900">{activeConversation.listing.name}</h1>
                      <p className="text-sm text-zinc-600">MK {Number(activeConversation.listing.price).toLocaleString()} · {activeConversation.seller.business_name}</p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
                  {messages.length ? (
                    messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.sender_uid === user?.uid ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-3xl px-4 py-3 text-sm shadow-sm ${msg.sender_uid === user?.uid ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-900"}`}>
                          <p>{msg.body}</p>
                          <p className={`mt-2 text-[11px] ${msg.sender_uid === user?.uid ? "text-zinc-300" : "text-zinc-500"}`}>{timeLabel(msg.created_at)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-zinc-500">No messages in this thread yet.</div>
                  )}
                </div>

                <div className="border-t border-zinc-200 p-4 sm:p-5">
                  <div className="flex items-end gap-3">
                    <button
                      type="button"
                      onClick={() => window.alert("Attachments are coming soon. Text only for now.")}
                      className="h-12 w-12 shrink-0 rounded-2xl border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50"
                      aria-label="Attachments coming soon"
                    >
                      +
                    </button>
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Type your message..."
                      className="min-h-12 flex-1 resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-400"
                    />
                    <button
                      type="button"
                      disabled={busy || !draft.trim()}
                      onClick={() => void handleSend()}
                      className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[70vh] items-center justify-center p-8 text-center">
                <div>
                  <MessageCircle className="mx-auto h-12 w-12 text-zinc-300" />
                  <h2 className="mt-4 text-xl font-black text-zinc-900">Pick a conversation</h2>
                  <p className="mt-2 text-sm text-zinc-500">Open a thread from the inbox or start one from a listing.</p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
