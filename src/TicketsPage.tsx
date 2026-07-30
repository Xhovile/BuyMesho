import { useEffect, useMemo, useState } from "react";
import { Ticket, Users, Clock3, CheckCircle2, AlertCircle } from "lucide-react";

import MarketHeaderBar from "./components/shared/MarketHeaderBar";
import BuyerTicketCard from "./components/buyer/BuyerTicketCard";
import { navigateToOrderTracking } from "./lib/appNavigation";
import { buildBuyerTickets, type BuyerTicketRecord, type BuyerTicketStatus } from "./lib/buyerTickets";
import { downloadTicketPdf } from "./lib/ticketPdf";
import { readBuyerPayments, type BuyerPaymentRecord } from "./lib/buyerState";
import { fetchMyOrders, type OrderBundle } from "./lib/orderApi";
import { useRequireVerifiedUser } from "./hooks/useRequireVerifiedUser";

const FILTERS: Array<{ key: "all" | BuyerTicketStatus; label: string }> = [
  { key: "all", label: "All" },
  { key: "paid", label: "Paid" },
  { key: "pending", label: "Pending" },
  { key: "rejected", label: "Rejected" },
  { key: "error", label: "Error" },
];

function sortTicketsByNewest(tickets: BuyerTicketRecord[]) {
  return [...tickets].sort((left, right) => {
    const leftTime = left.updatedAt ? Date.parse(left.updatedAt) : 0;
    const rightTime = right.updatedAt ? Date.parse(right.updatedAt) : 0;
    return rightTime - leftTime;
  });
}

function buildWhatsAppMessage(ticket: BuyerTicketRecord) {
  const lines = [
    `Hello, I have bought an event ticket on BuyMesho.`,
    `Event: ${ticket.title}`,
    `Ticket code: ${ticket.ticketCode}`,
    `Reference: ${ticket.reference}`,
    ticket.eventDate ? `Date: ${ticket.eventDate}` : null,
    ticket.startTime ? `Time: ${ticket.startTime}` : null,
    [ticket.venue, ticket.location].filter(Boolean).join(" • ") ? `Venue: ${[ticket.venue, ticket.location].filter(Boolean).join(" • ")}` : null,
  ].filter(Boolean);

  return lines.join("\n");
}

function ticketFileName(ticket: BuyerTicketRecord) {
  const safeTitle = ticket.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "ticket";
  return `${safeTitle}-${ticket.ticketCode}.pdf`;
}

export default function TicketsPage() {
  const ready = useRequireVerifiedUser();
  if (!ready) return null;
  return <TicketsPageContent />;
}

