import { useEffect, useMemo, useState } from "react";
import { Loader2, Users } from "lucide-react";

import EventTicketTrackingPage from "./EventTicketTrackingPage";
import MarketHeaderBar from "./components/shared/MarketHeaderBar";
import BuyerTicketCard from "./components/buyer/BuyerTicketCard";
import { navigateToPath } from "./lib/appNavigation";
import { apiFetch } from "./lib/api";
import { buildBuyerTickets, type BuyerTicketRecord, type BuyerTicketStatus } from "./lib/buyerTickets";
import { downloadTicketPdf } from "./lib/ticketPdf";
import { readBuyerPayments, type BuyerPaymentRecord } from "./lib/buyerState";
import { useRequireVerifiedUser } from "./hooks/useRequireVerifiedUser";
import { getCachedBuyerOrders, hasCachedBuyerOrders, setCachedBuyerOrders } from "./lib/buyerOrdersCache";
import type { OrderBundle } from "./lib/orderApi";

const FILTERS: Array<{ key: "all" | BuyerTicketStatus; label: string }> = [
  { key: "all", label: "All" }, { key: "paid", label: "Paid" }, { key: "pending", label: "Pending" }, { key: "rejected", label: "Rejected" }, { key: "error", label: "Error" },
];
function sortTicketsByNewest(tickets: BuyerTicketRecord[]) { return [...tickets].sort((left, right) => (right.updatedAt ? Date.parse(right.updatedAt) : 0) - (left.updatedAt ? Date.parse(left.updatedAt) : 0)); }
function ticketFileName(ticket: BuyerTicketRecord) { const safeTitle = ticket.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "ticket"; return `${safeTitle}-${ticket.ticketId}.pdf`; }
function getTicketIdFromUrl() { if (typeof window === "undefined") return null; return new URLSearchParams(window.location.search).get("ticketId"); }

export default function TicketsPage() {
  const ready = useRequireVerifiedUser();
  if (!ready) return null;
  const ticketId = getTicketIdFromUrl();
  if (ticketId) return <EventTicketTrackingPage ticketId={ticketId} />;
  return <TicketsListPage />;
}

