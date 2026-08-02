import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Clock3, CreditCard, MapPin, ShieldAlert, Ticket, UserRound } from "lucide-react";

import MarketHeaderBar from "./components/shared/MarketHeaderBar";
import { EVENTS_PATH, navigateToPath } from "./lib/appNavigation";
import { fetchOrderByReference, type OrderBundle } from "./lib/orderApi";
import { useRequireVerifiedUser } from "./hooks/useRequireVerifiedUser";

type EventTicketTrackingPageProps = {
  reference: string;
  initialBundle?: OrderBundle | null;
};

const ticketStages = [
  "Ticket ordered",
  "Payment confirmed",
  "Ticket issued",
  "Ready for event",
  "Event day",
];

function getTicketStatusLabel(paymentStatus: string) {
  const normalized = paymentStatus.trim().toLowerCase();
  if (["paid", "captured", "verified", "successful", "completed"].includes(normalized)) return "Issued";
  if (["pending", "initiated", "processing", "queued", "awaiting_payment"].includes(normalized)) return "Pending confirmation";
  if (["rejected", "cancelled", "refunded"].includes(normalized)) return "Cancelled";
  if (["failed", "error"].includes(normalized)) return "Ticket issue";
  return paymentStatus || "Pending confirmation";
}

function getTicketProgressIndex(paymentStatus: string) {
  const normalized = paymentStatus.trim().toLowerCase();
  if (["paid", "captured", "verified", "successful", "completed"].includes(normalized)) return 2;
  if (["pending", "initiated", "processing", "queued", "awaiting_payment"].includes(normalized)) return 0;
  if (["rejected", "cancelled", "refunded", "failed", "error"].includes(normalized)) return 0;
  return 1;
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function readFirstString(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function getUnitPriceAmount(item: Record<string, unknown>) {
  const unitPrice = item.unitPrice;
  if (unitPrice && typeof unitPrice === "object") {
    const amount = Number((unitPrice as Record<string, unknown>).amount ?? 0);
    if (Number.isFinite(amount) && amount > 0) return amount;
  }
  const fallback = Number(item.ticketPrice ?? 0);
  return Number.isFinite(fallback) && fallback > 0 ? fallback : 0;
}

function getUnitPriceCurrency(item: Record<string, unknown>, fallbackCurrency: string) {
  const unitPrice = item.unitPrice;
  if (unitPrice && typeof unitPrice === "object") {
    const currency = String((unitPrice as Record<string, unknown>).currency ?? "");
    if (currency.trim()) return currency.trim();
  }
  return fallbackCurrency;
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
  const orderItems = order?.items ?? [];
  const listingItems = useMemo(
    () => orderItems.filter((item) => item?.kind === "listing" || !!item?.listingId || (!item?.kind && !item?.eventId)),
    [orderItems],
  );
  const ticketItems = useMemo(
    () => orderItems.filter((item) => item?.kind === "event_ticket" || !!item?.eventId),
    [orderItems],
  );
  const firstTicketItem = ticketItems[0] ?? orderItems[0] ?? null;
  const paymentStatus = typeof bundle?.payment?.status === "string" ? String(bundle.payment.status) : order?.status ?? "pending";
  const ticketStatus = getTicketStatusLabel(paymentStatus);
  const progressIndex = getTicketProgressIndex(paymentStatus);

  const eventDetails = {
    title: String(firstTicketItem?.title ?? "Event ticket"),
    organizerName: String((firstTicketItem as Record<string, unknown> | null)?.organizerName ?? "Event organizer"),
    eventDate: String((firstTicketItem as Record<string, unknown> | null)?.eventDate ?? ""),
    startTime: String((firstTicketItem as Record<string, unknown> | null)?.startTime ?? ""),
    venue: String((firstTicketItem as Record<string, unknown> | null)?.venue ?? ""),
    location: String((firstTicketItem as Record<string, unknown> | null)?.location ?? ""),
    eventId: typeof firstTicketItem?.eventId === "string" ? firstTicketItem.eventId : null,
  };

  const orderReference = String(bundle?.order?.paymentReference ?? reference);
  const purchaseTime = readFirstString(
    (bundle?.order as Record<string, unknown> | null)?.placedAt as string | null | undefined,
    (bundle?.order as Record<string, unknown> | null)?.paidAt as string | null | undefined,
    (bundle?.payment as Record<string, unknown> | null)?.paidAt as string | null | undefined,
    (bundle?.payment as Record<string, unknown> | null)?.createdAt as string | null | undefined,
    (bundle?.order as Record<string, unknown> | null)?.createdAt as string | null | undefined,
    (bundle?.order as Record<string, unknown> | null)?.updatedAt as string | null | undefined,
    (bundle?.payment as Record<string, unknown> | null)?.updatedAt as string | null | undefined,
  );
  const purchaseTimeLabel = formatDateTime(purchaseTime);

  const eventAmount = ticketItems.reduce((sum, item) => {
    const data = item as Record<string, unknown>;
    const quantity = Math.max(1, Number(data.quantity ?? 1) || 1);
    const unitPrice = getUnitPriceAmount(data);
    return sum + (unitPrice > 0 ? unitPrice * quantity : 0);
  }, 0);
  const ticketCurrency = ticketItems.length
    ? getUnitPriceCurrency(ticketItems[0] as Record<string, unknown>, String(bundle?.order?.total?.currency ?? "MWK"))
    : String(bundle?.order?.total?.currency ?? "MWK");
  const ticketAmount = eventAmount > 0
    ? eventAmount
    : listingItems.length > 0
      ? 0
      : Number(bundle?.order?.total?.amount ?? 0);

  const handleBack = () => navigateToPath("/tickets");
  const handleOpenEvent = () => {
    if (!eventDetails.eventId) return;
    navigateToPath(`${EVENTS_PATH}?event=${encodeURIComponent(eventDetails.eventId)}`);
  };
  const handleSupport = () => {
    navigateToPath("/report");
  };
  const handlePrint = () => {
    window.print();
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
            Review your ticket confirmation and event details in one place.
          </p>
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
          <div className="mt-8 space-y-6">
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-zinc-950 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white">
                      <Ticket className="h-3.5 w-3.5" />
                      Event ticket
                    </div>
                    <h2 className="mt-4 text-2xl font-black tracking-tight text-zinc-950">{eventDetails.title}</h2>
                    <p className="mt-2 text-sm text-zinc-600">{eventDetails.organizerName}</p>
                    {purchaseTimeLabel ? (
                      <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-[11px] font-semibold text-zinc-600">
                        <Clock3 className="h-3.5 w-3.5 text-zinc-400" />
                        Purchased {purchaseTimeLabel}
                      </p>
                    ) : null}
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
                  <p className="mt-1 break-all font-mono text-sm font-semibold text-zinc-900">{orderReference}</p>
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
                  <div className="flex items-center gap-2 text-sm font-bold text-zinc-900">
                    <CreditCard className="h-4 w-4 text-zinc-400" />
                    Payment
                  </div>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">{paymentStatus}</p>
                </div>

                <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 sm:p-6">
                  <div className="flex items-center gap-2 text-sm font-bold text-zinc-900">
                    <Clock3 className="h-4 w-4 text-zinc-400" />
                    Purchase time
                  </div>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">{purchaseTimeLabel || "—"}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Progress</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-5">
                {ticketStages.map((stage, index) => {
                  const active = index <= progressIndex;
                  return (
                    <div
                      key={stage}
                      className={`rounded-2xl border px-4 py-3 ${
                        active ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-zinc-50 text-zinc-500"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em]">{index + 1}</p>
                        <span className={`h-2.5 w-2.5 rounded-full ${active ? "bg-white" : "bg-zinc-300"}`} />
                      </div>
                      <p className="mt-3 text-sm font-semibold leading-6">{stage}</p>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-600">
                Current state: <span className="font-bold text-zinc-900">{ticketStatus}</span>
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 sm:p-6">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Ticket details</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-zinc-50 px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Quantity</p>
                    <p className="mt-1 text-sm font-semibold text-zinc-900">{ticketItems.reduce((sum, item) => sum + Number(item?.quantity ?? 1), 0) || 1}</p>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Ticket price</p>
                    <p className="mt-1 text-sm font-semibold text-zinc-900">{formatMoney(ticketAmount, ticketCurrency)}</p>
                    {listingItems.length > 0 ? <p className="mt-1 text-xs text-zinc-500">Listing totals stay in Purchases.</p> : null}
                  </div>
                  <div className="rounded-2xl bg-zinc-50 px-4 py-3 sm:col-span-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Item references</p>
                    <div className="mt-2 space-y-2">
                      {ticketItems.length ? (
                        ticketItems.map((item, index) => (
                          <div key={`${item.title ?? "ticket"}-${index}`} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-semibold text-zinc-900">{String(item.title ?? "Event ticket")}</span>
                              <span className="font-mono text-xs text-zinc-500">{String((item as Record<string, unknown>).reference ?? `${orderReference}-EVENT-${String(index + 1).padStart(2, "0")}`)}</span>
                            </div>
                            <p className="mt-1 text-xs text-zinc-500">Quantity × {Number(item?.quantity ?? 1)}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-zinc-600">No ticket items found.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 sm:p-6">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Payment summary</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-zinc-50 px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Payment status</p>
                    <p className="mt-1 text-sm font-semibold text-zinc-900">{paymentStatus}</p>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Ticket amount</p>
                    <p className="mt-1 text-sm font-semibold text-zinc-900">{formatMoney(ticketAmount, ticketCurrency)}</p>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 px-4 py-3 sm:col-span-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Ticket note</p>
                    <p className="mt-1 text-sm leading-6 text-zinc-600">
                      This ticket is managed separately from escrow-based order tracking.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              <div> 
                <button
                  type="button"
                  onClick={handlePrint}
                  className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-zinc-900 bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800"
                >
                  <Ticket className="h-4 w-4" />
                  Print now
                </button>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleOpenEvent}
                  disabled={!eventDetails.eventId}
                  className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-900 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <MapPin className="h-4 w-4" />
                  Open event
                </button>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleSupport}
                  className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-bold text-sky-800 hover:bg-sky-100"
                >
                  <ShieldAlert className="h-4 w-4" />
                  Support
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
