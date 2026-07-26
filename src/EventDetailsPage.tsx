import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ExternalLink,
  Loader2,
  MessageCircle,
  Share2,
  ShoppingBag,
  Ticket,
} from "lucide-react";

import { apiFetch } from "./lib/api";
import { EVENTS_PATH, navigateBackOrPath, navigateToLoginWithReturnPath, navigateToMessages } from "./lib/appNavigation";
import { useAuthUser } from "./hooks/useAuthUser";


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

type EventCartItem = {
  eventId: number;
  eventTitle: string;
  organizerName: string;
  eventDate: string;
  startTime: string;
  venue: string;
  location: string;
  ticketPrice: number | null;
  ticketLink: string | null;
  quantity: number;
  addedAt: string;
};

const EVENT_CART_KEY = "__buymesho_event_cart";

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

function normalizeWhatsappNumber(raw: string) {
  return raw.replace(/[^\d]/g, "");
}

function readEventCart(userUid: string) {
  try {
    const raw = window.localStorage.getItem(`${EVENT_CART_KEY}_${userUid}`);
    if (!raw) return [] as EventCartItem[];
    const parsed = JSON.parse(raw) as EventCartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [] as EventCartItem[];
  }
}

function writeEventCart(userUid: string, items: EventCartItem[]) {
  window.localStorage.setItem(`${EVENT_CART_KEY}_${userUid}`, JSON.stringify(items.slice(0, 20)));
  window.dispatchEvent(new CustomEvent("buymesho:event-cart-updated"));
}

function upsertEventCartItem(userUid: string, item: EventCartItem) {
  const current = readEventCart(userUid);
  const next = current.filter((entry) => entry.eventId !== item.eventId);
  next.unshift(item);
  writeEventCart(userUid, next);
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

  const handleMessage = () => {
    if (!event) return;
    if (!firebaseUser?.uid) {
      navigateToLoginWithReturnPath(eventPageUrl || `${EVENTS_PATH}?event=${event.id}`);
      return;
    }

    navigateToMessages();
  };

  const handleBuyTicket = () => {
    if (!event) return;

    if (event.ticket_link) {
      window.open(event.ticket_link, "_blank", "noopener,noreferrer");
      return;
    }

    setNotice("This event does not have a ticket link yet.");
  };

  const handleAddToCart = () => {
    if (!event) return;
    if (!firebaseUser?.uid) {
      navigateToLoginWithReturnPath(eventPageUrl || `${EVENTS_PATH}?event=${event.id}`);
      return;
    }

    upsertEventCartItem(firebaseUser.uid, {
      eventId: event.id,
      eventTitle: event.event_title,
      organizerName: event.organizer_name,
      eventDate: event.event_date,
      startTime: event.start_time,
      venue: event.venue,
      location: event.location,
      ticketPrice: event.ticket_price,
      ticketLink: event.ticket_link,
      quantity: 1,
      addedAt: new Date().toISOString(),
    });

    setNotice("Ticket added to cart.");
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

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
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

            <div className="border-t border-zinc-200 pt-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <button
                  type="button"
                  onClick={handleBuyTicket}
                  className="inline-flex min-w-0 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-3 py-3 text-sm font-extrabold text-white transition-colors hover:bg-orange-600"
                >
                  <ExternalLink className="h-4 w-4 shrink-0" />
                  <span className="truncate">Buy Ticket</span>
                </button>

                <button
                  type="button"
                  onClick={handleMessage}
                  className="inline-flex min-w-0 items-center justify-center gap-2 rounded-2xl bg-sky-500 px-3 py-3 text-sm font-extrabold text-white transition-colors hover:bg-sky-600"
                >
                  <MessageCircle className="h-4 w-4 shrink-0" />
                  <span className="truncate">Message</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="inline-flex min-w-0 items-center justify-center gap-2 rounded-2xl bg-yellow-500 px-3 py-3 text-sm font-extrabold text-white transition-colors hover:bg-yellow-400"
                >
                  <ShoppingBag className="h-4 w-4 shrink-0" />
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
          </section>
        </div>
      </main>
    </div>
  );
}
