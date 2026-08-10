import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Clock3, CreditCard, Download, Mail, MapPin, Phone, ShieldAlert, Ticket, UserRound } from "lucide-react";

import MarketHeaderBar from "./components/shared/MarketHeaderBar";
import { EVENTS_PATH, navigateToPath } from "./lib/appNavigation";
import { downloadTicketPdf } from "./lib/ticketPdf";
import { fetchOrderByReference, type OrderBundle } from "./lib/orderApi";
import { useRequireVerifiedUser } from "./hooks/useRequireVerifiedUser";

export type EventTicketTrackingPageProps = { reference: string; initialBundle?: OrderBundle | null };
function getTicketStatusLabel(paymentStatus: string) { const normalized = paymentStatus.trim().toLowerCase(); if (["paid", "captured", "verified", "successful", "completed"].includes(normalized)) return "Issued"; if (["pending", "initiated", "processing", "queued", "awaiting_payment"].includes(normalized)) return "Pending confirmation"; if (["rejected", "cancelled", "refunded"].includes(normalized)) return "Cancelled"; if (["failed", "error"].includes(normalized)) return "Ticket issue"; return paymentStatus || "Pending confirmation"; }
function formatMoney(amount: number, currency: string) { try { return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount); } catch { return `${currency} ${amount.toLocaleString()}`; } }
function formatDateTime(value: string | null | undefined) { if (!value) return ""; const date = new Date(value); if (Number.isNaN(date.getTime())) return value; return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date); }
function readString(source: Record<string, unknown> | undefined, ...fields: string[]) { if (!source) return ""; for (const field of fields) { const value = source[field]; if (typeof value === "string" && value.trim()) return value.trim(); } return ""; }
function ticketFileName(title: string, code: string) { const safeTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "ticket"; return `${safeTitle}-${code}.pdf`; }

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
    if (!trimmed) { setError("No ticket reference found."); setLoading(false); return; }
    setLoading(true); setError(null);
    try { setBundle(await fetchOrderByReference(trimmed)); }
    catch (err) { setBundle(null); setError(err instanceof Error ? err.message : "Failed to load ticket details."); }
    finally { setLoading(false); }
  }, [reference]);

  useEffect(() => { if (initialBundle) { setBundle(initialBundle); setLoading(false); return; } void reload(); }, [initialBundle, reload]);

  const order = bundle?.order ?? null;
  const ticketItems = useMemo(() => (order?.items ?? []).filter((item) => item?.kind === "event_ticket" || !!item?.eventId), [order]);
  const firstTicketItem = ticketItems[0] ?? null;
  const firstData = firstTicketItem as Record<string, unknown> | null;
  const firstTickets = Array.isArray(firstData?.tickets) ? firstData.tickets.filter((entry) => entry && typeof entry === "object") as Array<Record<string, unknown>> : [];
  const firstTicket = firstTickets[0];
  const holder = firstTicket?.holder && typeof firstTicket.holder === "object" ? firstTicket.holder as Record<string, unknown> : firstData?.ticketHolder && typeof firstData.ticketHolder === "object" ? firstData.ticketHolder as Record<string, unknown> : undefined;
  const ticketId = readString(firstTicket, "ticketId") || readString(firstData, "ticketId") || "—";
  const ticketType = readString(firstData, "ticketType") || "General Admission";
  const paymentStatus = typeof bundle?.payment?.status === "string" ? bundle.payment.status : order?.status ?? "pending";
  const ticketStatus = getTicketStatusLabel(paymentStatus);
  const eventDetails = {
    title: String(firstData?.title ?? "Event ticket"),
    organizerName: readString(firstData, "organizerName") || "Event organizer",
    eventDate: readString(firstData, "eventDate"),
    startTime: readString(firstData, "startTime"),
    venue: readString(firstData, "venue"),
    location: readString(firstData, "location"),
    eventId: typeof firstData?.eventId === "string" ? firstData.eventId : null,
  };
  const purchaseTime = [order?.placedAt, order?.paidAt, bundle?.payment?.paidAt, bundle?.payment?.createdAt, order?.createdAt, order?.updatedAt, bundle?.payment?.updatedAt].find((value): value is string => typeof value === "string" && value.trim()) ?? null;
  const purchaseTimeLabel = formatDateTime(purchaseTime);
  const ticketAmount = ticketItems.reduce((sum, item) => { const data = item as Record<string, unknown>; const quantity = Math.max(1, Number(data.quantity ?? 1) || 1); const unitPrice = data.unitPrice && typeof data.unitPrice === "object" ? Number((data.unitPrice as Record<string, unknown>).amount ?? 0) : Number(data.ticketPrice ?? 0); return sum + (Number.isFinite(unitPrice) ? unitPrice * quantity : 0); }, 0);
  const ticketCurrency = firstData?.unitPrice && typeof firstData.unitPrice === "object" ? String((firstData.unitPrice as Record<string, unknown>).currency ?? "MWK") : "MWK";

  const handlePrint = () => {
    downloadTicketPdf(ticketFileName(eventDetails.title, ticketId), `${eventDetails.title} ticket`, [
      { label: "Event", value: eventDetails.title },
      { label: "Organizer", value: eventDetails.organizerName },
      { label: "Ticket ID", value: ticketId },
      { label: "Ticket holder", value: readString(holder, "fullName") || "—" },
      { label: "Email", value: readString(holder, "email") || "—" },
      { label: "Phone", value: readString(holder, "phone") || "—" },
      { label: "Ticket type", value: ticketType },
      { label: "Date", value: eventDetails.eventDate || "—" },
      { label: "Time", value: eventDetails.startTime || "—" },
      { label: "Venue", value: [eventDetails.venue, eventDetails.location].filter(Boolean).join(" • ") || "—" },
      { label: "Status", value: ticketStatus },
      { label: "Amount", value: formatMoney(ticketAmount, ticketCurrency) },
    ], { ticketCode: ticketId, brandName: "BuyMesho", brandTagline: "Official event ticket" });
  };
  const handleOpenEvent = () => { if (eventDetails.eventId) navigateToPath(`${EVENTS_PATH}?event=${encodeURIComponent(eventDetails.eventId)}`); };

  return <div className="min-h-screen bg-zinc-50 text-zinc-900"><MarketHeaderBar subtitle="Tickets" /><div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
    <button type="button" onClick={() => navigateToPath("/tickets")} className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-800 hover:bg-zinc-50"><ArrowLeft className="h-4 w-4" />Back to tickets</button>
    <div className="mt-8 border-b border-zinc-200 pb-6"><p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Event ticket</p><h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">Ticket details</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600">Your ticket information and current validation status.</p></div>
    {loading ? <div className="mt-6 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">Loading ticket details…</div> : error ? <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : order ? <div className="mt-8 space-y-6">
      <section className="rounded-[2rem] border border-zinc-200 bg-white p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="inline-flex items-center gap-2 rounded-full bg-zinc-950 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white"><Ticket className="h-3.5 w-3.5" />Event ticket</div><h2 className="mt-4 text-2xl font-black tracking-tight text-zinc-950">{eventDetails.title}</h2><p className="mt-1 text-sm text-zinc-600">{eventDetails.organizerName}</p></div><span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-white">{ticketStatus}</span></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-zinc-50 px-4 py-3"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Ticket ID</p><p className="mt-1 font-mono text-sm font-bold text-zinc-950">{ticketId}</p></div><div className="rounded-2xl bg-zinc-50 px-4 py-3"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Ticket type</p><p className="mt-1 text-sm font-semibold text-zinc-900">{ticketType}</p></div><div className="rounded-2xl bg-zinc-50 px-4 py-3"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Ticket holder</p><p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-zinc-900"><UserRound className="h-4 w-4 text-zinc-400" />{readString(holder, "fullName") || "—"}</p></div><div className="rounded-2xl bg-zinc-50 px-4 py-3"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Email</p><p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-zinc-900"><Mail className="h-4 w-4 text-zinc-400" />{readString(holder, "email") || "—"}</p></div><div className="rounded-2xl bg-zinc-50 px-4 py-3"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Phone</p><p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-zinc-900"><Phone className="h-4 w-4 text-zinc-400" />{readString(holder, "phone") || "—"}</p></div><div className="rounded-2xl bg-zinc-50 px-4 py-3"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Date & time</p><p className="mt-1 text-sm font-semibold text-zinc-900">{[eventDetails.eventDate, eventDetails.startTime].filter(Boolean).join(" • ") || "—"}</p></div><div className="rounded-2xl bg-zinc-50 px-4 py-3 sm:col-span-2"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Venue</p><p className="mt-1 inline-flex items-start gap-2 text-sm font-semibold text-zinc-900"><MapPin className="mt-0.5 h-4 w-4 text-zinc-400" />{[eventDetails.venue, eventDetails.location].filter(Boolean).join(" • ") || "—"}</p></div></div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-4"><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Purchased</p><p className="mt-1 text-sm font-semibold text-zinc-700">{purchaseTimeLabel || "—"}</p></div><div className="text-right"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Amount</p><p className="mt-1 text-lg font-black text-zinc-950">{formatMoney(ticketAmount, ticketCurrency)}</p></div></div>
      </section>
      <section className="rounded-[2rem] border border-zinc-200 bg-white p-5 sm:p-6"><p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Actions</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={handlePrint} className="inline-flex items-center gap-2 rounded-2xl border border-orange-500 bg-orange-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-600"><Download className="h-4 w-4" />Print PDF</button><button type="button" onClick={handleOpenEvent} disabled={!eventDetails.eventId} className="inline-flex items-center gap-2 rounded-2xl border border-zinc-900 bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-50"><Ticket className="h-4 w-4" />Open event</button><button type="button" onClick={() => navigateToPath("/report")} className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-bold text-sky-800 hover:bg-sky-100"><ShieldAlert className="h-4 w-4" />Support</button></div></section>
    </div> : null}
  </div></div>;
}
