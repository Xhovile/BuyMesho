import { useEffect, useState } from "react";
import { Maximize2, X } from "lucide-react";

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
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const date = formatDate(event.event_date);
  const startTime = formatClock(event.start_time);

  useEffect(() => {
    if (!fullscreenOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFullscreenOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [fullscreenOpen]);

  return (
    <section className="space-y-8">
      <section>
        <button
          type="button"
          onClick={() => setFullscreenOpen(true)}
          className={`relative aspect-[16/10] w-full overflow-hidden rounded-[2rem] bg-gradient-to-br ${accent}`}
          aria-label="Open poster fullscreen"
          title="Open poster fullscreen"
        >
          {posterUrl ? <img src={posterUrl} alt={posterAlt} className="h-full w-full object-cover" /> : null}
          <span className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white backdrop-blur-sm">
            <Maximize2 className="h-4 w-4" />
          </span>
        </button>
      </section>

      {fullscreenOpen ? (
        <div
          className="fixed inset-0 z-[80] bg-black/95 p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Event poster fullscreen"
          onClick={() => setFullscreenOpen(false)}
        >
          <div className="relative flex h-full items-center justify-center">
            <button
              type="button"
              onClick={() => setFullscreenOpen(false)}
              className="absolute right-2 top-2 z-[81] inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
              aria-label="Return from fullscreen"
              title="Return"
            >
              <X className="h-5 w-5" />
            </button>
            <div
              className="max-h-full max-w-full rounded-[1.5rem] bg-zinc-950 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {posterUrl ? (
                <img
                  src={posterUrl}
                  alt={posterAlt}
                  className="block h-auto w-auto max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] object-contain sm:max-h-[calc(100dvh-3rem)] sm:max-w-[calc(100vw-3rem)]"
                />
              ) : (
                <div className="flex h-[60vh] w-[80vw] items-center justify-center text-sm text-zinc-300">No poster available</div>
              )}
            </div>
          </div>
        </div>
      ) : null}

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
