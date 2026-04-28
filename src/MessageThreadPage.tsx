import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Paperclip, SendHorizontal } from "lucide-react";
import type { Conversation, MessageThreadItem } from "./types";
import { useAuthUser } from "./hooks/useAuthUser";
import { navigateToMessages, navigateToLogin } from "./lib/messagesNavigation";
import { getConversationIdFromUrl } from "./lib/messagesNavigation";
import { fetchConversation, markConversationRead, sendMessage } from "./lib/messages";

function timeLabel(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

export default function MessageThreadPage() {
  const { user, loading: authLoading } = useAuthUser();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<MessageThreadItem[]>([]);
  const [conversationId] = useState<number | null>(() => getConversationIdFromUrl());

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigateToLogin();
      return;
    }

    if (!conversationId || Number.isNaN(conversationId)) {
      navigateToMessages();
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
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

    void load();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, conversationId]);

  const handleSend = async () => {
    if (!conversationId || !draft.trim()) return;

    setBusy(true);
    try {
      const result = await sendMessage(conversationId, draft.trim());
      setConversation(result.conversation);
      setMessages((prev) => [...prev, result.message]);
      setDraft("");
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

  if (!conversation) {
    return (
      <div className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-900 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => navigateToMessages()}
          className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-bold text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to inbox
        </button>

        {status ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {status}
          </div>
        ) : null}
      </div>
    );
  }

  const listingId = conversation.listing.id;
  const sellerUid = conversation.seller.uid;
  const hasListingId = typeof listingId === "number" && Number.isFinite(listingId);
  const hasSellerUid = typeof sellerUid === "string" && sellerUid.trim().length > 0;
  const listingUrl = hasListingId ? `/listing?listing=${listingId}&image=0` : null;
  const sellerUrl = hasSellerUid ? `/seller?uid=${encodeURIComponent(sellerUid)}` : null;

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-zinc-100 text-zinc-900">
      <header className="shrink-0 border-b border-zinc-200 bg-zinc-100/95 backdrop-blur z-20">
        <div className="px-4 py-4">
          <button
            type="button"
            onClick={() => navigateToMessages()}
            className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length ? (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.sender_uid === user?.uid ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-3xl px-4 py-3 text-sm ${
                    msg.sender_uid === user?.uid
                      ? "bg-zinc-900 text-white"
                      : "bg-zinc-200 text-zinc-900"
                  }`}
                >
                  <p>{msg.body}</p>
                  <p
                    className={`mt-2 text-[11px] ${
                      msg.sender_uid === user?.uid
                        ? "text-zinc-300"
                        : "text-zinc-500"
                    }`}
                  >
                    {timeLabel(msg.created_at)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500">
              No messages yet.
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-zinc-200 bg-white px-4 py-4">
          <div className="flex items-end gap-3">
            <button
              type="button"
              onClick={() => window.alert("Attachments are coming soon. Text only for now.")}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-zinc-200"
              aria-label="Add attachment"
            >
              <Paperclip className="h-5 w-5 text-zinc-700" />
            </button>

            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type your message..."
              className="min-h-12 flex-1 resize-none rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none"
            />

            <button
              type="button"
              disabled={busy || !draft.trim()}
              onClick={() => void handleSend()}
              className="inline-flex items-center justify-center rounded-2xl bg-zinc-900 px-4 py-3 text-white disabled:opacity-50"
              aria-label="Send message"
            >
              <SendHorizontal className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
