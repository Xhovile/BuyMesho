import { useEffect, useState } from "react";
import { AlertCircle, ArrowRight, Clock3, Loader2, ReceiptText, Wallet } from "lucide-react";
import { apiFetch } from "../lib/api";
import { ENDPOINTS } from "../shared/api/endpoints";
import { formatMoney } from "../shared/utils/formatMoney";

type EventFinancialDestination = {
  id: string;
  destinationType: string | null;
  providerName: string | null;
  maskedAccount: string | null;
  verificationStatus: string | null;
  isActive: boolean;
};

type EventFinancialPayoutAttempt = {
  attemptNo: number;
  provider: string;
  providerChargeId: string;
  status: string;
  failureReason: string | null;
  providerReference: string | null;
  providerTransactionId: string | null;
  createdAt: string | null;
};

type EventFinancialPayout = {
  payoutId: string;
  eventId: string;
  eventCreatorUid: string;
  orderId: string | null;
  escrowId: string | null;
  status: string;
  provider: string | null;
  providerChargeId: string | null;
  providerReference: string | null;
  providerTransactionId: string | null;
  currency: string;
  grossAmount: number;
  platformFeeAmount: number;
  processingFeeAmount: number;
  reserveAmount: number;
  reserveCapAmount: number;
  manualAdjustmentAmount: number;
  payoutFeeAmount: number;
  netAmount: number;
  formulaVersion: string | null;
  destination: EventFinancialDestination | null;
  attempts: EventFinancialPayoutAttempt[];
  createdAt: string | null;
  requestedAt: string | null;
  paidAt: string | null;
  failedAt: string | null;
};

type EventFinancialLedgerEntry = {
  id: string;
  kind: "sale" | "refund" | "payout";
  direction: "inflow" | "outflow";
  amount: number;
  currency: string;
  status: string;
  occurredAt: string | null;
  orderId: string | null;
  escrowId: string | null;
  payoutId: string | null;
  reference: string | null;
  description: string;
};

type EventFinancialReport = {
  event: { id: string; title: string; creatorUid: string; currency: string };
  sales: {
    ticketsSold: number;
    ticketsRefunded: number;
    grossTicketRevenue: number;
    refundedAmount: number;
    unallocatedRefundedAmount: number;
    netSales: number;
  };
  fees: {
    buyMeshoCommission: number;
    processingFees: number;
    reserves: number;
    payoutFees: number;
    manualAdjustments: number;
  };
  payouts: {
    count: number;
    grossAmountRecorded: number;
    netPaidAmount: number;
    netPayableAmount: number;
    netAmountOwed: number;
    byStatus: Record<string, { count: number; amount: number }>;
  };
  currentDestination: EventFinancialDestination | null;
  payoutHistory: EventFinancialPayout[];
  ledger: EventFinancialLedgerEntry[];
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusClass(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "paid") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (["processing", "pending", "pending_settlement", "queued", "held", "eligible"].includes(normalized)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (["failed", "cancelled"].includes(normalized)) return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-zinc-200 bg-zinc-50 text-zinc-700";
}

function destinationLabel(destination: EventFinancialDestination | null) {
  if (!destination) return "Destination unavailable";
  return [destination.providerName, destination.destinationType, destination.maskedAccount].filter(Boolean).join(" • ");
}

function FinancialMetric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">{label}</p>
      <p className="mt-2 text-2xl font-black tracking-tight text-zinc-950">{value}</p>
      {helper ? <p className="mt-1 text-xs font-medium text-zinc-500">{helper}</p> : null}
    </div>
  );
}

