import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import AdminWorkspaceLayout from "./modules/admin/AdminWorkspaceLayout";
import { navigateToPath } from "./lib/appNavigation";
import { getConversationIdFromUrl } from "./lib/messagesNavigation";
import { fetchConversation } from "./lib/messages";
import type { Conversation, MessageThreadItem } from "./types";

function timeLabel(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

function Participant({
  name,
  role,
  uid,
  align = "left",
}: {
  name: string;
  role: string;
  uid: string;
  align?: "left" | "right";
}) {
  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <p className="truncate text-sm font-black text-zinc-900">{name}</p>
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">{role}</p>
      <p className="mt-1 truncate font-mono text-[10px] text-zinc-400">{uid}</p>
    </div>
  );
}

export default function AdminMessageThreadPage() {
  const [conversationId] = useState<number | null>(() => getConversationIdFromUrl());
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<MessageThreadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!conversationId || Number.isNaN(conversationId)) {
      navigateToPath("/admin/messages");
      return () => {
        cancelled = true;
      };
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchConversation(conversationId);
        if (cancelled) return;
        setConversation(result.conversation);
        setMessages(result.messages);

        const reviewResponse = await fetch(`/api/admin/messages/${conversationId}/review`, {
          method: "POST",
          credentials: "include",
        });
        if (!reviewResponse.ok) {
          const payload = await reviewResponse.json().catch(() => null);
          throw new Error(payload?.error || "Conversation loaded, but review state could not be saved.");
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load conversation.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  const buyer = conversation?.buyer;
  const seller = conversation?.seller;
  const threadType = String(conversation?.thread_type || "listing");
  const contextLabel = conversation?.event
    ? `Event · ${conversation.event.title}`
    : conversation?.listing
      ? `Listing · ${conversation.listing.name}`
      : "Seller conversation";

  const participantByUid = useMemo(() => {
    const map = new Map<string, { side: "left" | "right"; name: string; role: string }>();
    if (buyer?.uid) map.set(buyer.uid, { side: "left", name: buyer.business_name || buyer.uid, role: "Buyer" });
    if (seller?.uid) map.set(seller.uid, { side: "right", name: seller.business_name || seller.uid, role: threadType === "event" ? "Organizer" : "Seller" });
    return map;
  }, [buyer, seller, threadType]);

  if (loading) {
    return (
      <AdminWorkspaceLayout title="Messages" description="Read-only conversation monitoring">
        <div className="flex min-h-64 items-center justify-center rounded-[1.75rem] border border-zinc-200 bg-white shadow-sm">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" aria-label="Loading conversation" />
        </div>
      </AdminWorkspaceLayout>
    );
  }

  if (error || !conversation || !buyer || !seller) {
    return (
      <AdminWorkspaceLayout title="Messages" description="Read-only conversation monitoring">
        <div className="rounded-[1.75rem] border border-red-200 bg-red-50 p-6 shadow-sm">
          <p className="text-sm font-semibold text-red-700">{error || "Conversation could not be loaded."}</p>
          <button
            type="button"
            onClick={() => navigateToPath("/admin/messages")}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Messages
          </button>
        </div>
      </AdminWorkspaceLayout>
    );
  }

  return (
    <AdminWorkspaceLayout title="Conversation" description="Admin monitoring view · read only">
      <section className="space-y-4">
        <button
          type="button"
          onClick={() => navigateToPath("/admin/messages")}
          className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Messages
        </button>

        <div className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Conversation #{conversation.id}</p>
              <h2 className="mt-2 truncate text-xl font-black tracking-tight text-zinc-900">{contextLabel}</h2>
              <p className="mt-1 text-sm text-zinc-500">
                {conversation.event ? "Event conversation" : conversation.listing ? "Listing conversation" : "Seller conversation"}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 self-start rounded-full bg-zinc-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-zinc-600">
              <ShieldCheck className="h-3.5 w-3.5" />
              Read only
            </div>
          </div>

          <div className="mt-5 grid gap-4 border-t border-zinc-100 pt-5 sm:grid-cols-2">
            <Participant
              name={buyer.business_name || buyer.uid}
              role="Buyer"
              uid={buyer.uid}
            />
            <Participant
              name={seller.business_name || seller.uid}
              role={conversation.event ? "Organizer" : "Seller"}
              uid={seller.uid}
              align="right"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-[1.75rem] border border-zinc-200 bg-zinc-50 shadow-sm">
          <div className="space-y-5 p-4 sm:p-6">
            {messages.length ? (
              messages.map((message) => {
                const participant = participantByUid.get(message.sender_uid);
                const isLeft = participant?.side !== "right";
                const senderName = participant?.name || message.sender_uid;
                const senderRole = participant?.role || "Participant";

                return (
                  <div key={message.id} className={`flex ${isLeft ? "justify-start" : "justify-end"}`}>
                    <div className="max-w-[86%] sm:max-w-[72%]">
                      <div className={`mb-1 px-2 font-mono text-[10px] text-zinc-400 ${isLeft ? "text-left" : "text-right"}`}>
                        {message.sender_uid}
                      </div>
                      <div className={`mb-1 px-2 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400 ${isLeft ? "text-left" : "text-right"}`}>
                        {senderName} · {senderRole}
                      </div>
                      <div
                        className={`rounded-3xl px-4 py-3 text-sm leading-6 ${
                          isLeft ? "bg-white text-zinc-900 ring-1 ring-zinc-200" : "bg-zinc-900 text-white"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{message.body}</p>
                        <p className="mt-2 text-[10px] text-zinc-400">{timeLabel(message.created_at)}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-16 text-center text-sm text-zinc-500">No messages in this conversation.</div>
            )}
          </div>
          <div className="border-t border-zinc-200 bg-white px-4 py-3 text-center text-xs font-semibold text-zinc-400">
            Admin view · Read only · No message input
          </div>
        </div>
      </section>
    </AdminWorkspaceLayout>
  );
}
