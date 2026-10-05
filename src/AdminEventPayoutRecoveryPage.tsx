import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, Check, CheckCircle2, Clock3, Copy, CreditCard, RefreshCw, RotateCcw, Search, ShieldCheck, Wallet, XCircle } from "lucide-react";
import { apiFetch } from "./lib/api";
import AdminWorkspaceLayout from "./modules/admin/AdminWorkspaceLayout";

type Row = Record<string, unknown>;
type Detail = { payout?: Row; attempts?: Row[]; payoutEvents?: Row[]; refundLiabilities?: Row[]; rawData?: Record<string, unknown> };
const text = (value: unknown) => String(value ?? "").trim();
const amount = (value: unknown, currency = "MWK") => `${currency} ${Number.isFinite(Number(value)) ? Number(value).toLocaleString() : "0"}`;
const label = (value: unknown) => text(value).replaceAll("_", " ") || "—";
const today = () => new Date().toISOString().slice(0, 10);

export default function AdminEventPayoutRecoveryPage() {
  const [payouts, setPayouts] = useState<Row[]>([]);
  const [liabilities, setLiabilities] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [eventPayments, setEventPayments] = useState<Row[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<Row | null>(null);
  const [paymentDetail, setPaymentDetail] = useState<{ rawData?: Record<string, unknown> } | null>(null);
  const [selectedPayout, setSelectedPayout] = useState<Row | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [selectedLiability, setSelectedLiability] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [recoverAmount, setRecoverAmount] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [refundMethod, setRefundMethod] = useState("mobile_money");
  const [refundDate, setRefundDate] = useState(today());
  const [destination, setDestination] = useState("");
  const [recoveryNote, setRecoveryNote] = useState("");

  const load = async (query = search) => {
    try {
      setLoading(true); setError(null);
      const normalizedQuery = query.trim();
      const path = normalizedQuery ? `/api/admin/event-payouts?q=${encodeURIComponent(normalizedQuery)}` : "/api/admin/event-payouts";
      const data = await apiFetch(path) as { payouts?: Row[]; refundLiabilities?: Row[]; eventPayments?: Row[] };
      setPayouts(Array.isArray(data.payouts) ? data.payouts : []);
      setLiabilities(Array.isArray(data.refundLiabilities) ? data.refundLiabilities : []);
      setEventPayments(Array.isArray(data.eventPayments) ? data.eventPayments : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load event payout recovery data.");
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(""); }, []);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const next = searchInput.trim();
    setSearch(next);
    void load(next);
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearch("");
    void load("");
  };

  const stats = useMemo(() => ({
    payments: eventPayments.length,
    total: payouts.length,
    processing: payouts.filter((r) => ["processing", "pending"].includes(text(r.status).toLowerCase())).length,
    paid: payouts.filter((r) => text(r.status).toLowerCase() === "paid").length,
    due: liabilities.filter((r) => text(r.status).toLowerCase() === "due").length,
  }), [eventPayments, payouts, liabilities]);

  const openEventPayment = async (row: Row) => {
    setSelectedPayment(row);
    setPaymentDetail(null);
    setError(null);
    try {
      setPaymentDetail(await apiFetch(`/api/admin/event-payouts/transactions/${encodeURIComponent(text(row.id))}`) as { rawData?: Record<string, unknown> });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load event payment details.");
    }
  };

  const openPayout = async (row: Row) => {
    setSelectedPayout(row); setDetail(null); setError(null);
    try {
      setDetail(await apiFetch(`/api/admin/event-payouts/${encodeURIComponent(text(row.id))}`) as Detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payout details.");
    }
  };

  const runAction = async (action: "retry" | "reconcile" | "hold" | "cancel") => {
    if (!selectedPayout) return;
    if ((action === "hold" || action === "cancel") && !note.trim()) {
      setError("A reason is required for this action."); return;
    }
    setBusy(true); setError(null); setNotice(null);
    try {
      const path = `/api/admin/event-payouts/${encodeURIComponent(text(selectedPayout.id))}/${action}`;
      const body = action === "hold" || action === "cancel" ? JSON.stringify({ reason: note.trim() }) : undefined;
      await apiFetch(path, { method: "POST", ...(body ? { headers: { "Content-Type": "application/json" }, body } : {}) });
      setNote(""); setNotice(`Event payout ${action} completed.`); await load();
      const refreshed = payouts.find((row) => text(row.id) === text(selectedPayout.id));
      if (refreshed) await openPayout(refreshed);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} event payout.`);
    } finally { setBusy(false); }
  };

  const openRecovery = (row: Row) => {
    setSelectedLiability(row);
    setRecoverAmount(String(Number(row.amount ?? 0)));
    setTransactionId(""); setRefundMethod("mobile_money"); setRefundDate(today()); setDestination(""); setRecoveryNote(""); setError(null);
  };

  const recover = async () => {
    if (!selectedLiability) return;
    const n = Number(recoverAmount);
    if (!transactionId.trim() || !refundDate || !recoveryNote.trim() || !Number.isFinite(n) || n <= 0) {
      setError("Enter the exact recovery amount, transaction ID, refund date, and recovery note."); return;
    }
    setBusy(true); setError(null); setNotice(null);
    try {
      await apiFetch(`/api/admin/event-payouts/refund-liabilities/${encodeURIComponent(text(selectedLiability.id))}/recover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: n, transactionId: transactionId.trim(), refundMethod, refundDate,
          destination: destination.trim() || undefined, note: recoveryNote.trim(),
        }),
      });
      setSelectedLiability(null); setNotice("Event refund liability recovered and recorded."); await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to recover the event refund liability.");
    } finally { setBusy(false); }
  };

  const dueLiabilities = liabilities.filter((r) => text(r.status).toLowerCase() === "due");

  return (
    <AdminWorkspaceLayout
      title="Event Financial Recovery"
      description="Review event payments, reconcile payouts, and record approved event refund recoveries."
      onRefresh={() => void load()}
    >
      <form onSubmit={submitSearch} className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search buyer email, buyer UUID, creator email/UUID, order ID, ticket ID…" className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-zinc-400 focus:bg-white" aria-label="Search event financial records" />
          </div>
          <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white"><Search className="h-4 w-4" />Search</button>
          {search ? <button type="button" onClick={clearSearch} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-50">Clear</button> : null}
        </div>
        <p className="mt-2 text-xs text-zinc-500">Searches across event title/ID, buyer and creator identity, order ID, and ticket ID/code.</p>
      </form>
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div> : null}
      {notice ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{notice}</div> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat icon={<CreditCard className="h-4 w-4" />} title="Event payments" value={stats.payments} />
        <Stat icon={<Wallet className="h-4 w-4" />} title="Event payouts" value={stats.total} />
        <Stat icon={<Clock3 className="h-4 w-4" />} title="Provider processing" value={stats.processing} />
        <Stat icon={<CheckCircle2 className="h-4 w-4" />} title="Paid" value={stats.paid} />
        <Stat icon={<AlertTriangle className="h-4 w-4" />} title="Refund liabilities due" value={stats.due} />
      </section>

      {loading ? <div className="rounded-3xl border border-zinc-200 bg-white p-8 text-sm text-zinc-500">Loading event payout recovery data…</div> : (
        <>
          <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-200 p-5"><h2 className="text-lg font-black">Event payment activity</h2><p className="mt-1 text-sm text-zinc-500">Event-ticket payments, buyer identity, and payment state. Open a payment for full diagnostics.</p></div>
            <div className="divide-y divide-zinc-100">
              {eventPayments.length === 0 ? <p className="p-6 text-sm text-zinc-500">No event payments found.</p> : eventPayments.map((row) => {
                const status = text(row.payment_status).toLowerCase();
                const buyerEmails = Array.isArray(row.buyer_emails) ? row.buyer_emails.map(text).filter(Boolean).join(", ") : text(row.buyer_emails);
                const ticketIds = Array.isArray(row.ticket_ids) ? row.ticket_ids.map(text).filter(Boolean).join(", ") : text(row.ticket_ids);
                return <button key={text(row.id)} type="button" onClick={() => void openEventPayment(row)} className="block w-full p-5 text-left hover:bg-zinc-50">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black">{text(row.event_title) || "Event"}</p>
                      <p className="mt-1 text-xs font-semibold text-zinc-500">Payment {text(row.id)} · Order {text(row.order_id)}</p>
                      <p className="mt-1 text-xs text-zinc-500">Buyer {buyerEmails || text(row.buyer_id) || "—"} · Ticket {ticketIds || "—"}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Badge tone={["paid","captured","successful","completed"].includes(status) ? "green" : ["failed","cancelled"].includes(status) ? "red" : "amber"}>{label(row.payment_status)}</Badge>
                      <span className="text-sm font-black">{amount(row.amount, text(row.currency) || "MWK")}</span>
                    </div>
                  </div>
                </button>;
              })}
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-200 p-5"><h2 className="text-lg font-black">Event payout queue</h2><p className="mt-1 text-sm text-zinc-500">Review provider state and refund-related payout blockers.</p></div>
            <div className="divide-y divide-zinc-100">
              {payouts.length === 0 ? <p className="p-6 text-sm text-zinc-500">No event payouts found.</p> : payouts.map((row) => {
                const status = text(row.status).toLowerCase();
                const liabilityStatus = text(row.liability_status).toLowerCase();
                return <button key={text(row.id)} type="button" onClick={() => void openPayout(row)} className="block w-full p-5 text-left hover:bg-zinc-50">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div><p className="text-sm font-black">{text(row.event_title) || "Event"}</p><p className="mt-1 text-xs font-semibold text-zinc-500">Payout {text(row.id)} · Order {text(row.order_id)}</p><p className="mt-2 text-sm font-bold">{amount(row.net_amount ?? row.amount, text(row.currency) || "MWK")}</p></div>
                    <div className="flex flex-wrap gap-2"><Badge tone={status === "paid" ? "green" : status === "failed" || status === "cancelled" ? "red" : "amber"}>{label(status)}</Badge>{liabilityStatus ? <Badge tone={liabilityStatus === "due" ? "amber" : "green"}>Refund {label(liabilityStatus)}</Badge> : null}</div>
                  </div>
                </button>;
              })}
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-200 p-5"><h2 className="text-lg font-black">Outstanding refund liabilities</h2><p className="mt-1 text-sm text-zinc-500">Approved event refunds waiting for an actual recovery record.</p></div>
            <div className="divide-y divide-zinc-100">
              {dueLiabilities.length === 0 ? <p className="p-6 text-sm text-zinc-500">No outstanding event refund liabilities.</p> : dueLiabilities.map((row) =>
                <div key={text(row.id)} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                  <div><p className="text-sm font-black">{amount(row.amount, text(row.currency) || "MWK")}</p><p className="mt-1 text-xs font-semibold text-zinc-500">Order {text(row.order_id)} · Ticket {text(row.ticket_id) || "entire order"}</p><p className="mt-1 text-xs text-zinc-400">Due {text(row.due_at) || "—"} · {text(row.id)}</p></div>
                  <button type="button" onClick={() => openRecovery(row)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white"><ShieldCheck className="h-4 w-4" />Record recovery</button>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {detail ? <div className="fixed inset-0 z-[90] flex items-center justify-center bg-zinc-950/55 p-3 backdrop-blur-sm">
        <div className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-zinc-50 shadow-2xl">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white/95 px-5 py-4">
            <div><p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Event payout</p><h2 className="mt-1 text-lg font-black">{text(detail.payout?.event_title) || text(detail.payout?.id)}</h2></div>
            <button type="button" onClick={() => { setDetail(null); setSelectedPayout(null); }} className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100" aria-label="Close"><XCircle className="h-5 w-5" /></button>
          </div>
          <div className="space-y-5 p-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric title="Status" value={label(detail.payout?.status)} />
              <Metric title="Net amount" value={amount(detail.payout?.net_amount ?? detail.payout?.amount, text(detail.payout?.currency) || "MWK")} />
              <Metric title="Order" value={text(detail.payout?.order_id)} />
              <Metric title="Creator" value={text(detail.payout?.event_creator_uid_actual ?? detail.payout?.event_creator_uid)} />
            </div>
            <div className="flex flex-wrap gap-2">
              {![ "paid", "cancelled" ].includes(text(detail.payout?.status).toLowerCase()) ? <>
                <button type="button" disabled={busy} onClick={() => void runAction("reconcile")} className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold disabled:opacity-50"><RefreshCw className="h-4 w-4" />Reconcile</button>
                <button type="button" disabled={busy || ["processing","pending"].includes(text(detail.payout?.status).toLowerCase())} onClick={() => void runAction("retry")} className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><RotateCcw className="h-4 w-4" />Retry</button>
                <button type="button" disabled={busy || !note.trim()} onClick={() => void runAction("hold")} className="inline-flex items-center gap-2 rounded-2xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><AlertTriangle className="h-4 w-4" />Hold</button>
                <button type="button" disabled={busy || ["processing","pending"].includes(text(detail.payout?.status).toLowerCase()) || !note.trim()} onClick={() => void runAction("cancel")} className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-700 disabled:opacity-50"><XCircle className="h-4 w-4" />Cancel</button>
              </> : null}
            </div>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Reason for hold/cancel…" className="w-full rounded-2xl border border-zinc-200 bg-white p-3 text-sm outline-none" />
            <List title="Payout attempts" items={Array.isArray(detail.attempts) ? detail.attempts as Row[] : []} fields={["attempt_no","status","provider_transaction_id"]} />
            <RawJsonViewer data={detail.rawData ?? { payout: detail.payout, payoutAttempts: detail.attempts, payoutEvents: detail.payoutEvents, refundLiabilities: detail.refundLiabilities }} />
            {Array.isArray(detail.refundLiabilities) && detail.refundLiabilities.length ? <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4"><h3 className="font-black text-amber-950">Refund liabilities</h3><div className="mt-3 space-y-2">{(detail.refundLiabilities as Row[]).map((row) => <div key={text(row.id)} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3"><div><p className="text-sm font-black">{amount(row.amount, text(row.currency) || "MWK")}</p><p className="text-xs text-zinc-500">{label(row.status)} · {text(row.id)}</p></div>{text(row.status).toLowerCase() === "due" ? <button type="button" onClick={() => openRecovery(row)} className="rounded-xl bg-zinc-900 px-3 py-2 text-xs font-bold text-white">Record recovery</button> : <Badge tone="green">Recovered</Badge>}</div>)}</div></div> : null}
          </div>
        </div>
      </div> : null}

      {selectedPayment && paymentDetail ? <div className="fixed inset-0 z-[95] flex items-center justify-center bg-zinc-950/55 p-3 backdrop-blur-sm">
        <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-zinc-50 shadow-2xl">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white/95 px-5 py-4">
            <div><p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Event payment</p><h2 className="mt-1 text-lg font-black">{text(selectedPayment.event_title) || text(selectedPayment.id)}</h2></div>
            <button type="button" onClick={() => { setSelectedPayment(null); setPaymentDetail(null); }} className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100" aria-label="Close"><XCircle className="h-5 w-5" /></button>
          </div>
          <div className="space-y-4 p-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric title="Payment status" value={label(selectedPayment.payment_status)} />
              <Metric title="Amount" value={amount(selectedPayment.amount, text(selectedPayment.currency) || "MWK")} />
              <Metric title="Order" value={text(selectedPayment.order_id)} />
              <Metric title="Buyer UUID" value={text(selectedPayment.buyer_id)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Metric title="Buyer email" value={Array.isArray(selectedPayment.buyer_emails) ? selectedPayment.buyer_emails.map(text).filter(Boolean).join(", ") : text(selectedPayment.buyer_emails)} />
              <Metric title="Ticket ID" value={Array.isArray(selectedPayment.ticket_ids) ? selectedPayment.ticket_ids.map(text).filter(Boolean).join(", ") : text(selectedPayment.ticket_ids)} />
              <Metric title="Event creator" value={text(selectedPayment.event_creator_uid)} />
              <Metric title="Payment reference" value={text(selectedPayment.reference)} />
            </div>
            <RawJsonViewer data={paymentDetail.rawData ?? { payment: selectedPayment }} />
          </div>
        </div>
      </div> : null}

      {selectedLiability ? <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/55 p-3 backdrop-blur-sm">
        <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl">
          <div className="flex items-start justify-between border-b border-zinc-200 p-5"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Refund recovery</p><h2 className="mt-1 text-lg font-black">{amount(selectedLiability.amount, text(selectedLiability.currency) || "MWK")}</h2><p className="mt-1 text-xs text-zinc-500">Liability {text(selectedLiability.id)} · Order {text(selectedLiability.order_id)}</p></div><button type="button" onClick={() => setSelectedLiability(null)} className="rounded-full p-2 text-zinc-500" aria-label="Close"><XCircle className="h-5 w-5" /></button></div>
          <div className="space-y-4 p-5">
            <label className="block text-sm font-bold">Recovery amount<input value={recoverAmount} onChange={(e) => setRecoverAmount(e.target.value)} type="number" step="0.01" min="0" className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm" /></label>
            <label className="block text-sm font-bold">Transaction ID<input value={transactionId} onChange={(e) => setTransactionId(e.target.value)} className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm" /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-bold">Refund method<select value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)} className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm"><option value="mobile_money">Mobile Money</option><option value="bank_transfer">Bank transfer</option><option value="cash">Cash</option><option value="other">Other</option></select></label>
              <label className="block text-sm font-bold">Refund date<input value={refundDate} onChange={(e) => setRefundDate(e.target.value)} type="date" className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm" /></label>
            </div>
            <label className="block text-sm font-bold">Destination (optional)<input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Mobile number or transfer reference" className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm" /></label>
            <label className="block text-sm font-bold">Recovery note<textarea value={recoveryNote} onChange={(e) => setRecoveryNote(e.target.value)} rows={4} placeholder="Describe how the buyer was refunded." className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm" /></label>
            <button type="button" disabled={busy} onClick={() => void recover()} className="w-full rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? "Recording…" : "Record refund recovery"}</button>
          </div>
        </div>
      </div> : null}
    </AdminWorkspaceLayout>
  );
}

function Stat({ icon, title, value }: { icon: ReactNode; title: string; value: number }) {
  return <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-zinc-400">{icon}{title}</div><p className="mt-2 text-2xl font-black">{value}</p></div>;
}
function Metric({ title, value }: { title: string; value: string }) {
  return <div className="rounded-2xl bg-white p-3"><p className="text-xs font-black uppercase tracking-wider text-zinc-400">{title}</p><p className="mt-2 break-all text-sm font-bold">{value || "—"}</p></div>;
}
function Badge({ tone, children }: { tone: "green" | "amber" | "red"; children: React.ReactNode }) {
  const classes = tone === "green" ? "bg-emerald-100 text-emerald-800" : tone === "red" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-900";
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${classes}`}>{children}</span>;
}
function List({ title, items, fields }: { title: string; items: Row[]; fields: string[] }) {
  return <div className="rounded-3xl border border-zinc-200 bg-white p-4"><h3 className="font-black">{title}</h3><div className="mt-3 max-h-60 space-y-2 overflow-auto">{items.length ? items.map((item, index) => <div key={text(item.id) || index} className="rounded-2xl bg-zinc-50 p-3 text-xs">{fields.map((field) => <p key={field}><span className="font-bold">{label(field)}:</span> {label(item[field])}</p>)}</div>) : <p className="text-sm text-zinc-500">No records.</p>}</div></div>;
}

function RawJsonViewer({ data }: { data: unknown }) {
  const [open, setOpen] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const raw = (() => {
    try { return JSON.stringify(data, null, 2) ?? "null"; } catch { return "Unable to serialize raw event data."; }
  })();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(raw);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1500);
    } catch {
      setCopyState("failed");
      window.setTimeout(() => setCopyState("idle"), 1500);
    }
  };
  return <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white">
    <div className="flex items-center justify-between gap-3 p-4">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="text-sm font-black">{open ? "Hide raw JSON" : "View raw JSON"}</button>
      <button type="button" onClick={() => void copy()} className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-100">
        {copyState === "copied" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy"}
      </button>
    </div>
    {open ? <pre className="max-h-[32rem] overflow-auto border-t border-zinc-200 bg-zinc-950 p-4 text-[11px] leading-5 text-zinc-100 [scrollbar-width:thin]">{raw}</pre> : null}
  </div>;
}
