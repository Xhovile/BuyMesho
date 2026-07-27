import { CalendarDays, ChevronRight, Clock3, MapPin, Ticket } from "lucide-react";

import { formatMoney } from "../../shared/utils/formatMoney";
import type { BuyerTicketRecord } from "../../lib/buyerTickets";

function statusClasses(status: BuyerTicketRecord["status"]) {
  if (status === "paid") return "bg-emerald-100 text-emerald-800";
  if (status === "rejected") return "bg-amber-100 text-amber-800";
  if (status === "error") return "bg-rose-100 text-rose-800";
  return "bg-zinc-100 text-zinc-700";
}

function displayValue(value: string) {
  return value && value.trim() ? value : "—";
}

type BuyerTicketCardProps = {
  ticket: BuyerTicketRecord;
  onOpenOrder: () => void;
};

export default function BuyerTicketCard({ ticket, onOpenOrder }: BuyerTicketCardProps) {
  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full bg-zinc-950 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white">
            <Ticket className="h-3.5 w-3.5" />
            Event ticket
          </div>
          <h3 className="mt-3 line-clamp-2 text-lg font-black tracking-tight text-zinc-950">{ticket.title}</h3>
          <p className="mt-1 text-sm text-zinc-500">{displayValue(ticket.organizerName)}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${statusClasses(ticket.status)}`}>
          {ticket.status}
        </span>
      </div>

      <div className="grid gap-3 px-5 py-4 text-sm text-zinc-700">
        <div className="flex items-start gap-3">
          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Date</p>
            <p className="mt-0.5 font-medium text-zinc-900">{displayValue(ticket.eventDate)}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Time</p>
            <p className="mt-0.5 font-medium text-zinc-900">{displayValue(ticket.startTime)}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Location</p>
            <p className="mt-0.5 font-medium text-zinc-900">{displayValue([ticket.venue, ticket.location].filter(Boolean).join(" • "))}</p>
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-100 px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Ticket code</p>
            <p className="mt-1 break-all font-mono text-sm font-semibold text-zinc-900">{ticket.ticketCode}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Amount</p>
            <p className="mt-1 text-sm font-black text-zinc-950">{formatMoney({ amount: ticket.amount, currency: ticket.currency } as any)}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onOpenOrder}
            className="inline-flex items-center gap-2 rounded-2xl bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800"
          >
            Open ticket
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
