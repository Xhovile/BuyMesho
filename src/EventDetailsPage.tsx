import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ExternalLink, Loader2, MapPin, MessageCircle, Share2, ShoppingBag, ShoppingCart, Ticket } from "lucide-react";

import { getEventItemConfig, type EventSpecField } from "./eventSchemas";
import { apiFetch } from "./lib/api";
import { EVENTS_PATH, EXPLORE_PATH, navigateBackOrPath, navigateToPath } from "./lib/appNavigation";

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

const BASE_FIELD_KEYS = new Set([
  "event_title",
  "organizer_name",
  "event_date",
  "start_time",
  "venue",
  "location",
  "ticket_mode",
  "ticket_price",
  "ticket_link",
  "description",
  "contact_whatsapp",
  "poster_alt",
]);

const HIDDEN_EXTRA_KEYS = new Set(["poster_image_url", "poster_url", "poster"]);

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
    return raw.replace(/\s+/g, " ").replace(/(am|pm)/i, (m) => m.toUpperCase());
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

function normalizeValue(value: unknown) {
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function fieldLabelFromKey(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (part) => part.toUpperCase());
}

function resolveFieldValue(item: EventRecord, field: EventSpecField) {
  switch (field.key) {
    case "event_title":
      return item.event_title;
    case "organizer_name":
      return item.organizer_name;
    case "event_date":
      return item.event_date;
    case "start_time":
      return item.start_time;
    case "venue":
      return item.venue;
    case "location":
      return item.location;
    case "ticket_mode":
      return item.ticket_mode;
    case "ticket_price":
      return item.ticket_price;
    case "ticket_link":
      return item.ticket_link;
    case "description":
      return item.description;
    case "contact_whatsapp":
      return item.contact_whatsapp;
    case "poster_alt":
      return item.poster_alt;
    default:
      return item.spec_values?.[field.key];
  }
}

function renderFieldValue(field: EventSpecField, value: unknown) {
  if (field.key === "ticket_price") return formatMoney(typeof value === "number" ? value : Number(value));
  if (field.key === "start_time") return formatClock(typeof value === "string" ? value : String(value ?? ""));
  return normalizeValue(value);
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-zinc-200 bg-white px-4 py-4 shadow-sm shadow-zinc-200/20">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">{label}</p>
      <p className="mt-1 break-words text-sm font-black tracking-tight text-zinc-950">{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b border-zinc-200/70 py-4 last:border-b-0 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-6 sm:py-5">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">{label}</p>
      <p className="min-w-0 whitespace-pre-line break-words text-sm font-semibold leading-relaxed text-zinc-950">{value}</p>
    </div>
  );
}

function SectionBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="w-full">
      <div className="pb-3">
        <h2 className="text-xs font-extrabold uppercase tracking-[0.22em] text-zinc-400">{title}</h2>
      </div>
      <div className="border-t border-zinc-200/70">{children}</div>
    </section>
  );
}

function parseEventId() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("event");
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeWhatsappNumber(raw: string) {
  return raw.replace(/[^\d]/g, "");
}

