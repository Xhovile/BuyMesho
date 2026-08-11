import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, Mail, MapPin, Phone, ShieldAlert, Ticket, UserRound } from "lucide-react";
import MarketHeaderBar from "./components/shared/MarketHeaderBar";
import { EVENTS_PATH, navigateToPath } from "./lib/appNavigation";
import { apiFetch } from "./lib/api";
import { downloadTicketPdf } from "./lib/ticketPdf";
import { useRequireVerifiedUser } from "./hooks/useRequireVerifiedUser";
import type { OrderBundle } from "./lib/orderApi";

type EventTicketTrackingPageProps = { ticketId?: string; reference?: string; initialBundle?: OrderBundle | null };
function getTicketStatusLabel(value: string) { const normalized = value.trim().toLowerCase(); if (["paid", "captured", "verified", "successful", "completed"].includes(normalized)) return "Issued"; if (["pending", "initiated", "processing", "queued", "awaiting_payment"].includes(normalized)) return "Pending confirmation"; if (["rejected", "cancelled", "refunded"].includes(normalized)) return "Cancelled"; if (["failed", "error"].includes(normalized)) return "Ticket issue"; return value || "Pending confirmation"; }
function formatMoney(amount: number, currency: string) { try { return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount); } catch { return `${currency} ${amount.toLocaleString()}`; } }
function readString(source: Record<string, unknown> | undefined, ...fields: string[]) { if (!source) return ""; for (const field of fields) { const value = source[field]; if (typeof value === "string" && value.trim()) return value.trim(); } return ""; }
function findTicket(bundle: OrderBundle, ticketId: string) { for (const item of bundle.order?.items ?? []) { if (!item || (item as Record<string, unknown>).kind !== "event_ticket") continue; const data = item as Record<string, unknown>; const tickets = Array.isArray(data.tickets) ? data.tickets : []; if (tickets.some((entry) => entry && typeof entry === "object" && String((entry as Record<string, unknown>).ticketId ?? "") === ticketId)) return { item: data, ticket: tickets.find((entry) => entry && typeof entry === "object" && String((entry as Record<string, unknown>).ticketId ?? "") === ticketId) as Record<string, unknown> | undefined }; if (String(data.ticketId ?? "") === ticketId) return { item: data, ticket: undefined }; } return null; }
function ticketFileName(title: string, ticketId: string) { const safeTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "ticket"; return `${safeTitle}-${ticketId}.pdf`; }

export default function EventTicketTrackingPage({ ticketId = "", reference = "", initialBundle = null }: EventTicketTrackingPageProps) {
  const ready = useRequireVerifiedUser();
  if (!ready) return null;
  return <EventTicketTrackingPageContent ticketId={ticketId} reference={reference} initialBundle={initialBundle} />;
}