function TicketsPageContent() {
  const [orders, setOrders] = useState<OrderBundle[]>([]);
  const [paymentRecords, setPaymentRecords] = useState<BuyerPaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | BuyerTicketStatus>("all");

  useEffect(() => {
    let mounted = true;

    const syncLocal = () => {
      if (mounted) setPaymentRecords(readBuyerPayments());
    };

    void (async () => {
      syncLocal();
      try {
        const data = await fetchMyOrders();
        if (!mounted) return;
        setOrders(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load buyer tickets.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    window.addEventListener("storage", syncLocal);
    window.addEventListener("focus", syncLocal);

    return () => {
      mounted = false;
      window.removeEventListener("storage", syncLocal);
      window.removeEventListener("focus", syncLocal);
    };
  }, []);

  const tickets = useMemo(() => sortTicketsByNewest(buildBuyerTickets(orders, paymentRecords)), [orders, paymentRecords]);

  const visibleTickets = useMemo(() => {
    if (activeFilter === "all") return tickets;
    return tickets.filter((ticket) => ticket.status === activeFilter);
  }, [activeFilter, tickets]);

  const counts = useMemo(
    () =>
      tickets.reduce(
        (acc, ticket) => {
          acc[ticket.status] += 1;
          return acc;
        },
        { paid: 0, pending: 0, rejected: 0, error: 0 } as Record<BuyerTicketStatus, number>,
      ),
    [tickets],
  );

  const handleDownload = (ticket: BuyerTicketRecord) => {
    downloadTicketPdf(ticketFileName(ticket), `${ticket.title} ticket`, [
      { label: "Event", value: ticket.title },
      { label: "Organizer", value: ticket.organizerName || "Event organizer" },
      { label: "Ticket code", value: ticket.ticketCode },
      { label: "Reference", value: ticket.reference },
      { label: "Holder", value: "Verified buyer account" },
      { label: "Date", value: ticket.eventDate || "—" },
      { label: "Time", value: ticket.startTime || "—" },
      { label: "Venue", value: [ticket.venue, ticket.location].filter(Boolean).join(" • ") || "—" },
      { label: "Status", value: ticket.status },
      { label: "Amount", value: `${ticket.amount} ${ticket.currency}` },
    ]);
  };

  const handleShareWhatsApp = (ticket: BuyerTicketRecord) => {
    const message = buildWhatsAppMessage(ticket);
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <MarketHeaderBar subtitle="Buyer wallet" />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Tickets</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">
              Your event tickets
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600 sm:text-base">
              Keep event passes separate from wallet activity. Each ticket here can be downloaded as a PDF, shared on WhatsApp, and opened from the order trail.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-4 border-b border-zinc-200 pb-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Browse tickets</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-zinc-950">Ticket library</h2>
          </div>
          <p className="text-sm text-zinc-500">
            Showing <span className="font-bold text-zinc-800">{visibleTickets.length}</span> of <span className="font-bold text-zinc-800">{tickets.length}</span>
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {FILTERS.map(({ key, label }) => {
            const active = activeFilter === key;
            const count = key === "all" ? tickets.length : counts[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveFilter((current) => (current === key ? "all" : key))}
                className={`group flex min-h-[5.75rem] flex-col justify-between rounded-2xl border px-3.5 py-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:px-4 ${
                  active
                    ? "border-zinc-950 bg-zinc-950 text-white shadow-zinc-950/15"
                    : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300 hover:bg-white"
                }`}
                aria-pressed={active}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${active ? "text-zinc-300" : "text-zinc-500"}`}>
                    {label}
                  </p>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] ${active ? "bg-white/15 text-white" : "bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200/70"}`}>
                    Filter
                  </span>
                </div>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <p className="text-2xl font-black leading-none tracking-tight sm:text-3xl">{count}</p>
                  <span className={`h-1.5 w-8 rounded-full ${active ? "bg-white/60" : "bg-zinc-200 group-hover:bg-zinc-300"}`} />
                </div>
              </button>
            );
          })}
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {error}
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {loading ? (
            <p className="rounded-2xl border border-zinc-200 bg-white px-4 py-4 text-sm text-zinc-600 md:col-span-2">
              Loading tickets…
            </p>
          ) : visibleTickets.length ? (
            visibleTickets.map((ticket) => (
              <BuyerTicketCard
                key={ticket.key}
                ticket={ticket}
                onOpenOrder={() => navigateToOrderTracking(ticket.reference)}
                onDownloadPdf={() => handleDownload(ticket)}
                onShareWhatsApp={() => handleShareWhatsApp(ticket)}
              />
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-4 py-6 text-sm text-zinc-600 md:col-span-2">
              <div className="flex items-center gap-2 font-bold text-zinc-900">
                <Users className="h-4 w-4 text-zinc-400" />
                No tickets yet
              </div>
              <p className="mt-2 leading-6 text-zinc-600">
                Once a buyer completes an event payment, the ticket should appear here with its PDF and WhatsApp actions.
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.5rem] border border-zinc-200 bg-white px-4 py-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-bold text-zinc-900">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Organizer-ready manifest
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Keep a searchable attendee list on the event manager side using ticket number, buyer name, and payment state.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-zinc-200 bg-white px-4 py-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-bold text-zinc-900">
              <Clock3 className="h-4 w-4 text-zinc-400" />
              Manual check-in
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              At the gate, the owner can mark each ticket as used after checking the PDF and the ticket code.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-zinc-200 bg-white px-4 py-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-bold text-zinc-900">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              No wallet clutter
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Listing purchases stay in Buyer Wallet. Event passes stay here. That separation is the point.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
