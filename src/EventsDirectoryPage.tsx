import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  CalendarDays,
  ExternalLink,
  Loader2,
  MapPin,
  Ticket,
  X,
} from "lucide-react";

import { apiFetch } from "./lib/api";
import { EVENTS_CREATE_PATH, EXPLORE_PATH, HOME_PATH, navigateToPath } from "./lib/appNavigation";

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

function EventDetailsModal({
  item,
  onClose,
}: {
  item: EventRecord | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!item) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [item, onClose]);

  const price = formatMoney(item?.ticket_price);
  const date = formatDate(item?.event_date || "");
  const posterUrl = item ? getPosterUrl(item) : "";
  const posterAlt = item ? getPosterAlt(item) : "";
  const accent = item ? posterAccent(item.event_type) : "from-zinc-800 via-zinc-950 to-black";

  return (
    <AnimatePresence>
      {item ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-950/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 16 }}
            className="relative w-full max-w-3xl overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:rounded-[2rem]"
          >
            <div className="flex items-center justify-between gap-4 border-b border-zinc-100 px-5 py-4 sm:px-6">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">
                  Event details
                </p>
                <h3 className="mt-1 text-lg font-black tracking-[-0.04em] text-zinc-950">
                  {item.event_title}
                </h3>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 transition-colors hover:bg-zinc-100"
                aria-label="Close event details"
              >
                <X className="h-5 w-5 text-zinc-500" />
              </button>
            </div>

            <div className="grid gap-0 md:grid-cols-[1.05fr_0.95fr]">
              <div className="relative min-h-[16rem] bg-zinc-100 md:min-h-full">
                <div className={`absolute inset-0 bg-gradient-to-br ${accent}`} />
                {posterUrl ? (
                  <img
                    src={posterUrl}
                    alt={posterAlt}
                    className="relative h-full min-h-[16rem] w-full object-cover"
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/5" />
                <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-4">
                  <span className="rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-white backdrop-blur-sm">
                    {item.event_type}
                  </span>
                  <span className="rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-white backdrop-blur-sm">
                    {item.ticket_mode}
                  </span>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-white/75">
                    Organizer
                  </p>
                  <p className="mt-2 text-2xl font-black tracking-[-0.05em] leading-tight">
                    {item.event_title}
                  </p>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                <p className="text-sm leading-relaxed text-zinc-600 sm:text-base">
                  {item.description}
                </p>

                <div className="mt-5 grid gap-3 text-sm text-zinc-600">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-4 w-4 text-red-900" />
                    <span className="font-medium text-zinc-700">{date}</span>
                    <span className="text-zinc-300">•</span>
                    <span>{item.start_time}</span>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-900" />
                    <span className="leading-relaxed text-zinc-700">
                      {item.venue}
                      {item.location ? ` • ${item.location}` : ""}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">
                        Ticket price
                      </p>
                      <p className="mt-1 text-base font-black tracking-tight text-zinc-950">{price}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  {item.ticket_link ? (
                    <a
                      href={item.ticket_link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"
                    >
                      Open ticket link
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : null}

                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-extrabold text-zinc-900 hover:bg-zinc-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

function DesktopEventCard({
  item,
  onOpenDetails,
}: {
  item: EventRecord;
  onOpenDetails: (item: EventRecord) => void;
}) {
  const price = formatMoney(item.ticket_price);
  const date = formatDate(item.event_date);
  const accent = posterAccent(item.event_type);
  const posterUrl = getPosterUrl(item);
  const posterAlt = getPosterAlt(item);
  const snippet = item.description.length > 96 ? `${item.description.slice(0, 96).trim()}…` : item.description;

  return (
    <article className="group w-[220px] shrink-0 snap-start overflow-hidden rounded-[1.75rem] border border-zinc-200 bg-white shadow-[0_18px_50px_-32px_rgba(0,0,0,0.22)] transition-transform duration-200 hover:-translate-y-0.5 sm:w-[260px]">
      <div className="relative">
        <div className={`relative aspect-[4/3] bg-gradient-to-br ${accent}`}>
          {posterUrl ? (
            <img
              src={posterUrl}
              alt={posterAlt}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : null}

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/5" />

          <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 px-4 py-4">
            <span className="rounded-full border border-white/15 bg-black/25 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-white backdrop-blur-sm">
              {item.event_type}
            </span>
            <span className="rounded-full border border-white/15 bg-black/25 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-white backdrop-blur-sm">
              {item.ticket_mode}
            </span>
          </div>

          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 px-4 py-4 text-white">
            <div className="min-w-0">
              <h3 className="mt-2 max-w-[14rem] truncate text-xl font-black tracking-[-0.05em] leading-none sm:max-w-none sm:text-[1.9rem]">
                {item.event_title}
              </h3>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/12 backdrop-blur-sm">
              <Ticket className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        <p className="text-sm leading-relaxed text-zinc-600 line-clamp-2">{snippet}</p>

        <div className="mt-4 grid gap-3 text-sm text-zinc-600">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-4 w-4 text-red-900" />
            <span className="font-medium text-zinc-700">{date}</span>
            <span className="text-zinc-300">•</span>
            <span>{item.start_time}</span>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-900" />
            <span className="leading-relaxed text-zinc-700">
              {item.venue}
              {item.location ? ` • ${item.location}` : ""}
            </span>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">
                Ticket price
              </p>
              <p className="mt-1 text-base font-black tracking-tight text-zinc-950">{price}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onOpenDetails(item)}
            className="inline-flex items-center gap-2 rounded-2xl bg-zinc-950 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-zinc-800"
          >
            Details
            <ArrowRight className="h-4 w-4" />
          </button>
          {item.ticket_link ? (
            <a
              href={item.ticket_link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-extrabold text-zinc-900 hover:bg-zinc-50"
            >
              Ticket link
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function MobileEventCard({
  item,
  onOpenDetails,
}: {
  item: EventRecord;
  onOpenDetails: (item: EventRecord) => void;
}) {
  const price = formatMoney(item.ticket_price);
  const date = formatDate(item.event_date);
  const accent = posterAccent(item.event_type);
  const posterUrl = getPosterUrl(item);
  const posterAlt = getPosterAlt(item);

  return (
    <button
      type="button"
      onClick={() => onOpenDetails(item)}
      className="overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-white text-left shadow-[0_12px_30px_-24px_rgba(0,0,0,0.28)]"
    >
      <div className={`relative aspect-[4/3] bg-gradient-to-br ${accent}`}>
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={posterAlt}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 p-3">
          <span className="rounded-full border border-white/15 bg-black/30 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
            {item.event_type}
          </span>
          <span className="rounded-full border border-white/15 bg-black/30 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
            {item.ticket_mode}
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 p-3 text-white">
          <h3 className="mt-1 line-clamp-2 text-base font-black tracking-[-0.05em] leading-tight">
            {item.event_title}
          </h3>
        </div>
      </div>

      <div className="p-3">
        <div className="grid gap-2 text-xs text-zinc-600">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-red-900" />
            <span className="font-semibold text-zinc-700">{date}</span>
            <span className="text-zinc-300">•</span>
            <span>{item.start_time}</span>
          </div>

          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-900" />
            <span className="leading-relaxed text-zinc-700 line-clamp-2">
              {item.venue}
              {item.location ? ` • ${item.location}` : ""}
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-zinc-400">
              Ticket price
            </p>
            <p className="mt-0.5 text-sm font-black tracking-tight text-zinc-950">{price}</p>
          </div>
          <div className="rounded-2xl bg-white px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-500">
            Details
          </div>
        </div>
      </div>
    </button>
  );
}

export default function EventsDirectoryPage() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventRecord | null>(null);

  useEffect(() => {
    let active = true;

    async function loadEvents() {
      try {
        setLoading(true);
        const response = (await apiFetch("/api/events")) as { items?: EventRecord[] };
        if (!active) return;
        setEvents(Array.isArray(response?.items) ? response.items : []);
        setError(null);
      } catch (err: any) {
        if (!active) return;
        setError(err?.message || "Could not load events.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadEvents();

    return () => {
      active = false;
    };
  }, []);

  const openDetails = (item: EventRecord) => setSelectedEvent(item);
  const closeDetails = () => setSelectedEvent(null);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-100 text-zinc-900">
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <button type="button" onClick={() => navigateToPath(HOME_PATH)} className="flex items-center gap-3 text-left">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-900 text-white shadow-lg shadow-red-900/20">
              <Ticket className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-black tracking-tight">
                <span className="text-red-900">Buy</span>
                <span className="text-zinc-700">Mesho</span>
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-400">Events</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigateToPath(EXPLORE_PATH)}
            className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-900 shadow-sm hover:bg-zinc-50"
          >
            Back to Market
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-7xl px-4 pb-6 pt-8 sm:pt-10">
          <div className="rounded-[2.25rem] bg-white px-5 py-8 text-zinc-900 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.28)] sm:px-8 sm:py-10 lg:px-10">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-zinc-500">Events directory</p>
            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-4xl font-black tracking-[-0.06em] leading-[0.92] sm:text-5xl lg:text-6xl">
                  Browse events and happenings.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-base">
                  Don&apos;t miss!
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigateToPath(EVENTS_CREATE_PATH)}
                className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-black/10 hover:bg-zinc-800"
              >
                Create Event
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-4">
          <div className="flex items-end justify-between gap-4 pb-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">Latest events</p>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.05em] text-zinc-950 sm:text-4xl">Saved event listings</h2>
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="flex items-center justify-center rounded-[2rem] border border-zinc-200 bg-white px-6 py-20 text-zinc-500 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.18)]">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="ml-3 text-sm font-medium">Loading events...</span>
            </div>
          ) : events.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-3 md:hidden">
                {events.map((item) => (
                  <MobileEventCard key={item.id} item={item} onOpenDetails={openDetails} />
                ))}
              </div>

              <div className="hidden flex-wrap justify-center gap-4 md:flex">
                {events.map((item) => (
                  <DesktopEventCard key={item.id} item={item} onOpenDetails={openDetails} />
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-[2rem] border border-zinc-200 bg-white p-8 text-center shadow-[0_20px_60px_-35px_rgba(0,0,0,0.18)] sm:p-10">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-950 text-white shadow-lg shadow-zinc-900/15">
                <Ticket className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-2xl font-black tracking-[-0.05em] text-zinc-950">No events yet</h3>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-zinc-600">
                Start with the create form. Once an event is posted, it will show up here as a saved card.
              </p>
              <button
                type="button"
                onClick={() => navigateToPath(EVENTS_CREATE_PATH)}
                className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"
              >
                Create an event
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </section>
      </main>

      <EventDetailsModal item={selectedEvent} onClose={closeDetails} />
    </div>
  );
}
