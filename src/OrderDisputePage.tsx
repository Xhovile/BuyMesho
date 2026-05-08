import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, FileText, MessageSquare, ShieldAlert } from "lucide-react";
import { navigateBackOrPath, EXPLORE_PATH } from "./lib/appNavigation";
import { readBuyerPayments, type BuyerPaymentRecord } from "./lib/buyerState";

const DISPUTES_KEY = "__buymesho_buyer_disputes";

type DisputeRecord = {
  id: string;
  orderId: string | null;
  reference: string | null;
  reason: string;
  details: string;
  createdAt: string;
};

const saveDispute = (record: DisputeRecord) => {
  try {
    const raw = localStorage.getItem(DISPUTES_KEY);
    const existing: DisputeRecord[] = raw ? (JSON.parse(raw) as DisputeRecord[]) : [];
    localStorage.setItem(DISPUTES_KEY, JSON.stringify([record, ...existing].slice(0, 50)));
  } catch {
    // ignore storage errors
  }
};

export default function OrderDisputePage() {
  const [payments, setPayments] = useState<BuyerPaymentRecord[]>([]);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const sync = () => setPayments(readBuyerPayments());
    sync();
    const onStorage = (event: StorageEvent) => {
      if (event.key === "__buymesho_buyer_payments") sync();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const orderId = useMemo(() => {
    const parts = window.location.pathname.split("/");
    const disputeIndex = parts.indexOf("dispute");
    return disputeIndex > 0 ? decodeURIComponent(parts[disputeIndex - 1]) : null;
  }, []);

  const order = useMemo(
    () => payments.find((p) => p.reference === orderId || p.orderId === orderId) ?? null,
    [payments, orderId],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    saveDispute({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      orderId: order?.orderId ?? null,
      reference: order?.reference ?? orderId,
      reason,
      details: details.trim(),
      createdAt: new Date().toISOString(),
    });
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigateBackOrPath(EXPLORE_PATH)}
            className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-800 shadow-sm hover:bg-zinc-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>

        <section className="mt-6 rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-900 text-white">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Order dispute</p>
              <h1 className="text-3xl font-black tracking-tight text-zinc-950">Report a problem</h1>
            </div>
          </div>

          {order ? (
            <div className="mt-6 rounded-[2rem] border border-zinc-200 bg-zinc-50 p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-zinc-500" />
                <h2 className="text-base font-black text-zinc-950">Order details</h2>
              </div>
              <div className="mt-4 grid gap-3 text-sm">
                <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                  <span className="text-zinc-500">Reference</span>
                  <p className="mt-1 break-all font-semibold text-zinc-900">{order.reference}</p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                  <span className="text-zinc-500">Item</span>
                  <p className="mt-1 font-semibold text-zinc-900">{order.listingTitle}</p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                  <span className="text-zinc-500">Status</span>
                  <p className="mt-1 font-semibold text-zinc-900">{order.status}</p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                  <span className="text-zinc-500">Total</span>
                  <p className="mt-1 font-semibold text-zinc-900">MWK {order.totalPrice.toLocaleString()}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-[2rem] border border-zinc-200 bg-zinc-50 p-6 text-sm leading-6 text-zinc-600">
              No matching order found for this dispute link. If you arrived here from a notification, the order may have expired.
            </div>
          )}

          <div className="mt-6">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-zinc-500" />
              <h2 className="text-base font-black text-zinc-950">Submit a dispute</h2>
            </div>

            {submitted ? (
              <div className="mt-4 rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-900">
                <div className="flex items-center gap-2 font-black">
                  <ShieldAlert className="h-4 w-4" />
                  Dispute received
                </div>
                <p className="mt-2 leading-6">
                  Your dispute has been recorded. Our team will review it and follow up via your registered contact details.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div>
                  <label htmlFor="dispute-reason" className="block text-sm font-bold text-zinc-700">
                    Reason for dispute
                  </label>
                  <select
                    id="dispute-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                    className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  >
                    <option value="">Select a reason</option>
                    <option value="not_received">Item not received</option>
                    <option value="not_as_described">Item not as described</option>
                    <option value="wrong_item">Wrong item sent</option>
                    <option value="damaged">Item arrived damaged</option>
                    <option value="payment_issue">Payment not confirmed</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="dispute-details" className="block text-sm font-bold text-zinc-700">
                    Additional details
                  </label>
                  <textarea
                    id="dispute-details"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    rows={4}
                    placeholder="Describe the issue in as much detail as possible..."
                    className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>

                <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <div className="flex items-center gap-2 font-black">
                    <AlertTriangle className="h-4 w-4" />
                    Before you submit
                  </div>
                  <p className="mt-2 leading-6">Only raise a dispute if you have a genuine issue with your order. False disputes may result in account restrictions.</p>
                </div>

                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-zinc-800"
                >
                  <ShieldAlert className="h-4 w-4" />
                  Submit dispute
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
