import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Clock3, MapPin, ShieldAlert, Ticket, UserRound } from "lucide-react";

import MarketHeaderBar from "./components/shared/MarketHeaderBar";
import { EVENTS_PATH, navigateToPath } from "./lib/appNavigation";
import { fetchOrderByReference, type OrderBundle } from "./lib/orderApi";
import { getOrderFlowType } from "./lib/orderFlow";
import { useRequireVerifiedUser } from "./hooks/useRequireVerifiedUser";

type EventTicketTrackingPageProps = {
  reference: string;
  initialBundle?: OrderBundle | null;
};

function getTicketStatusLabel(paymentStatus: string) {
  const normalized = paymentStatus.trim().toLowerCase();
  if (["paid", "captured", "verified", "successful", "completed"].includes(normalized)) return "Issued";
  if (["pending", "initiated", "processing", "queued", "awaiting_payment"].includes(normalized)) return "Pending confirmation";
  if (["rejected", "cancelled", "refunded"].includes(normalized)) return "Cancelled";
  if (["failed", "error"].includes(normalized)) return "Ticket issue";
  return paymentStatus || "Pending confirmation";
}

export default function EventTicketTrackingPage({ reference, initialBundle = null }: EventTicketTrackingPageProps) {
  const ready = useRequireVerifiedUser();
  if (!ready) return null;
  return <EventTicketTrackingPageContent reference={reference} initialBundle={initialBundle} />;
}

function EventTicketTrackingPageContent({ reference, initialBundle = null }: EventTicketTrackingPageProps) {
  const [bundle, setBundle] = useState<OrderBundle | null>(initialBundle);
  const [loading, setLoading] = useState(() => !initialBundle);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const trimmed = reference.trim();
    if (!trimmed) {
      setError("No ticket reference found.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchOrderByReference(trimmed);
      setBundle(data);
    } catch (err) {
      setBundle(null);
      setError(err instanceof Error ? err.message : "Failed to load ticket details.");
    } finally {
      setLoading(false);
    }
  }, [reference]);

  useEffect(() => {
    if (initialBundle) {
      setBundle(initialBundle);
      setLoading(false);
      return;
    }

    void reload();
  }, [initialBundle, reload]);

  const order = bundle?.order ?? null;
  const firstItem = order?.items?.[0] ?? null;
  const flowType = useMemo(() => getOrderFlowType(bundle), [bundle]);
  const paymentStatus = typeof bundle?.payment?.status === "string" ? String(bundle.payment.status) : order?.status ?? "pending";
  const ticketStatus = getTicketStatusLabel(paymentStatus);

  const eventDetails = {
    title: String(firstItem?.title ?? "Event ticket"),
    organizerName: String((firstItem as Record<string, unknown> | null)?.organizerName ?? "Event organizer"),
    eventDate: String((firstItem as Record<string, unknown> | null)?.eventDate ?? ""),
    startTime: String((firstItem as Record<string, unknown> | null)?.startTime ?? ""),
    venue: String((firstItem as Record<string, unknown> | null)?.venue ?? ""),
    location: String((firstItem as Record<string, unknown> | null)?.location ?? ""),
    eventId: typeof firstItem?.eventId === "string" ? firstItem.eventId : null,
  };

  const handleBack = () => navigateToPath("/tickets");
  const handleOpenEvent = () => {
    if (!eventDetails.eventId) return;
    navigateToPath(`${EVENTS_PATH}?event=${encodeURIComponent(eventDetails.eventId)}`);
  };
  const handleSupport = () => {
    navigateToPath("/report");
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <MarketHeaderBar subtitle="Tickets" />

      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-800 hover:bg-zinc-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to tickets
        </button>

        <div className="mt-8 border-b border-zinc-200 pb-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Event ticket tracking</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">Ticket status overview</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600 sm:text-base">
            Review the ticket confirmation, event details, and support options in one place.
          </p>
          {flowType !== "event_only" ? (
            <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              This reference includes more than a pure event ticket. The buyer order flow may also apply.
            </p>
          ) : null}
        </div>

        {loading ? (
          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
            Loading ticket details…
          </div>
        ) : error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : order ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-zinc-950 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white">
                    <Ticket className="h-3.5 w-3.5" />
                    Event ticket
                  </div>
                  <h2 className="mt-4 text-2xl font-black tracking-tight text-zinc-950">{eventDetails.title}</h2>
                  <p className="mt-2 text-sm text-zinc-600">{eventDetails.organizerName}</p>
                </div>
                <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-white">
                  {ticketStatus}
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-zinc-50 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Date</p>
                  <p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-zinc-900">
                    <CalendarDays className="h-4 w-4 text-zinc-400" />
                    {eventDetails.eventDate || "—"}
                  </p>
                </div>
                <div className="rounded-2xl bg-zinc-50 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Time</p>
                  <p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-zinc-900">
                    <Clock3 className="h-4 w-4 text-zinc-400" />
                    {eventDetails.startTime || "—"}
                  </p>
                </div>
                <div className="rounded-2xl bg-zinc-50 px-4 py-3 sm:col-span-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Venue</p>
                  <p className="mt-1 inline-flex items-start gap-2 text-sm font-semibold text-zinc-900">
                    <MapPin className="mt-0.5 h-4 w-4 text-zinc-400" />
                    <span>{[eventDetails.venue, eventDetails.location].filter(Boolean).join(" • ") || "—"}</span>
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Ticket reference</p>
                <p className="mt-1 break-all font-mono text-sm font-semibold text-zinc-900">{reference}</p>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleOpenEvent}
                  className="inline-flex items-center gap-2 rounded-2xl bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800"
                >
                  <MapPin className="h-4 w-4" />
                  Open event
                </button>
                <button
                  type="button"
                  onClick={handleSupport}
                  className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-bold text-sky-800 hover:bg-sky-100"
                >
                  <ShieldAlert className="h-4 w-4" />
                  Support / report issue
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 sm:p-6">
                <div className="flex items-center gap-2 text-sm font-bold text-zinc-900">
                  <UserRound className="h-4 w-4 text-zinc-400" />
                  Ticket holder
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-600">Verified buyer account</p>
              </div>

              <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 sm:p-6">
                <p className="text-sm font-bold text-zinc-900">Ticket state</p>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{ticketStatus}</p>
              </div>

              <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 sm:p-6">
                <p className="text-sm font-bold text-zinc-900">Status note</p>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  This view is for ticket confirmation and event reference only.
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
