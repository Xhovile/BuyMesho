import { useState } from "react";
import { ExternalLink, Loader2, Search, Ticket } from "lucide-react";
import { apiFetch } from "../lib/api";
import { navigateToPath } from "../lib/appNavigation";
import { TICKET_VALIDATOR_URL } from "../lib/appNavigation.paths";

type EventTicketSearchPanelProps = {
  mode: "creator" | "admin";
};

type TicketSearchResult = {
  ticketId: string;
  identity?: {
    ticketId?: string;
    eventId?: string | null;
    orderId?: string | null;
    eventTitle?: string | null;
    status?: string | null;
  };
  transaction?: {
    event?: { id?: string | null; title?: string | null } | null;
    order?: { id?: string | null; status?: string | null } | null;
    payment?: { reference?: string | null; status?: string | null; amount?: number | null; currency?: string | null } | null;
    dispute?: { id?: string | null; status?: string | null } | null;
  } | null;
};

export default function EventTicketSearchPanel({ mode }: EventTicketSearchPanelProps) {
  const [ticketId, setTicketId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TicketSearchResult | null>(null);

  const handleSearch = async () => {
    const value = ticketId.trim();
    if (!value || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const path = mode === "admin"
        ? `/api/admin/ticket-search?q=${encodeURIComponent(value)}`
        : `/api/event-tickets/${encodeURIComponent(value)}/transaction`;
      const data = (await apiFetch(path)) as TicketSearchResult;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ticket ID could not be found.");
    } finally {
      setLoading(false);
    }
  };

  const identity = result?.identity;
  const transaction = result?.transaction;
  const eventId = String(identity?.eventId ?? transaction?.event?.id ?? "").trim();
  const eventTitle = String(identity?.eventTitle ?? transaction?.event?.title ?? "Event ticket").trim();
  const orderId = String(identity?.orderId ?? transaction?.order?.id ?? "").trim();
  const payment = transaction?.payment ?? null;
  const dispute = transaction?.dispute ?? null;

  const openEvent = () => {
    if (!eventId) return;
    const path = mode === "admin"
      ? `/admin/events?event=${encodeURIComponent(eventId)}`
      : `/explore/events/manage?event=${encodeURIComponent(eventId)}`;
    navigateToPath(path);
  };

  return (
    <section className="rounded-[1.5rem] border border-bm-border bg-bm-surface p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-bm-brand text-bm-on-brand">
          <Ticket className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-bm-text-subtle">Event ticket search</p>
          <h2 className="mt-1 text-lg font-black tracking-tight text-bm-text">Find an event transaction by Ticket ID</h2>
          <p className="mt-1 text-sm text-bm-text-muted">Use the canonical Ticket ID to jump from the event to its order, payment, and dispute trail.</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <label className="flex min-h-12 flex-1 items-center gap-2 rounded-2xl border border-bm-border bg-bm-surface-subtle px-4 text-sm text-bm-text-subtle">
          <Search className="h-4 w-4 shrink-0" />
          <input
            value={ticketId}
            onChange={(event) => setTicketId(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void handleSearch();
            }}
            placeholder="Enter Ticket ID"
            className="w-full bg-transparent text-sm font-semibold text-bm-text outline-none"
          />
        </label>
        <button
          type="button"
          onClick={() => void handleSearch()}
          disabled={!ticketId.trim() || loading}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-bm-brand px-5 text-sm font-black text-bm-on-brand hover:bg-bm-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {loading ? "Searching…" : "Search Ticket"}
        </button>
      </div>

      {error ? <div className="mt-3 rounded-2xl border border-bm-danger/25 bg-bm-danger-bg px-4 py-3 text-sm text-bm-danger">{error}</div> : null}

      {result ? (
        <div className="mt-4 rounded-2xl border border-bm-success/25 bg-bm-success-bg p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-bm-success">Ticket found</p>
              <p className="mt-1 break-all font-mono text-sm font-black text-bm-success">{result.ticketId}</p>
              <p className="mt-2 text-sm font-bold text-bm-text">{eventTitle}</p>
            </div>
            <button type="button" onClick={openEvent} disabled={!eventId} className="rounded-2xl border border-bm-border bg-bm-surface px-4 py-2.5 text-sm font-black text-bm-text hover:bg-bm-surface-subtle disabled:opacity-50">
              Open event
            </button>
            {mode === "creator" ? (
              <a
                href={TICKET_VALIDATOR_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl border border-bm-brand bg-bm-brand px-4 py-2.5 text-sm font-black text-bm-on-brand shadow-sm transition hover:bg-bm-brand-hover"
              >
                <ExternalLink className="h-4 w-4" />
                Open Ticket Validator
              </a>
            ) : null}
          </div>
          <div className="mt-3 grid gap-2 text-xs text-bm-text-muted sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-bm-border bg-bm-surface px-3 py-2"><span className="text-bm-text-subtle">Order</span><p className="mt-1 break-all font-semibold">{orderId || "—"}</p></div>
            <div className="rounded-xl border border-bm-border bg-bm-surface px-3 py-2"><span className="text-bm-text-subtle">Payment</span><p className="mt-1 font-semibold">{payment?.status ?? "—"}</p><p className="break-all text-[11px] text-bm-text-subtle">{payment?.reference ?? "—"}</p></div>
            <div className="rounded-xl border border-bm-border bg-bm-surface px-3 py-2"><span className="text-bm-text-subtle">Amount</span><p className="mt-1 font-semibold">{payment?.currency ?? "MWK"} {payment?.amount == null ? "—" : Number(payment.amount).toLocaleString()}</p></div>
            <div className="rounded-xl border border-bm-border bg-bm-surface px-3 py-2"><span className="text-bm-text-subtle">Dispute</span><p className="mt-1 font-semibold">{dispute?.status ?? "None"}</p><p className="break-all text-[11px] text-bm-text-subtle">{dispute?.id ?? "—"}</p></div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