function EventTicketTrackingPageContent({ ticketId = "", reference = "", initialBundle = null }: EventTicketTrackingPageProps) {
  const activeTicketId = (ticketId || reference || "").trim();
  const [bundle, setBundle] = useState<OrderBundle | null>(initialBundle);
  const [loading, setLoading] = useState(() => !initialBundle);
  const [error, setError] = useState<string | null>(null);
  const [match, setMatch] = useState<{ item: Record<string, unknown>; ticket?: Record<string, unknown> } | null>(null);

  const reload = useCallback(async () => {
    const trimmed = activeTicketId;
    if (!trimmed) { setError("No Ticket ID found."); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const data = initialBundle ? initialBundle : await apiFetch("/api/payments/orders/me", { timeoutMs: 30000, retryAttempts: 1 });
      const bundles = initialBundle ? [initialBundle] : Array.isArray(data) ? data as OrderBundle[] : [];
      const found = bundles.map((candidate) => ({ candidate, result: findTicket(candidate, trimmed) })).find((entry) => entry.result);
      if (!found?.result) { setBundle(null); setMatch(null); setError("Ticket not found in your account."); return; }
      setBundle(found.candidate); setMatch(found.result);
    } catch (err) { setBundle(null); setMatch(null); setError(err instanceof Error ? err.message : "Failed to load ticket details."); }
    finally { setLoading(false); }
  }, [initialBundle, activeTicketId]);

  useEffect(() => { void reload(); }, [reload]);

  const item = match?.item;
  const ticket = match?.ticket;
  const holder = ticket?.holder && typeof ticket.holder === "object" ? ticket.holder as Record<string, unknown> : item?.ticketHolder && typeof item.ticketHolder === "object" ? item.ticketHolder as Record<string, unknown> : undefined;
  const title = readString(item, "title") || "Event ticket";
  const organizer = readString(item, "organizerName") || "Event organizer";
  const ticketType = readString(item, "ticketType") || "General Admission";
  const eventDate = readString(item, "eventDate");
  const startTime = readString(item, "startTime");
  const venue = [readString(item, "venue"), readString(item, "location")].filter(Boolean).join(" • ");
  const status = getTicketStatusLabel(String(bundle?.payment?.status ?? bundle?.order?.status ?? "pending"));
  const amount = Number(item?.unitPrice && typeof item.unitPrice === "object" ? (item.unitPrice as Record<string, unknown>).amount ?? 0 : item?.ticketPrice ?? 0) || 0;
  const currency = String(item?.unitPrice && typeof item.unitPrice === "object" ? (item.unitPrice as Record<string, unknown>).currency ?? "MWK" : "MWK");
  const purchaseTime = useMemo(() => [bundle?.order?.paidAt, bundle?.order?.placedAt, bundle?.order?.createdAt, bundle?.order?.updatedAt].find((value): value is string => typeof value === "string" && Boolean(value.trim())) ?? "", [bundle]);
  const eventId = typeof item?.eventId === "string" ? item.eventId : "";

  const handlePrint = () => downloadTicketPdf(ticketFileName(title, ticketId), `${title} ticket`, [{ label: "Event", value: title }, { label: "Organizer", value: organizer }, { label: "Ticket ID", value: ticketId }, { label: "Ticket holder", value: readString(holder, "fullName") || "—" }, { label: "Email", value: readString(holder, "email") || "—" }, { label: "Phone", value: readString(holder, "phone") || "—" }, { label: "Ticket type", value: ticketType }, { label: "Date", value: eventDate || "—" }, { label: "Time", value: startTime || "—" }, { label: "Venue", value: venue || "—" }, { label: "Status", value: status }, { label: "Amount", value: formatMoney(amount, currency) }], { ticketCode: ticketId, brandName: "BuyMesho", brandTagline: "Official event ticket" });

  return <div className="min-h-screen bg-zinc-50 text-zinc-900"><MarketHeaderBar subtitle="Tickets" /><div className="mx-auto max-w-5xl px-4 py-6 sm:py-10"><button type="button" onClick={() => navigateToPath("/tickets")} className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-800 hover:bg-zinc-50"><ArrowLeft className="h-4 w-4" />Back to tickets</button><div className="mt-8 border-b border-zinc-200 pb-6"><p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Event ticket</p><h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">Ticket details</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600">Your ticket information and current validation status.</p></div>
    {loading ? <div className="mt-6 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">Loading ticket details…</div> : error ? <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : bundle && item ? <div className="mt-8 space-y-6"><section className="rounded-[2rem] border border-zinc-200 bg-white p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="inline-flex items-center gap-2 rounded-full bg-zinc-950 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white"><Ticket className="h-3.5 w-3.5" />Event ticket</div><h2 className="mt-4 text-2xl font-black tracking-tight text-zinc-950">{title}</h2><p className="mt-1 text-sm text-zinc-600">{organizer}</p></div><span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-white">{status}</span></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-zinc-50 px-4 py-3"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Ticket ID</p><p className="mt-1 font-mono text-sm font-bold text-zinc-950">{ticketId}</p></div><div className="rounded-2xl bg-zinc-50 px-4 py-3"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Ticket type</p><p className="mt-1 text-sm font-semibold text-zinc-900">{ticketType}</p></div><div className="rounded-2xl bg-zinc-50 px-4 py-3"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Ticket holder</p><p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-zinc-900"><UserRound className="h-4 w-4 text-zinc-400" />{readString(holder, "fullName") || "—"}</p></div><div className="rounded-2xl bg-zinc-50 px-4 py-3"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Email</p><p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-zinc-900"><Mail className="h-4 w-4 text-zinc-400" />{readString(holder, "email") || "—"}</p></div><div className="rounded-2xl bg-zinc-50 px-4 py-3"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Phone</p><p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-zinc-900"><Phone className="h-4 w-4 text-zinc-400" />{readString(holder, "phone") || "—"}</p></div><div className="rounded-2xl bg-zinc-50 px-4 py-3"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Date & time</p><p className="mt-1 text-sm font-semibold text-zinc-900">{[eventDate, startTime].filter(Boolean).join(" • ") || "—"}</p></div><div className="rounded-2xl bg-zinc-50 px-4 py-3 sm:col-span-2"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Venue</p><p className="mt-1 inline-flex items-start gap-2 text-sm font-semibold text-zinc-900"><MapPin className="mt-0.5 h-4 w-4 text-zinc-400" />{venue || "—"}</p></div></div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-4"><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Purchased</p><p className="mt-1 text-sm font-semibold text-zinc-700">{purchaseTime || "—"}</p></div><div className="text-right"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Amount</p><p className="mt-1 text-lg font-black text-zinc-950">{formatMoney(amount, currency)}</p></div></div></section>
      <section className="rounded-[2rem] border border-zinc-200 bg-white p-5 sm:p-6"><p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Actions</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={handlePrint} className="inline-flex items-center gap-2 rounded-2xl border border-orange-500 bg-orange-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-600"><Download className="h-4 w-4" />Print PDF</button><button type="button" onClick={() => eventId && navigateToPath(`${EVENTS_PATH}?event=${encodeURIComponent(eventId)}`)} disabled={!eventId} className="inline-flex items-center gap-2 rounded-2xl border border-zinc-900 bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-50"><Ticket className="h-4 w-4" />Open event</button><button type="button" onClick={() => navigateToPath("/report")} className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-bold text-sky-800 hover:bg-sky-100"><ShieldAlert className="h-4 w-4" />Support</button></div></section>
    </div> : null}
  </div></div>;
}