export default function EventFinancialReportPanel({
  eventId,
  onClose,
}: {
  eventId: number | string;
  onClose?: () => void;
}) {
  const [report, setReport] = useState<EventFinancialReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = (await apiFetch(ENDPOINTS.eventCreator.eventFinancial(eventId))) as EventFinancialReport;
        if (mounted) setReport(response);
      } catch (loadError: any) {
        if (mounted) setError(loadError?.message || "Could not load the event financial report.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [eventId]);

  if (loading) {
    return (
      <section className="rounded-[1.5rem] border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 text-sm text-zinc-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading event financial report…
        </div>
      </section>
    );
  }

  if (error || !report) {
    return (
      <section className="rounded-[1.5rem] border border-rose-200 bg-rose-50 p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          <div>
            <h3 className="font-black text-rose-950">Financial report unavailable</h3>
            <p className="mt-1 text-sm text-rose-800">{error || "No financial record was found for this event."}</p>
          </div>
        </div>
      </section>
    );
  }

  const currency = report.event.currency || "MWK";

  return (
    <section className="space-y-5 rounded-[1.5rem] border border-zinc-200 bg-zinc-50/60 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-zinc-400">Financial report</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-zinc-950">{report.event.title}</h2>
          <p className="mt-1 text-sm font-medium text-zinc-500">Recorded financial history for this event. Historical payout formulas are read from the stored snapshot.</p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-extrabold text-zinc-900 hover:bg-zinc-50"
          >
            Close
          </button>
        ) : null}
      </div>

      {report.sales.unallocatedRefundedAmount > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold leading-5 text-amber-900">
          MK {report.sales.unallocatedRefundedAmount.toLocaleString()} of recorded refunds could not be attributed to this event because the source refund did not identify an event ticket.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <FinancialMetric label="Gross sales" value={formatMoney(report.sales.grossTicketRevenue, currency)} helper={`${report.sales.ticketsSold} tickets sold`} />
        <FinancialMetric label="Refunds" value={formatMoney(report.sales.refundedAmount, currency)} helper={`${report.sales.ticketsRefunded} tickets refunded`} />
        <FinancialMetric label="Net sales" value={formatMoney(report.sales.netSales, currency)} helper="Gross sales less recorded refunds" />
        <FinancialMetric label="Net paid" value={formatMoney(report.payouts.netPaidAmount, currency)} helper="Recorded paid payouts" />
        <FinancialMetric label="Net payable" value={formatMoney(report.payouts.netPayableAmount, currency)} helper="Recorded outstanding payouts" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center gap-2 border-b border-zinc-200 pb-3">
            <Wallet className="h-4 w-4 text-zinc-500" />
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">Recorded deductions</p>
              <h3 className="mt-1 text-lg font-black text-zinc-950">Payout fee breakdown</h3>
            </div>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            {[
              ["BuyMesho commission", report.fees.buyMeshoCommission],
              ["Processing fees", report.fees.processingFees],
              ["Reserve", report.fees.reserves],
              ["Payout fees", report.fees.payoutFees],
              ["Manual adjustments", report.fees.manualAdjustments],
            ].map(([label, amount]) => (
              <div key={String(label)} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2.5">
                <span className="font-semibold text-zinc-600">{label}</span>
                <span className="font-black text-zinc-950">{formatMoney(Number(amount), currency)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-950 px-4 py-4 text-white">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-white/60">Net paid / payable</span>
              <span className="text-xl font-black">{formatMoney(report.payouts.netAmountOwed, currency)}</span>
            </div>
            <p className="mt-1 text-xs font-medium text-white/60">Based only on recorded payout rows; current fee policy is not re-applied.</p>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center gap-2 border-b border-zinc-200 pb-3">
            <ReceiptText className="h-4 w-4 text-zinc-500" />
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">Current event setting</p>
              <h3 className="mt-1 text-lg font-black text-zinc-950">Receiving account</h3>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="font-black text-zinc-950">{destinationLabel(report.currentDestination)}</p>
            <p className="mt-1 text-xs font-medium text-zinc-500">
              {report.currentDestination?.id ? `Destination ID: ${report.currentDestination.id}` : "No destination currently bound."}
            </p>
          </div>
          <p className="mt-3 text-xs leading-5 text-zinc-500">
            Historical payouts below retain their own destination ID. Changing the current event destination does not rewrite those records.
          </p>
        </section>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 pb-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">Payout history</p>
            <h3 className="mt-1 text-lg font-black text-zinc-950">{report.payouts.count} recorded payout{report.payouts.count === 1 ? "" : "s"}</h3>
          </div>
          <Clock3 className="h-4 w-4 text-zinc-400" />
        </div>

        {report.payoutHistory.length === 0 ? (
          <p className="py-6 text-sm text-zinc-500">No payout has been recorded for this event yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {report.payoutHistory.map((payout) => (
              <div key={payout.payoutId} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-zinc-950">Payout {payout.payoutId}</p>
                    <p className="mt-1 text-xs font-medium text-zinc-500">
                      Event → Order {payout.orderId || "—"} → Escrow {payout.escrowId || "—"}
                    </p>
                  </div>
                  <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${statusClass(payout.status)}`}>
                    {payout.status.replaceAll("_", " ")}
                  </span>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">Gross</p><p className="mt-1 font-black">{formatMoney(payout.grossAmount, payout.currency)}</p></div>
                  <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">Commission</p><p className="mt-1 font-black">{formatMoney(payout.platformFeeAmount, payout.currency)}</p></div>
                  <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">Payout fee</p><p className="mt-1 font-black">{formatMoney(payout.payoutFeeAmount, payout.currency)}</p></div>
                  <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">Net</p><p className="mt-1 font-black">{formatMoney(payout.netAmount, payout.currency)}</p></div>
                  <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">Destination</p><p className="mt-1 font-black">{destinationLabel(payout.destination)}</p></div>
                </div>

                <div className="mt-3 grid gap-2 text-xs text-zinc-500 md:grid-cols-3">
                  <span>Requested {formatDateTime(payout.requestedAt)}</span>
                  <span>Paid {formatDateTime(payout.paidAt)}</span>
                  <span>Formula {payout.formulaVersion || "legacy"}</span>
                </div>

                {payout.attempts.length > 0 ? (
                  <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-3">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-zinc-400">Provider attempts</p>
                    <div className="mt-2 divide-y divide-zinc-100">
                      {payout.attempts.map((attempt) => (
                        <div key={`${payout.payoutId}-${attempt.attemptNo}`} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
                          <span className="font-bold text-zinc-900">Attempt {attempt.attemptNo} • {attempt.providerChargeId}</span>
                          <span className={`rounded-full border px-2.5 py-1 font-bold uppercase tracking-[0.12em] ${statusClass(attempt.status)}`}>{attempt.status}</span>
                          <span className="text-zinc-500">{formatDateTime(attempt.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="flex items-center gap-2 border-b border-zinc-200 pb-3">
          <ArrowRight className="h-4 w-4 text-zinc-500" />
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">Ledger</p>
            <h3 className="mt-1 text-lg font-black text-zinc-950">Event financial activity</h3>
          </div>
        </div>
        {report.ledger.length === 0 ? (
          <p className="py-6 text-sm text-zinc-500">No financial ledger entries have been recorded yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-[10px] uppercase tracking-[0.16em] text-zinc-400">
                <tr>
                  <th className="px-3 py-3">Time</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">Amount</th>
                  <th className="px-3 py-3">Order / payout</th>
                  <th className="px-3 py-3">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {report.ledger.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-3 py-3 text-zinc-500">{formatDateTime(entry.occurredAt)}</td>
                    <td className="px-3 py-3">
                      <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]">{entry.kind}</span>
                    </td>
                    <td className="px-3 py-3 font-black text-zinc-950">
                      {entry.direction === "outflow" ? "-" : "+"}{formatMoney(entry.amount, entry.currency)}
                    </td>
                    <td className="px-3 py-3 text-xs text-zinc-500">{entry.orderId || entry.payoutId || "—"}</td>
                    <td className="px-3 py-3 text-xs text-zinc-500">{entry.reference || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
