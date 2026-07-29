import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ChevronLeft,
  ExternalLink,
  Loader2,
  MessageCircle,
  Pencil,
  Share2,
  ShoppingBag,
  ShoppingCart,
  Ticket,
  Trash2,
} from "lucide-react";

import FloatingCartButton from "./components/FloatingCartButton";
import { apiFetch } from "./lib/api";
import {
  EVENTS_CREATE_PATH,
  EVENTS_MANAGE_PATH,
  EVENTS_PATH,
  navigateBackOrPath,
  navigateToLoginWithReturnPath,
  navigateToPath,
} from "./lib/appNavigation";
import { startConversationFromEvent } from "./lib/messages";
import { navigateToConversation } from "./lib/messagesNavigation";
import { useAuthUser } from "./hooks/useAuthUser";
import { upsertEventCartItem } from "./lib/eventCart";

type EventRecord = {
  id: number;
  creator_uid: string | null;
  event_type: string;
  event_title: string;
  organizer_name: string;
  event_date: string;
  start_time: string;
  venue: string;
  location: string;
  ticket_mode: string;
  ticket_price: number | null;
  ticket_link: string | null;
  description: string;
  contact_whatsapp: string | null;
  poster_alt: string | null;
  spec_values: Record<string, unknown>;
  status: string;
  created_at: string;
  updated_at: string;
};

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined || value <= 0) return "Free";
  return `MK ${value.toLocaleString()}`;
}

