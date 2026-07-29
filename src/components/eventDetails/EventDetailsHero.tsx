import SummaryCard from "./SummaryCard";
import { formatDate, formatClock } from "./eventDetailsUtils";
import type { EventRecord } from "./eventDetailsTypes";

export default function EventDetailsHero({
  event,
  posterUrl,
  posterAlt,
  accent,
  price,
  notice,
  onClearNotice,
}: {
  event: EventRecord;
  posterUrl: string;
  posterAlt: string;
  accent: string;
  price: string;
  notice: string | null;
  onClearNotice: () => void;
}) {
  const date = formatDate(event.event_date);
  const startTime = formatClock(event.start_time);

  return (
    <section className="space-y-8">
      <section>
        <div className={`relative aspect-[16/10] overflow-hidden rounded-[2rem] bg-gradient-to-br ${accent}`}>
          {posterUrl ? <img src={posterUrl} alt={posterAlt} className="h-full w-full object-cover" /> : null}
        </div>
      </section>

      {notice ? (
        <div className="flex items-start justify-between gap-4 rounded-[1.5rem] border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 shadow-sm">
          <p>{notice}</p>
          <button type="button" onClick={onClearNotice} className="font-bold text-zinc-500 hover:text-zinc-900">
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
    </section>
  );
}
