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
    zinc: "bg-zinc-100 text-zinc-700 border-zinc-200",
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
}: {
  payments: PaymentRow[];
  loading: boolean;
  searchActive: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          <h2 className="text-lg font-black">{searchActive ? "Matching payment records" : "Payment records"}</h2>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-zinc-500" /></div>
      ) : payments.length === 0 ? (
        <div className="p-8 text-center text-sm text-zinc-500">{searchActive ? "No payment records matched this investigation query." : "No payments found."}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-500">
              <tr>
                <th className="p-4 text-left">Reference</th>
                <th className="p-4 text-left">Payment</th>
                <th className="p-4 text-left">Order</th>
                <th className="p-4 text-left">Settlement</th>
                <th className="p-4 text-left">Amount</th>
                <th className="p-4 text-left">Updated</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="cursor-pointer border-t border-zinc-100 hover:bg-zinc-50">
                  <td className="p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">BuyMesho reference</p>
                    <p className="mt-1 break-all font-mono text-xs">{payment.reference}</p>
                    <p className="mt-2 text-[11px] text-zinc-400">{payment.provider}</p>
                    {payment.seller_uuid || payment.seller_id ? <p className="mt-1 break-all text-[11px] text-zinc-400">Seller: {String(payment.seller_uuid ?? payment.seller_id)}</p> : null}
                    {payment.ticket_id ? <p className="mt-1 break-all text-[11px] text-zinc-400">Ticket: {String(payment.ticket_id)}</p> : null}
                  </td>
                  <td className="p-4">
                    <StatusPill label={payment.payment_status} tone={getPaymentTone(payment.payment_status)} />
                    <div className="mt-2 text-xs text-zinc-500">{payment.method}</div>
                    <div className="mt-1 text-[11px] text-zinc-400">Verified: {Number(payment.verified) === 1 ? "yes" : "no"}</div>
                  </td>
                  <td className="p-4">
                    <StatusPill label={normalizeStatusLabel(payment.order_status)} tone={getOrderTone(payment.order_status)} />
                    <div className="mt-2 break-all text-xs text-zinc-500">{payment.order_id}</div>
                    <div className="mt-1 text-[11px] text-zinc-400">Order paid: {formatDate(payment.order_paid_at)}</div>
                  </td>
                  <td className="p-4">
                    <StatusPill label={normalizeStatusLabel(payment.escrow_state)} tone={getEscrowTone(payment.escrow_state)} />
                    <div className="mt-2 text-xs text-zinc-500">{payment.escrow_id || "No settlement yet"}</div>
                    <div className="mt-1 text-[11px] text-zinc-400">Settlement updated: {formatDate(payment.escrow_updated_at)}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-bold">{payment.currency} {payment.amount}</div>
                    <div className="mt-1 break-all text-[11px] text-zinc-400">Gateway reference: {payment.provider_reference || "—"}</div>
                  </td>
                  <td className="p-4 text-xs text-zinc-500">{formatDate(payment.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