export default function EventDetailsPage() {
  const eventId = useMemo(() => parseEventId(), []);
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      } catch (err: any) {
        if (!active) return;
        setError(err?.message || "Could not load event.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadEvent();
    return () => {
      active = false;
    };
  }, [eventId]);

  const config = useMemo(() => (event ? getEventItemConfig(event.event_type) : null), [event?.event_type]);
  const schemaFields = config?.schema.fields ?? [];
  const extraSchemaFields = schemaFields.filter((field) => !BASE_FIELD_KEYS.has(field.key));
  const extraSpecEntries = event
    ? Object.entries(event.spec_values ?? {}).filter(
        ([key]) => !schemaFields.some((field) => field.key === key) && !HIDDEN_EXTRA_KEYS.has(key),
      )
    : [];

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
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => navigateBackOrPath(EVENTS_PATH)}
              className="inline-flex items-center gap-2 rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"
            >
              Back to Events
            </button>
            <button
              type="button"
              onClick={() => navigateToPath(EXPLORE_PATH)}
              className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-extrabold text-zinc-900 hover:bg-zinc-50"
            >
              Back to Market
            </button>
          </div>
        </div>
      </div>
    );
  }

  const price = formatMoney(event.ticket_price);
  const date = formatDate(event.event_date);
  const posterUrl = getPosterUrl(event);
  const posterAlt = getPosterAlt(event);
  const accent = posterAccent(event.event_type);
  const startTime = formatClock(event.start_time);
  const eventPageUrl = `${window.location.origin}${EVENTS_PATH}?event=${event.id}`;

  const handleShare = async () => {
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
      }
    } catch {
      // Intentionally quiet. The UI should not break if sharing is unavailable.
    }
  };

  const handleMessage = () => {
    if (!event.contact_whatsapp) return;
    const number = normalizeWhatsappNumber(event.contact_whatsapp);
    if (!number) return;
    window.open(`https://wa.me/${number}`, "_blank", "noopener,noreferrer");
  };

  const handleAddToCart = () => {
    if (typeof window === "undefined") return;

    const storageKey = "__buymesho_event_cart";
    const currentRaw = window.localStorage.getItem(storageKey);
    const currentItems = currentRaw ? (JSON.parse(currentRaw) as Array<{ id: number; title: string; ticket_link: string | null }>) : [];
    if (!currentItems.some((item) => item.id === event.id)) {
      currentItems.push({ id: event.id, title: event.event_title, ticket_link: event.ticket_link });
      window.localStorage.setItem(storageKey, JSON.stringify(currentItems));
    }
  };

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

      <main className="mx-auto w-full max-w-7xl px-4 pt-24 pb-10 sm:pt-24 sm:pb-12">
        <div className="grid gap-8">
          <section className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-[0_30px_80px_-40px_rgba(0,0,0,0.28)]">
            <div className={`relative aspect-[16/10] bg-gradient-to-br ${accent}`}>
              {posterUrl ? <img src={posterUrl} alt={posterAlt} className="absolute inset-0 h-full w-full object-cover" /> : null}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/5" />
              <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-4">
                <span className="rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-white backdrop-blur-sm">
                  {event.event_type}
                </span>
                <span className="rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-white backdrop-blur-sm">
                  {event.ticket_mode}
                </span>
              </div>
              <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6 lg:p-8">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-white/75">Event title</p>
                <h1 className="mt-2 break-words text-3xl font-black tracking-[-0.06em] leading-[0.95] sm:text-5xl lg:text-6xl">
                  {event.event_title}
                </h1>
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <div className="min-w-0 space-y-8">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <SummaryCard label="Event type" value={event.event_type} />
                <SummaryCard label="Date" value={date} />
                <SummaryCard label="Start time" value={startTime} />
                <SummaryCard label="Ticket price" value={price} />
              </div>

              <SectionBox title="Core details">
                <DetailRow label="Event title" value={event.event_title} />
                <DetailRow label="Organizer name" value={event.organizer_name} />
                <DetailRow label="Venue" value={event.venue || "—"} />
                <DetailRow label="Location" value={event.location || "—"} />
                <DetailRow label="Ticket mode" value={event.ticket_mode || "—"} />
                <DetailRow label="Contact WhatsApp" value={event.contact_whatsapp || "—"} />
              </SectionBox>

              <SectionBox title="Description">
                <p className="whitespace-pre-line break-words text-sm leading-relaxed text-zinc-900">{event.description || "—"}</p>
              </SectionBox>

              {extraSchemaFields.length > 0 ? (
                <SectionBox title="Event-specific details">
                  {extraSchemaFields.map((field) => {
                    const rawValue = resolveFieldValue(event, field);
                    const label = field.label || fieldLabelFromKey(field.key);
                    return <DetailRow key={field.key} label={label} value={renderFieldValue(field, rawValue)} />;
                  })}
                </SectionBox>
              ) : null}

              {extraSpecEntries.length > 0 ? (
                <SectionBox title="Additional stored details">
                  {extraSpecEntries.map(([key, value]) => (
                    <DetailRow key={key} label={fieldLabelFromKey(key)} value={normalizeValue(value)} />
                  ))}
                </SectionBox>
              ) : null}

              <div className="border-t border-zinc-200 pt-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                  <a
                    href={event.ticket_link || "#"}
                    target={event.ticket_link ? "_blank" : undefined}
                    rel={event.ticket_link ? "noreferrer" : undefined}
                    onClick={event.ticket_link ? undefined : (e) => e.preventDefault()}
                    className="inline-flex min-w-0 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-3 py-3 text-sm font-extrabold text-white transition-colors hover:bg-orange-600"
                  >
                    <ExternalLink className="h-4 w-4 shrink-0" />
                    <span className="truncate">Buy Ticket</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleMessage}
                    disabled={!event.contact_whatsapp}
                    aria-disabled={!event.contact_whatsapp}
                    className="inline-flex min-w-0 items-center justify-center gap-2 rounded-2xl bg-sky-500 px-3 py-3 text-sm font-extrabold text-white transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-45"
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
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
