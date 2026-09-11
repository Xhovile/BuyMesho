import { CalendarClock } from "lucide-react";
import type { OrderBundle } from "./types";

type TimelineEvent = {
  label: string;
  at: string | null | undefined;
};

const EVENT_ORDER = [
  "Order placed",
  "Payment received",
  "Delivered",
  "Dispute opened",
  "Dispute resolved",
  "Payout created",
  "Payout paid",
  "Payout failed",
];

function formatBlantyreDateTime(value: string): { date: string; time: string } | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const dateFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Blantyre",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Blantyre",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return {
    date: dateFormatter.format(date),
    time: timeFormatter.format(date).toLowerCase(),
  };
}

function buildEvents(bundle: OrderBundle): TimelineEvent[] {
  const events: TimelineEvent[] = [
    { label: "Order placed", at: bundle.order.placedAt ?? bundle.order.createdAt },
    { label: "Payment received", at: bundle.order.paidAt },
    { label: "Delivered", at: bundle.order.fulfilledAt },
    { label: "Dispute opened", at: bundle.dispute?.openedAt },
    { label: "Dispute resolved", at: bundle.dispute?.resolvedAt },
    { label: "Payout created", at: bundle.payout?.createdAt },
    {
      label: "Payout paid",
      at: bundle.payout?.status?.toLowerCase() === "paid" ? bundle.payout.paidAt : null,
    },
    {
      label: "Payout failed",
      at: bundle.payout?.status?.toLowerCase() === "failed" ? bundle.payout.failedAt : null,
    },
  ];

  return events
    .filter((event) => Boolean(event.at))
    .sort((a, b) => {
      const aTime = new Date(a.at as string).getTime();
      const bTime = new Date(b.at as string).getTime();
      return aTime - bTime || EVENT_ORDER.indexOf(a.label) - EVENT_ORDER.indexOf(b.label);
    });
}

export default function OrderTimeline({ bundle }: { bundle: OrderBundle }) {
  const events = buildEvents(bundle);

  return (
    <section className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-zinc-500" />
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-zinc-400">Order timeline</p>
          <p className="mt-0.5 text-xs font-semibold text-zinc-500">Times shown in Malawi time (Africa/Blantyre)</p>
        </div>
      </div>

      {events.length ? (
        <ol className="mt-5 space-y-4">
          {events.map((event, index) => {
            const formatted = formatBlantyreDateTime(event.at as string);
            if (!formatted) return null;
            return (
              <li key={`${event.label}-${event.at}`} className="relative flex gap-4">
                {index < events.length - 1 ? (
                  <span className="absolute left-[5px] top-3 h-[calc(100%+1rem)] w-px bg-zinc-200" aria-hidden="true" />
                ) : null}
                <span className="relative mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-zinc-950 ring-4 ring-zinc-100" aria-hidden="true" />
                <div className="min-w-0 flex-1 sm:flex sm:items-baseline sm:justify-between sm:gap-4">
                  <p className="text-sm font-extrabold text-zinc-950">{event.label}</p>
                  <div className="mt-1 text-xs font-semibold text-zinc-500 sm:mt-0 sm:text-right">
                    <span>{formatted.date}</span>
                    <span className="mx-1.5 text-zinc-300">•</span>
                    <span className="text-zinc-700">{formatted.time}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-4 text-sm font-semibold text-zinc-500">No order events have been recorded yet.</p>
      )}
    </section>
  );
}
