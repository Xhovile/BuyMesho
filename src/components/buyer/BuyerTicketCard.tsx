import { CalendarDays, Clock3, Download, Mail, MapPin, Phone, ShieldAlert, Ticket } from "lucide-react";
import { formatMoney } from "../../shared/utils/formatMoney";
import type { BuyerTicketRecord } from "../../lib/buyerTickets";

function statusClasses(status: BuyerTicketRecord["status"]) {
  if (status === "paid") return "bg-bm-success-bg text-bm-success";
  if (status === "rejected") return "bg-bm-warning-bg text-bm-warning";
  if (status === "error") return "bg-bm-danger-bg text-bm-danger";
  return "bg-bm-surface-muted text-bm-text-muted";
}
function displayValue(value: string) { return value && value.trim() ? value : "—"; }
function formatDateTime(value: string | null | undefined) { if (!value) return ""; const date = new Date(value); if (Number.isNaN(date.getTime())) return value; return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date); }
function settlementNote(status: BuyerTicketRecord["status"]) { if (status === "paid") return "Ticket confirmed · ready for event"; if (status === "pending") return "Awaiting ticket confirmation"; if (status === "rejected") return "Ticket not issued"; if (status === "error") return "Ticket issue detected"; return ""; }

type BuyerTicketCardProps = { ticket: BuyerTicketRecord; onDownloadPdf: () => void; onOpenTicket?: () => void; onOpenSupport?: () => void };

export default function BuyerTicketCard({ ticket, onDownloadPdf, onOpenTicket, onOpenSupport }: BuyerTicketCardProps) {
  const note = settlementNote(ticket.status);
  const purchasedAt = formatDateTime(ticket.updatedAt);
  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-bm-border bg-bm-surface shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4 border-b border-bm-border-subtle px-5 py-4">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full bg-bm-brand px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-bm-on-brand"><Ticket className="h-3.5 w-3.5" />Event ticket</div>
          <h3 className="mt-3 line-clamp-2 text-lg font-black tracking-tight text-bm-text">{ticket.title}</h3>
          <p className="mt-1 text-sm text-bm-text-subtle">{displayValue(ticket.organizerName)}</p>
          {purchasedAt ? <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-bm-surface-muted px-3 py-1 text-[11px] font-semibold text-bm-text-muted"><Clock3 className="h-3.5 w-3.5 text-bm-text-subtle" />Purchased {purchasedAt}</div> : null}
          {note ? <p className="mt-2 text-xs font-semibold text-bm-text-subtle">{note}</p> : null}
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${statusClasses(ticket.status)}`}>{ticket.status}</span>
      </div>

      <div className="grid gap-3 px-5 py-4 text-sm text-bm-text-muted">
        <div className="flex items-start gap-3"><Ticket className="mt-0.5 h-4 w-4 shrink-0 text-bm-text-subtle" /><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-bm-text-subtle">Ticket ID</p><p className="mt-0.5 font-mono text-sm font-bold text-bm-text">{displayValue(ticket.ticketId)}</p></div></div>
        <div className="flex items-start gap-3"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-bm-text-subtle" /><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-bm-text-subtle">Date</p><p className="mt-0.5 font-medium text-bm-text">{displayValue(ticket.eventDate)}</p></div></div>
        <div className="flex items-start gap-3"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-bm-text-subtle" /><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-bm-text-subtle">Time</p><p className="mt-0.5 font-medium text-bm-text">{displayValue(ticket.startTime)}</p></div></div>
        <div className="flex items-start gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-bm-text-subtle" /><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-bm-text-subtle">Location</p><p className="mt-0.5 font-medium text-bm-text">{displayValue([ticket.venue, ticket.location].filter(Boolean).join(" • "))}</p></div></div>
      </div>

      <div className="border-t border-bm-border-subtle px-5 py-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl bg-bm-surface-muted px-3 py-2.5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-bm-text-subtle">Ticket holder</p><p className="mt-1 text-sm font-bold text-bm-text">{displayValue(ticket.holderName)}</p></div>
          <div className="rounded-xl bg-bm-surface-muted px-3 py-2.5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-bm-text-subtle">Ticket type</p><p className="mt-1 text-sm font-bold text-bm-text">{displayValue(ticket.ticketType)}</p></div>
          <div className="flex items-center gap-2 text-xs text-bm-text-muted"><Mail className="h-3.5 w-3.5 text-bm-text-subtle" />{displayValue(ticket.holderEmail)}</div>
          <div className="flex items-center gap-2 text-xs text-bm-text-muted"><Phone className="h-3.5 w-3.5 text-bm-text-subtle" />{displayValue(ticket.holderPhone)}</div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-4 border-t border-bm-border-subtle pt-3">
          <div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-bm-text-subtle">Amount</p><p className="mt-1 text-sm font-black text-bm-text">{formatMoney(ticket.amount, ticket.currency)}</p></div>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={onDownloadPdf} disabled={!ticket.ticketCredential} title={ticket.ticketCredential ? "Download your verified event ticket PDF" : "Ticket credential is not available yet"} className="inline-flex items-center gap-2 rounded-2xl border border-bm-brand bg-bm-brand px-4 py-2.5 text-sm font-bold text-bm-on-brand hover:bg-bm-brand-hover disabled:cursor-not-allowed disabled:border-bm-border disabled:bg-bm-surface-raised disabled:text-bm-text-subtle disabled:hover:bg-bm-surface-raised"><Download className="h-4 w-4" />Download PDF</button>
            {onOpenTicket ? <button type="button" onClick={onOpenTicket} className="inline-flex items-center gap-2 rounded-2xl border border-bm-brand bg-bm-brand px-4 py-2.5 text-sm font-bold text-bm-on-brand hover:bg-bm-brand-hover"><Ticket className="h-4 w-4" />View Details</button> : null}
            {onOpenSupport ? <button type="button" onClick={onOpenSupport} className="inline-flex items-center gap-2 rounded-2xl border border-bm-border bg-bm-surface-muted px-4 py-2.5 text-sm font-bold text-bm-text-muted hover:bg-bm-surface-raised"><ShieldAlert className="h-4 w-4" />Contact Support</button> : null}
          </div>
        </div>
      </div>
    </article>
  );
}
