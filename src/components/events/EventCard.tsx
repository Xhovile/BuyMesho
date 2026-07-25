import { CalendarDays, MapPin } from "lucide-react";

import { EVENTS_PATH, navigateToPath } from "../../lib/appNavigation";

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

export type { EventRecord };

export function EventCard({ item }: { item: EventRecord }) {
  const price = formatMoney(item.ticket_price);
  const date = formatDate(item.event_date);
  const accent = posterAccent(item.event_type);
  const posterUrl = getPosterUrl(item);
  const posterAlt = getPosterAlt(item);

  return (
    <button
      type="button"
      onClick={() => navigateToPath(`${EVENTS_PATH}?event=${item.id}`)}
      className="overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-white text-left shadow-[0_12px_30px_-24px_rgba(0,0,0,0.28)]"
    >
      <div className={`relative aspect-[4/3] bg-gradient-to-br ${accent}`}>
        {posterUrl ? <img src={posterUrl} alt={posterAlt} className="h-full w-full object-cover" loading="lazy" /> : null}
      </div>

      <div className="p-3">
        <h3 className="line-clamp-2 text-base font-black tracking-[-0.05em] leading-tight text-zinc-950">{item.event_title}</h3>

        <div className="mt-3 grid gap-2 text-xs text-zinc-600">
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

        <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-zinc-400">Ticket price</p>
            <p className="text-sm font-black tracking-tight text-zinc-950">{price}</p>
          </div>
        </div>
      </div>
    </button>
  );
}