function formatDate(value: string) {
  if (!value) return "Date unavailable";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatClock(value: string) {
  const raw = (value || "").trim();
  if (!raw) return "—";

  const lower = raw.toLowerCase();
  if (lower.includes("am") || lower.includes("pm")) {
    return raw.replace(/\s+/g, " ").replace(/(am|pm)/i, (match) => match.toUpperCase());
  }

  const match = raw.match(/^(\d{1,2})(?::(\d{2}))?(?::\d{2})?$/);
  if (!match) return raw;

  const hours = Number(match[1]);
  const minutes = match[2] || "00";
  if (!Number.isFinite(hours) || hours < 0 || hours > 23) return raw;

  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutes} ${period}`;
}

function posterAccent(eventType: string) {
  switch (eventType) {
    case "Concert":
      return "from-red-900 via-zinc-950 to-black";
    case "Sports":
      return "from-emerald-800 via-zinc-950 to-black";
    case "Conference":
      return "from-indigo-900 via-zinc-950 to-black";
    case "Workshop":
      return "from-amber-700 via-zinc-950 to-black";
    case "Party":
      return "from-fuchsia-800 via-zinc-950 to-black";
    case "Church Event":
      return "from-sky-800 via-zinc-950 to-black";
    case "Campus Event":
      return "from-rose-800 via-zinc-950 to-black";
    default:
      return "from-zinc-800 via-zinc-950 to-black";
  }
}

function getPosterUrl(item: EventRecord) {
  const specValues = item.spec_values ?? {};
  const posterValue = specValues.poster_image_url || specValues.poster_url || specValues.poster;
  return typeof posterValue === "string" && posterValue.trim().length > 0 ? posterValue.trim() : "";
}

function getPosterAlt(item: EventRecord) {
  const specValues = item.spec_values ?? {};
  const posterAlt = item.poster_alt || specValues.poster_alt;
  if (typeof posterAlt === "string" && posterAlt.trim().length > 0) return posterAlt.trim();
  return `${item.event_type} poster for ${item.event_title}`;
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-zinc-200 bg-white px-4 py-4 shadow-sm shadow-zinc-200/20">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">{label}</p>
      <p className="mt-1 break-words text-sm font-black tracking-tight text-zinc-950">{value}</p>
    </div>
  );
}

export default function EventDetailsPage() {
  const { user: firebaseUser } = useAuthUser();
  const eventId = useMemo(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("event");
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, []);

  const [event, setEvent] = useState<EventRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      setError("Missing event id.");
      return;
    }

    let active = true;

    async function loadEvent() {
      try {
        setLoading(true);
        const response = (await apiFetch(`/api/events/${eventId}`)) as { event?: EventRecord };
        if (!active) return;
        setEvent(response?.event ?? null);
        setError(response?.event ? null : "Event not found.");
      } catch (fetchError: any) {
        if (!active) return;
        setError(fetchError?.message || "Could not load event.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadEvent();
    return () => {
      active = false;
    };
  }, [eventId]);

  const price = formatMoney(event?.ticket_price);
  const date = formatDate(event?.event_date || "");
  const posterUrl = event ? getPosterUrl(event) : "";
  const posterAlt = event ? getPosterAlt(event) : "Event poster";
  const accent = posterAccent(event?.event_type || "");
  const startTime = formatClock(event?.start_time || "");
  const eventPageUrl = typeof window !== "undefined" && event ? `${window.location.origin}${EVENTS_PATH}?event=${event.id}` : "";
  const isPublished = event?.status === "published";
  const canManageEvent = !!firebaseUser?.uid && !!event?.creator_uid && event.creator_uid === firebaseUser.uid;
  const canMessageEvent = !!firebaseUser?.uid && !!event?.creator_uid && isPublished;
  const canBuyOrCart = !!event && isPublished;

  const clearNotice = () => setNotice(null);

  const handleShare = async () => {
    if (!event || !eventPageUrl) return;

    const shareData = {
      title: event.event_title,
      text: `${event.event_title} • ${price}`,
      url: eventPageUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(eventPageUrl);
        setNotice("Event link copied to clipboard.");
      }
    } catch {
      // Keep silent if sharing is unavailable.
    }
  };

  const handleMessage = async () => {
    if (!event) return;
    if (!firebaseUser?.uid) {
      navigateToLoginWithReturnPath(eventPageUrl || `${EVENTS_PATH}?event=${event.id}`);
      return;
    }

    if (!canMessageEvent) {
      setNotice(event.creator_uid ? "This event is inactive right now." : "This event does not yet have an owner profile for messaging.");
      return;
    }

    try {
      const conversation = await startConversationFromEvent(event.id);
      navigateToConversation(conversation.id);
    } catch (error: any) {
      setNotice(error?.message || "Failed to start event conversation.");
    }
  };

  const handleBuyTicket = async () => {
    if (!event) return;
    if (!firebaseUser?.uid) {
      navigateToLoginWithReturnPath(eventPageUrl || `${EVENTS_PATH}?event=${event.id}`);
      return;
    }
    if (!canBuyOrCart) {
      setNotice("This event is inactive right now.");
      return;
    }

    try {
      setCheckoutLoading(true);
      setNotice(null);

      const result = (await apiFetch("/api/payments/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          items: [{ eventId: String(event.id), quantity: 1 }],
          method: "mobile_money",
          returnUrl: `${window.location.origin}/payment/return`,
          cancelUrl: `${window.location.origin}/payment/return?cancelled=1`,
        }),
      })) as { checkoutUrl?: string | null; payment?: { checkoutUrl?: string | null } };

      const checkoutUrl = result.checkoutUrl ?? result.payment?.checkoutUrl ?? null;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
        return;
      }

      throw new Error("Payment gateway did not return a checkout URL.");
    } catch (error: any) {
      setNotice(error?.message || "Failed to start ticket checkout.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!event) return;
    if (!firebaseUser?.uid) {
      navigateToLoginWithReturnPath(eventPageUrl || `${EVENTS_PATH}?event=${event.id}`);
      return;
    }
    if (!canBuyOrCart) {
      setNotice("This event is inactive right now.");
      return;
    }

    upsertEventCartItem(firebaseUser.uid, {
      itemType: "event_ticket",
      eventId: String(event.id),
      eventTitle: event.event_title,
      organizerName: event.organizer_name,
      organizerUid: event.creator_uid,
      eventDate: event.event_date,
      startTime: event.start_time,
      venue: event.venue,
      location: event.location,
      ticketPrice: event.ticket_price,
      ticketLink: event.ticket_link,
      unitPrice: Number(event.ticket_price || 0),
      quantity: 1,
      totalPrice: Number(event.ticket_price || 0),
      addedAt: new Date().toISOString(),
    });

    setNotice("Ticket added to cart.");
  };

  const handleCancelEvent = async () => {
    if (!event || !canManageEvent) return;
    const confirmed = window.confirm("Cancel this event? It will be removed from public event listings.");
    if (!confirmed) return;

    try {
      await apiFetch(`/api/events/${event.id}`, { method: "DELETE" });
      navigateToPath(EVENTS_MANAGE_PATH, { replace: true });
    } catch (error: any) {
      setNotice(error?.message || "Could not cancel this event.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4">
        <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-sm font-medium text-zinc-600 shadow-lg shadow-zinc-200/50">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-700" />
          Loading event details...
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4">
        <div className="w-full max-w-xl rounded-[2rem] border border-zinc-200 bg-white p-6 text-center shadow-xl shadow-zinc-200/60 sm:p-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-950 text-white">
            <Ticket className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-2xl font-black tracking-[-0.05em] text-zinc-950">Event unavailable</h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">{error || "This event could not be loaded."}</p>
          <button
            type="button"
            onClick={() => navigateBackOrPath(EVENTS_PATH)}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"
          >
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  const ownerActionButtonClass = "inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-900 hover:bg-blue-50";
  const buyerActionButtonClass = "inline-flex min-w-0 items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-extrabold transition-colors";

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <FloatingCartButton isLoggedIn={!!firebaseUser} />
      <header className="fixed inset-x-0 top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <button type="button" onClick={() => navigateBackOrPath(EVENTS_PATH)} className="flex min-w-0 items-center gap-3 text-left">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-900 text-white shadow-lg shadow-red-900/20">
              <Ticket className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-black tracking-tight">
                <span className="text-red-900">Buy</span>
                <span className="text-zinc-700">Mesho</span>
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-400">Event details</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigateBackOrPath(EVENTS_PATH)}
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-900 shadow-sm hover:bg-zinc-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 pb-10 pt-24 sm:pb-12">
        <div className="grid gap-8">
          <section>
            <div className={`relative aspect-[16/10] overflow-hidden rounded-[2rem] bg-gradient-to-br ${accent}`}>
              {posterUrl ? <img src={posterUrl} alt={posterAlt} className="h-full w-full object-cover" /> : null}
            </div>
          </section>

          <section className="space-y-8">
            {notice ? (
              <div className="flex items-start justify-between gap-4 rounded-[1.5rem] border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 shadow-sm">
                <p>{notice}</p>
                <button type="button" onClick={clearNotice} className="font-bold text-zinc-500 hover:text-zinc-900">
                  Dismiss
                </button>
              </div>
            ) : null}

            {!isPublished ? (
              <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                This event is currently {event.status}. Buyers cannot message, buy tickets, or add it to cart until it is published again.
              </div>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <h1 className="max-w-4xl text-4xl font-black tracking-[-0.06em] leading-[0.94] text-zinc-950 sm:text-5xl lg:text-6xl">
                {event.event_title}
              </h1>
              <p className="text-3xl font-black tracking-tight text-red-950 sm:text-4xl">{price}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <SummaryCard label="Event type" value={event.event_type} />
              <SummaryCard label="Date" value={date} />
              <SummaryCard label="Start time" value={startTime} />
              <SummaryCard label="Ticket mode" value={event.ticket_mode || "—"} />
            </div>

            <section className="w-full">
              <div className="pb-3">
                <h2 className="text-xs font-extrabold uppercase tracking-[0.22em] text-zinc-400">Description</h2>
              </div>
              <div className="border-t border-zinc-200/70 pt-4">
                <p className="whitespace-pre-line break-words text-sm leading-relaxed text-zinc-900">{event.description || "—"}</p>
              </div>
            </section>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="overflow-hidden rounded-[1.75rem] border border-zinc-200 bg-white">
                <div className="border-b border-zinc-200/70 px-5 py-4">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">Core details</p>
                </div>
                <div className="divide-y divide-zinc-200/70 px-5">
                  {[
                    ["Organizer name", event.organizer_name],
                    ["Venue", event.venue || "—"],
                    ["Location", event.location || "—"],
                    ["Contact WhatsApp", event.contact_whatsapp || "—"],
                  ].map(([label, value]) => (
                    <div key={label} className="grid gap-1 py-4 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-6">
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">{label}</p>
                      <p className="min-w-0 whitespace-pre-line break-words text-sm font-semibold leading-relaxed text-zinc-950">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="overflow-hidden rounded-[1.75rem] border border-zinc-200 bg-white">
                <div className="border-b border-zinc-200/70 px-5 py-4">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">Event specific details</p>
                </div>
                <div className="px-5 py-4 text-sm text-zinc-500">
                  No extra event-specific fields.
                </div>
              </div>
            </div>

            {canManageEvent ? (
              <div className="rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50/80 via-zinc-50 to-white p-4 shadow-sm ring-1 ring-blue-100/60">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-blue-700/80">Owner view</p>
                    <h2 className="mt-1 text-lg font-black tracking-tight text-zinc-900">Manage this event</h2>
                    <p className="mt-1 text-sm leading-6 text-zinc-600">
                      Use these tools to edit details, publish changes, or remove the event from the public directory.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleShare}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-white shadow-sm transition-colors hover:bg-blue-50"
                    aria-label="Share event"
                    title="Share event"
                  >
                    <Share2 className="h-4 w-4 text-blue-700" />
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => navigateToPath(`${EVENTS_MANAGE_PATH}?event=${event.id}`)} className={ownerActionButtonClass}>
                    <BarChart3 className="h-4 w-4" />
                    Creator dashboard
                  </button>
                  <button type="button" onClick={() => navigateToPath(`${EVENTS_CREATE_PATH}?edit=${event.id}&skipCreatorCheck=1`)} className={ownerActionButtonClass}>
                    <Pencil className="h-4 w-4" />
                    Edit event
                  </button>
                  <button type="button" onClick={handleCancelEvent} className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-100">
                    <Trash2 className="h-4 w-4" />
                    Cancel event
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-t border-zinc-200 pt-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                  <button
                    type="button"
                    onClick={() => void handleBuyTicket()}
                    disabled={!canBuyOrCart || checkoutLoading}
                    className={`${buyerActionButtonClass} bg-orange-500 text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <ExternalLink className="h-4 w-4 shrink-0" />
                    <span className="truncate">{checkoutLoading ? "Buying…" : "Buy Ticket"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleMessage()}
                    disabled={!canMessageEvent}
                    className={`${buyerActionButtonClass} bg-sky-500 text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60`}
                    title={!canMessageEvent ? "This event is not available for messaging right now." : "Message event owner"}
                  >
                    <MessageCircle className="h-4 w-4 shrink-0" />
                    <span className="truncate">Message</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleAddToCart()}
                    disabled={!canBuyOrCart}
                    className={`${buyerActionButtonClass} bg-yellow-500 text-white hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <ShoppingCart className="h-4 w-4 shrink-0" />
                    <span className="truncate">Add to Cart</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShare}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-white shadow-sm transition-colors hover:bg-zinc-50"
                    aria-label="Share event"
                    title="Share event"
                  >
                    <Share2 className="h-4 w-4 text-zinc-700" />
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