function TicketsListPage() {
  const [orders, setOrders] = useState<OrderBundle[]>(() => getCachedBuyerOrders() ?? []);
  const [paymentRecords, setPaymentRecords] = useState<BuyerPaymentRecord[]>([]);
  const [loading, setLoading] = useState(() => !hasCachedBuyerOrders());
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | BuyerTicketStatus>("all");
  useEffect(() => {
    let mounted = true;
    const syncLocal = () => { if (mounted) setPaymentRecords(readBuyerPayments()); };
    syncLocal();
    const cachedOrders = getCachedBuyerOrders();
    if (cachedOrders) { setOrders(cachedOrders); setLoading(false); }
    void (async () => { try { const data = await apiFetch("/api/payments/orders/me", { timeoutMs: 30000, retryAttempts: 1 }); if (!mounted) return; const nextOrders = Array.isArray(data) ? data as OrderBundle[] : []; setOrders(nextOrders); setCachedBuyerOrders(nextOrders); } catch (err) { if (!mounted) return; setError(err instanceof Error ? err.message : "Failed to load buyer tickets."); } finally { if (mounted) setLoading(false); } })();
    window.addEventListener("storage", syncLocal); window.addEventListener("focus", syncLocal);
    return () => { mounted = false; window.removeEventListener("storage", syncLocal); window.removeEventListener("focus", syncLocal); };
  }, []);
  const tickets = useMemo(() => sortTicketsByNewest(buildBuyerTickets(orders, paymentRecords)), [orders, paymentRecords]);
  const visibleTickets = useMemo(() => activeFilter === "all" ? tickets : tickets.filter((ticket) => ticket.status === activeFilter), [activeFilter, tickets]);
  const counts = useMemo(() => tickets.reduce((acc, ticket) => { acc[ticket.status] += 1; return acc; }, { paid: 0, pending: 0, rejected: 0, error: 0 } as Record<BuyerTicketStatus, number>), [tickets]);
  const handleDownload = (ticket: BuyerTicketRecord) => downloadTicketPdf(ticketFileName(ticket), `${ticket.title} ticket`, [{ label: "Event", value: ticket.title }, { label: "Organizer", value: ticket.organizerName || "Event organizer" }, { label: "Ticket ID", value: ticket.ticketId }, { label: "Ticket holder", value: ticket.holderName || "—" }, { label: "Email", value: ticket.holderEmail || "—" }, { label: "Phone", value: ticket.holderPhone || "—" }, { label: "Ticket type", value: ticket.ticketType || "General Admission" }, { label: "Date", value: ticket.eventDate || "—" }, { label: "Time", value: ticket.startTime || "—" }, { label: "Venue", value: [ticket.venue, ticket.location].filter(Boolean).join(" • ") || "—" }, { label: "Status", value: ticket.status }, { label: "Amount", value: `${ticket.amount} ${ticket.currency}` }], { ticketCode: ticket.ticketId, qrPayload: ticket.ticketCredential ?? "", brandName: "BuyMesho", brandTagline: "Official event ticket" });
  const handleOpenTicket = (ticket: BuyerTicketRecord) => navigateToPath(`/tickets?ticketId=${encodeURIComponent(ticket.ticketId)}`);
  const handleOpenSupport = () => navigateToPath("/report");
  return <div className="min-h-screen bg-bm-surface-muted dark:bg-bm-surface-muted text-bm-text dark:text-bm-text"><MarketHeaderBar subtitle="Tickets" /><div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-bm-text-subtle dark:text-bm-text-subtle">Tickets</p><h1 className="mt-2 text-3xl font-black tracking-tight text-bm-text dark:text-bm-text sm:text-4xl">Your event tickets</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-bm-text-muted dark:text-bm-text-muted sm:text-base">Each purchased ticket can be downloaded as a PDF.</p></div></div>
    <div className="mt-8 flex flex-wrap items-end justify-between gap-4 border-b border-bm-border dark:border-bm-border pb-4"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-bm-text-subtle dark:text-bm-text-subtle">Browse tickets</p><h2 className="mt-2 text-2xl font-black tracking-tight text-bm-text dark:text-bm-text">Ticket library</h2></div><p className="text-sm text-bm-text-subtle dark:text-bm-text-subtle">Showing <span className="font-bold text-bm-text dark:text-bm-text-muted">{visibleTickets.length}</span> of <span className="font-bold text-bm-text dark:text-bm-text-muted">{tickets.length}</span>{loading ? <span className="ml-2 font-medium text-bm-text-subtle dark:text-bm-text-subtle">Syncing…</span> : null}</p></div>
    {loading ? <div className="mt-4 flex items-center gap-3 rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface px-4 py-3 text-sm font-semibold text-bm-text-muted dark:text-bm-text-muted shadow-sm"><Loader2 className="h-4 w-4 animate-spin text-bm-text-subtle dark:text-bm-text-subtle" />Syncing tickets…</div> : null}
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">{FILTERS.map(({ key, label }) => { const active = activeFilter === key; const count = key === "all" ? tickets.length : counts[key]; return <button key={key} type="button" onClick={() => setActiveFilter((current) => current === key ? "all" : key)} className={`group flex min-h-[5.75rem] flex-col justify-between rounded-2xl border px-3.5 py-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:px-4 ${active ? "border-zinc-950 bg-bm-brand text-bm-on-brand shadow-zinc-950/15" : "border-bm-border dark:border-bm-border bg-bm-surface text-bm-text dark:text-bm-text hover:border-bm-border hover:bg-bm-surface"}`} aria-pressed={active}><div className="flex items-center justify-between gap-3"><p className={`text-[11px] font-black uppercase tracking-[0.2em] ${active ? "text-bm-text-subtle" : "text-bm-text-subtle dark:text-bm-text-subtle"}`}>{label}</p><span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] ${active ? "bg-bm-surface/15 text-bm-on-brand" : "bg-bm-surface-muted dark:bg-bm-surface-muted text-bm-text-subtle dark:text-bm-text-subtle group-hover:bg-zinc-200"}`}>Filter</span></div><div className="mt-3 flex items-end justify-between gap-3"><p className="text-2xl font-black leading-none tracking-tight sm:text-3xl">{count}</p><span className={`h-1.5 w-8 rounded-full ${active ? "bg-bm-surface/60" : "bg-zinc-200 dark:bg-bm-skeleton group-hover:bg-zinc-300"}`} /></div></button>; })}</div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-bm-text-subtle dark:text-bm-text-subtle"><p>Showing <span className="font-bold text-bm-text dark:text-bm-text-muted">{visibleTickets.length}</span> of <span className="font-bold text-bm-text dark:text-bm-text-muted">{tickets.length}</span> tickets{activeFilter === "all" ? "" : ` filtered by ${activeFilter}.`}</p>{activeFilter !== "all" ? <button type="button" onClick={() => setActiveFilter("all")} className="font-bold text-bm-text dark:text-bm-text-muted underline decoration-zinc-300 underline-offset-4 hover:text-bm-text">Show all</button> : null}</div>
    {error ? <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</div> : null}
    <div className="mt-8 grid gap-4 md:grid-cols-2">{visibleTickets.length ? visibleTickets.map((ticket) => <BuyerTicketCard key={ticket.key} ticket={ticket} onDownloadPdf={() => handleDownload(ticket)} onOpenTicket={() => handleOpenTicket(ticket)} onOpenSupport={handleOpenSupport} />) : <div className="rounded-2xl border border-dashed border-bm-border dark:border-bm-border bg-bm-surface px-4 py-6 text-sm text-bm-text-muted dark:text-bm-text-muted md:col-span-2"><div className="flex items-center gap-2 font-bold text-bm-text dark:text-bm-text"><Users className="h-4 w-4 text-bm-text-subtle dark:text-bm-text-subtle" />No tickets yet</div><p className="mt-2 leading-6 text-bm-text-muted dark:text-bm-text-muted">Once a buyer completes an event payment, the ticket should appear here with its PDF action.</p></div>}</div>
  </div></div>;
}
