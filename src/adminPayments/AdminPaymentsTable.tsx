import { CreditCard, Loader2 } from "lucide-react";
import {
  formatDate,
  getEscrowTone,
  getOrderTone,
  getPaymentTone,
  normalizeStatusLabel,
  type PaymentRow,
  type Tone,
} from "./adminPayments.utils";

function StatusPill({ label, tone }: { label: string; tone: Tone }) {
  const toneClass: Record<Tone, string> = {
    zinc: "bg-bm-surface-muted dark:bg-bm-surface-muted text-bm-text-muted dark:text-bm-text-muted border-bm-border dark:border-bm-border",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${toneClass[tone]}`}>{label}</span>;
}

export default function AdminPaymentsTable({
  payments,
  loading,
  searchActive,
  onSelectPayment,
}: {
  payments: PaymentRow[];
  loading: boolean;
  searchActive: boolean;
  onSelectPayment: (payment: PaymentRow) => void;
}) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-bm-border dark:border-bm-border bg-bm-surface shadow-sm">
      <div className="border-b border-bm-border-subtle dark:border-bm-border-subtle px-5 py-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          <h2 className="text-lg font-black">{searchActive ? "Matching payment records" : "Payment records"}</h2>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-bm-text-subtle dark:text-bm-text-subtle" /></div>
      ) : payments.length === 0 ? (
        <div className="p-8 text-center text-sm text-bm-text-subtle dark:text-bm-text-subtle">{searchActive ? "No payment records matched this investigation query." : "No payments found."}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bm-surface-muted dark:bg-bm-surface-subtle text-bm-text-subtle dark:text-bm-text-subtle">
              <tr>
                <th className="p-4 text-left">Payment</th>
                <th className="p-4 text-left">Reference / Seller</th>
                <th className="p-4 text-left">Order</th>
                <th className="p-4 text-left">Settlement</th>
                <th className="p-4 text-left">Amount / Provider</th>
                <th className="p-4 text-left">Updated</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="cursor-pointer border-t border-bm-border-subtle dark:border-bm-border-subtle hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted" onClick={() => onSelectPayment(payment)}>
                  <td className="p-4">
                    <button
                      type="button"
                      className="w-full text-left focus:outline-none"
                      onClick={(event) => { event.stopPropagation(); onSelectPayment(payment); }}
                      aria-label={`Open payment ${payment.reference}`}
                    >
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-bm-text-subtle dark:text-bm-text-subtle">Payment ID</p>
                      <p className="mt-1 break-all font-mono text-xs font-semibold">{payment.id}</p>
                      <div className="mt-2"><StatusPill label={payment.payment_status} tone={getPaymentTone(payment.payment_status)} /></div>
                      <div className="mt-2 text-xs text-bm-text-subtle dark:text-bm-text-subtle">{payment.method}</div>
                      <div className="mt-1 text-[11px] text-bm-text-subtle dark:text-bm-text-subtle">Verified: {Number(payment.verified) === 1 ? "yes" : "no"}</div>
                    </button>
                  </td>
                  <td className="p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-bm-text-subtle dark:text-bm-text-subtle">BuyMesho reference</p>
                    <p className="mt-1 break-all font-mono text-xs">{payment.reference}</p>
                    <p className="mt-2 text-[11px] text-bm-text-subtle dark:text-bm-text-subtle">Provider: {payment.provider}</p>
                    {payment.provider_reference ? <p className="mt-1 break-all text-[11px] text-bm-text-subtle dark:text-bm-text-subtle">Gateway: {payment.provider_reference}</p> : null}
                    {payment.seller_uuid || payment.seller_id ? <p className="mt-1 break-all text-[11px] text-bm-text-subtle dark:text-bm-text-subtle">Seller UUID: {String(payment.seller_uuid ?? payment.seller_id)}</p> : null}
                    {payment.ticket_id ? <p className="mt-1 break-all text-[11px] text-bm-text-subtle dark:text-bm-text-subtle">Ticket: {String(payment.ticket_id)}</p> : null}
                    {payment.ticket_code ? <p className="mt-1 break-all text-[11px] text-bm-text-subtle dark:text-bm-text-subtle">Ticket code: {String(payment.ticket_code)}</p> : null}
                  </td>
                  <td className="p-4">
                    <StatusPill label={normalizeStatusLabel(payment.order_status)} tone={getOrderTone(payment.order_status)} />
                    <div className="mt-2 break-all text-xs text-bm-text-subtle dark:text-bm-text-subtle">{payment.order_id}</div>
                    <div className="mt-1 text-[11px] text-bm-text-subtle dark:text-bm-text-subtle">Order paid: {formatDate(payment.order_paid_at)}</div>
                  </td>
                  <td className="p-4">
                    <StatusPill label={normalizeStatusLabel(payment.escrow_state)} tone={getEscrowTone(payment.escrow_state)} />
                    <div className="mt-2 text-xs text-bm-text-subtle dark:text-bm-text-subtle">{payment.escrow_id || "No settlement yet"}</div>
                    <div className="mt-1 text-[11px] text-bm-text-subtle dark:text-bm-text-subtle">Settlement updated: {formatDate(payment.escrow_updated_at)}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-bold">{payment.currency} {payment.amount}</div>
                    <div className="mt-1 text-[11px] text-bm-text-subtle dark:text-bm-text-subtle">Provider: {payment.provider}</div>
                  </td>
                  <td className="p-4 text-xs text-bm-text-subtle dark:text-bm-text-subtle">{formatDate(payment.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
