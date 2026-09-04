import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, FileText, ShieldAlert } from "lucide-react";
import MarketHeaderBar from "./components/shared/MarketHeaderBar";
import { apiFetch } from "./lib/api";
import { fetchOrderById } from "./lib/orderApi";
import type { OrderBundle } from "./lib/orderApi";
import { resolveOrderIdentifier } from "./lib/orderIdentifier";
import FormDropdown from "./components/FormDropdown";
import { useRequireVerifiedUser } from "./hooks/useRequireVerifiedUser";

type DisputeListItem = Record<string, unknown>;

const REQUEST_TYPES = [
  { value: "buyer_cancellation", label: "Cancel my order" },
  { value: "seller_failed_to_fulfill", label: "Seller did not fulfill the order" },
  { value: "product_item_problem", label: "Problem with the product or item" },
  { value: "delivery_failure", label: "Delivery problem" },
  { value: "payment_platform_error", label: "Payment or platform problem" },
  { value: "exceptional_dispute", label: "Something else" },
] as const;

const RESOLUTIONS = [
  { value: "refund", label: "I want a refund" },
  { value: "return", label: "I want to return the item" },
  { value: "return_and_refund", label: "I want to return the item and get a refund" },
  { value: "review", label: "I want BuyMesho to review the issue" },
] as const;

