import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ExternalLink, Loader2, MessageCircle, Maximize2, Minimize2, Share2, ShoppingBag, Ticket } from "lucide-react";

import EventActionsMenu from "./components/eventDetails/EventActionsMenu";
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

function AccordionSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-zinc-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-zinc-50 sm:px-6"
      >
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">Accordion</p>
          <h2 className="mt-1 text-lg font-black tracking-[-0.04em] text-zinc-950">{title}</h2>
        </div>
        <ChevronDown className={`h-5 w-5 shrink-0 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? <div className="border-t border-zinc-200/70 px-5 sm:px-6">{children}</div> : null}
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

function FullscreenToggleIcon({ isFullscreen }: { isFullscreen: boolean }) {
  return isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />;
}

export default function EventDetailsPage() {
  const eventId = useMemo(() => parseEventId(), []);
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coreOpen, setCoreOpen] = useState(false);
  const [extraOpen, setExtraOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!isFullscreen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === "Escape") {
        setIsFullscreen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreen]);

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

  const toggleFullscreen = () => {
    setIsFullscreen((current) => !current);
  };

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
      // Keep silent if sharing is unavailable.
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

  const coreRows = [
    ["Event title", event.event_title],
    ["Organizer name", event.organizer_name],
    ["Venue", event.venue || "—"],
    ["Location", event.location || "—"],
    ["Ticket mode", event.ticket_mode || "—"],
    ["Contact WhatsApp", event.contact_whatsapp || "—"],
  ] as const;

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
          <section>
            <div className="mb-3 flex justify-start">
              <EventActionsMenu eventId={event.id} eventTitle={event.event_title} shareUrl={eventPageUrl} />
            </div>

            <div className={`relative aspect-[16/10] overflow-hidden rounded-[2rem] bg-gradient-to-br ${accent}`}>
              {posterUrl ? <img src={posterUrl} alt={posterAlt} className="h-full w-full object-cover" /> : null}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white/90 text-zinc-800 shadow-sm transition-transform duration-200 hover:scale-105 hover:bg-white active:scale-95"
                aria-label={isFullscreen ? "Exit fullscreen" : "Open fullscreen"}
                title={isFullscreen ? "Exit fullscreen" : "Open fullscreen"}
              >
                <FullscreenToggleIcon isFullscreen={isFullscreen} />
              </button>
            </div>
          </section>

          <section className="space-y-8">
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
              <AccordionSection title="Core details" open={coreOpen} onToggle={() => setCoreOpen((value) => !value)}>
                {coreRows.map(([label, value]) => (
                  <DetailRow key={label} label={label} value={value} />
                ))}
              </AccordionSection>

              <AccordionSection title="Event specific details" open={extraOpen} onToggle={() => setExtraOpen((value) => !value)}>
                {extraSchemaFields.length > 0 ? (
                  extraSchemaFields.map((field) => {
                    const rawValue = resolveFieldValue(event, field);
                    const label = field.label || fieldLabelFromKey(field.key);
                    return <DetailRow key={field.key} label={label} value={renderFieldValue(field, rawValue)} />;
                  })
                ) : (
                  <div className="py-4 text-sm text-zinc-500">No extra event-specific fields.</div>
                )}
              </AccordionSection>
            </div>

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
          </section>
        </div>
      </main>

      {isFullscreen ? (
        <div className="fixed inset-0 z-[100] bg-black/95" onClick={() => setIsFullscreen(false)} role="presentation">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setIsFullscreen(false);
            }}
            className="absolute right-4 top-4 z-[101] inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur-sm hover:bg-white/20"
          >
            <Minimize2 className="h-4 w-4" />
            Close
          </button>

          <div className="flex h-full w-full items-center justify-center p-4 sm:p-8" onClick={(event) => event.stopPropagation()}>
            {posterUrl ? (
              <img
                src={posterUrl}
                alt={posterAlt}
                className="max-h-full max-w-full rounded-[1.5rem] object-contain shadow-2xl"
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