const PAYMENT_METHODS = [
  { value: "mobile_money", label: "Mobile Money" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
] as const;

export default function DisputesPage() {
  const ready = useRequireVerifiedUser();
  if (!ready) return null;
  return <DisputesPageContent />;
}

function DisputesPageContent() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialReference = params.get("reference")?.trim() ?? "";
  const initialTicketId = params.get("ticketId")?.trim() ?? "";
  const [reference, setReference] = useState(initialReference);
  const [ticketId, setTicketId] = useState<string | null>(initialTicketId || null);
  const [bundle, setBundle] = useState<OrderBundle | null>(null);
  const [cases, setCases] = useState<DisputeListItem[]>([]);
  const [requestType, setRequestType] = useState("");
  const [resolution, setResolution] = useState("review");
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [refundDestination, setRefundDestination] = useState("");
  const [evidence, setEvidence] = useState("");
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [loadingCases, setLoadingCases] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCases = async () => {
    try {
      setLoadingCases(true);
      const data = await apiFetch("/api/disputes/me");
      setCases(Array.isArray(data) ? (data as DisputeListItem[]) : []);
    } catch {
      setCases([]);
    } finally {
      setLoadingCases(false);
    }
  };

  const loadOrder = async (value: string, requestedTicketId?: string | null) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setLoadingOrder(true);
    setError(null);
    setSubmitted(false);
    try {
      const resolved = await resolveOrderIdentifier(trimmed);
      const data = await fetchOrderById(resolved);
      if (requestedTicketId) {
        const identity = (await apiFetch(`/api/event-tickets/${encodeURIComponent(requestedTicketId)}/identity`)) as { ticketId?: string; orderId?: string | null };
        if (!identity?.ticketId || identity.orderId !== data.order.id) throw new Error("The Ticket ID does not belong to this order.");
        setTicketId(identity.ticketId);
      } else {
        setTicketId(null);
      }
      setBundle(data);
    } catch (err) {
      setBundle(null);
      setTicketId(null);
      setError(err instanceof Error ? err.message : "Failed to load the order.");
    } finally {
      setLoadingOrder(false);
    }
  };

  useEffect(() => {
    void loadCases();
    if (initialReference) void loadOrder(initialReference, initialTicketId || null);
  }, []);

  const order = bundle?.order ?? null;
  const totalAmount = Number(order?.total?.amount ?? 0);
  const currency = String(order?.total?.currency ?? "MWK");
  const itemTitle = order?.items?.[0]?.title ?? "Order item";
  const paidOut = ["released", "paid", "settled"].includes(String(bundle?.payout?.status ?? "").trim().toLowerCase()) || String(bundle?.escrow?.state ?? "").trim().toLowerCase() === "released";

  const submitDispute = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!order || submitting || !reason.trim() || !requestType) return;
    const numericAmount = amount.trim() ? Number(amount) : 0;
    if (!Number.isFinite(numericAmount) || numericAmount < 0 || numericAmount > totalAmount) {
      setError(`Requested amount must be between 0 and ${currency} ${totalAmount.toLocaleString()}.`);
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      await apiFetch("/api/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, ticketId, requestType, requestedResolution: resolution, reason: reason.trim(), amountRequested: numericAmount, paymentMethod: paymentMethod || undefined, refundDestination: refundDestination.trim() || undefined, evidence: evidence.split("\n").map((line) => line.trim()).filter(Boolean) }),
      });
      setSubmitted(true);
      await loadCases();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit dispute.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <MarketHeaderBar subtitle="Disputes" />
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
        <header className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-900 text-white"><ShieldAlert className="h-5 w-5" /></div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-zinc-500 sm:text-sm">Disputes</p>
            <h1 className="mt-1 text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">Report a problem</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-600 sm:text-base">One place to request a return, request a refund, or ask BuyMesho to review any issue with an order or event ticket.</p>
          </div>
        </header>

        <section className="mt-8 rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-zinc-500" /><h2 className="text-lg font-black">Start a dispute</h2></div>
          {!order ? (
            <form className="mt-5 flex flex-col gap-3 sm:flex-row" onSubmit={(event) => { event.preventDefault(); void loadOrder(reference, ticketId); }}>
              <input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Order reference, order ID, or Ticket ID" className="min-w-0 flex-1 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900" />
              <button disabled={loadingOrder || !reference.trim()} className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{loadingOrder ? "Loading…" : "Continue"}</button>
            </form>
          ) : (
            <>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"><span className="text-xs font-bold uppercase tracking-wide text-zinc-500">Order</span><p className="mt-1 break-all font-semibold">{order.id}</p></div>
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"><span className="text-xs font-bold uppercase tracking-wide text-zinc-500">Item</span><p className="mt-1 font-semibold">{itemTitle}</p></div>
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"><span className="text-xs font-bold uppercase tracking-wide text-zinc-500">Status</span><p className="mt-1 font-semibold">{order.status}</p></div>
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"><span className="text-xs font-bold uppercase tracking-wide text-zinc-500">Total</span><p className="mt-1 font-semibold">{currency} {totalAmount.toLocaleString()}</p></div>
              </div>
              {paidOut ? <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><div className="flex items-center gap-2 font-black"><AlertTriangle className="h-4 w-4" /> Payment has already been released</div><p className="mt-2 leading-6">You can still report the issue. A post-payout request does not guarantee a refund; the seller may need to resolve it with you and BuyMesho may intervene where appropriate.</p></div> : null}
              {submitted ? <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-950"><p className="font-black">Dispute received.</p><p className="mt-1 leading-6">Your request has been recorded and can now be tracked from this page.</p></div> : (
                <form onSubmit={submitDispute} className="mt-5 space-y-4">
                  <FormDropdown label="What happened?" value={requestType} onChange={setRequestType} placeholder="Select the issue" options={REQUEST_TYPES} searchable={false} disabled={submitting} />
                  <FormDropdown label="What do you need?" value={resolution} onChange={setResolution} placeholder="Select the outcome you want" options={RESOLUTIONS} searchable={false} disabled={submitting} />
                  {resolution === "refund" || resolution === "return_and_refund" ? <div className="grid gap-4 sm:grid-cols-2"><div><label className="block text-sm font-bold text-zinc-700">Amount requested</label><input type="number" min="0" max={totalAmount} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder={String(totalAmount)} className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900" disabled={submitting} /></div><FormDropdown label="Original payment method" value={paymentMethod} onChange={setPaymentMethod} placeholder="Select payment method" options={PAYMENT_METHODS} searchable={false} disabled={submitting} /></div> : null}
                  {resolution === "refund" || resolution === "return_and_refund" ? <div><label className="block text-sm font-bold text-zinc-700">Refund destination (optional)</label><input value={refundDestination} onChange={(event) => setRefundDestination(event.target.value)} placeholder="Mobile number, bank details reference, or other destination" className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900" disabled={submitting} /></div> : null}
                  <div><label className="block text-sm font-bold text-zinc-700">Explain the problem</label><textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={5} placeholder="Describe what happened and what you want BuyMesho to consider…" className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900" disabled={submitting} /></div>
                  <div><label className="block text-sm font-bold text-zinc-700">Evidence links (optional)</label><textarea value={evidence} onChange={(event) => setEvidence(event.target.value)} rows={3} placeholder="Paste one photo/document link per line" className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900" disabled={submitting} /></div>
                  <p className="text-xs leading-5 text-zinc-500">Requests are subject to BuyMesho's applicable dispute period. The request is recorded first; approval does not itself mean money has moved.</p>
                  <button disabled={submitting || !requestType || !reason.trim()} className="w-full rounded-2xl bg-zinc-900 px-6 py-3 text-sm font-bold text-white disabled:opacity-50">{submitting ? "Submitting…" : "Submit dispute"}</button>
                </form>
              )}
            </>
          )}
          {error ? <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}
        </section>

        <section className="mt-8 rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-black">My disputes</h2><p className="mt-1 text-sm text-zinc-500">Every case stays together with its latest attempt.</p></div><span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-700">{cases.length}</span></div>
          {loadingCases ? <p className="mt-5 text-sm text-zinc-500">Loading disputes…</p> : cases.length === 0 ? <p className="mt-5 text-sm text-zinc-500">No disputes yet.</p> : <div className="mt-5 space-y-3">{cases.map((item, index) => <div key={String(item.id ?? index)} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-bold">Order {String(item.order_id ?? "—")}</p><span className="rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-wide">{String(item.status ?? "open")}</span></div><p className="mt-2 text-sm text-zinc-600">{String(item.latest_request_type ?? "dispute")} · {String(item.latest_requested_resolution ?? "review")}</p><p className="mt-1 text-xs text-zinc-500">Updated {String(item.updated_at ?? item.created_at ?? "—")}</p></div>)}</div>}
        </section>
      </div>
    </div>
  );
}
