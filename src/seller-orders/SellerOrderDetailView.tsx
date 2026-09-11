import { AlertCircle, ArrowLeft, CheckCircle2, Send, ShieldAlert } from "lucide-react";
import SellerDisputeResolution from "./SellerDisputeResolution";
import OrderTimeline from "./OrderTimeline";
import type { OrderBundle, SellerResolution } from "./types";
import {
  hasDispute,
  isActionRequired,
  isAdminOwnedDispute,
  isDelivered,
  isPendingDispute,
  isSellerOwnedDispute,
  isSettledDispute,
  money,
  normalize,
  orderStatusLabel,
  settlementLabel,
} from "./utils";

export type SellerOrderDetailViewProps = {
  selected: OrderBundle;
  actionLoading: boolean;
  resolutionLoading: boolean;
  sellerResolution: SellerResolution;
  resolutionReason: string;
  refundAmount: string;
  refundMethod: string;
  refundTransactionId: string;
  refundDate: string;
  refundDestination: string;
  refundNote: string;
  refundEvidence: string[];
  refundEvidenceInput: string;
  payoutPaid: boolean;
  error: string | null;
  setResolutionReason: (value: string) => void;
  setRefundAmount: (value: string) => void;
  setRefundMethod: (value: string) => void;
  setRefundTransactionId: (value: string) => void;
  setRefundDate: (value: string) => void;
  setRefundDestination: (value: string) => void;
  setRefundNote: (value: string) => void;
  setRefundEvidenceInput: (value: string) => void;
  closeOrder: () => void;
  markAsPendingDelivery: (bundle: OrderBundle) => Promise<void>;
  chooseSellerResolution: (resolution: Exclude<SellerResolution, null>) => void;
  addEvidence: () => void;
  submitSellerRefund: () => Promise<void>;
  submitSellerNonRefund: () => Promise<void>;
  contactBuyer: (bundle: OrderBundle) => Promise<void>;
};

export default function SellerOrderDetailView({
  selected,
  actionLoading,
  resolutionLoading,
  sellerResolution,
  resolutionReason,
  refundAmount,
  refundMethod,
  refundTransactionId,
  refundDate,
  refundDestination,
  refundNote,
  refundEvidence,
  refundEvidenceInput,
  payoutPaid,
  error,
  setResolutionReason,
  setRefundAmount,
  setRefundMethod,
  setRefundTransactionId,
  setRefundDate,
  setRefundDestination,
  setRefundNote,
  setRefundEvidenceInput,
  closeOrder,
  markAsPendingDelivery,
  chooseSellerResolution,
  addEvidence,
  submitSellerRefund,
  submitSellerNonRefund,
  contactBuyer,
}: SellerOrderDetailViewProps) {
  const buyer = selected.order.buyerDetails;
  const dispute = selected.dispute;
  const disputeReason = String(
    dispute?.reason ?? dispute?.latestAttempt?.reason ?? "",
  ).trim();
  const settled = isSettledDispute(selected);
  const pending = isPendingDispute(selected);
  const sellerOwned = isSellerOwnedDispute(selected);
  const adminOwned = isAdminOwnedDispute(selected);
  const settledLabel = settlementLabel(selected);
  const sellerOutcome = normalize(dispute?.outcome);
  const sellerSubmittedResolution =
    sellerOutcome === "seller_refund_confirmed" || sellerOutcome === "seller_refund_accepted"
      ? "Refund"
      : sellerOutcome === "seller_replacement_confirmed" || sellerOutcome === "seller_replacement_committed"
        ? "Send another item"
        : sellerOutcome === "seller_rejected" || sellerOutcome === "seller_dispute_rejected"
          ? "Reject"
          : null;

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-4xl">
        <button
          type="button"
          onClick={closeOrder}
          className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-zinc-600 hover:text-zinc-950"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Seller Orders
        </button>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                Order
              </p>
              <h1 className="mt-1 text-2xl font-black text-zinc-950">
                {selected.order.id}
              </h1>
            </div>
            <span
              className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${
                settled
                  ? "bg-emerald-100 text-emerald-900"
                  : pending
                    ? "bg-amber-100 text-amber-900"
                    : "bg-zinc-100 text-zinc-800"
              }`}
            >
              {orderStatusLabel(selected)}
            </span>
          </div>

          {error ? (
            <div
              role="alert"
              className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
                <div className="min-w-0">
                  <p className="font-black">Seller action failed</p>
                  <p className="mt-1 whitespace-pre-wrap break-words font-semibold">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {hasDispute(selected) ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-amber-950">
                    {settled
                      ? `Dispute settled — ${settledLabel}`
                      : adminOwned
                        ? "Buyer dispute — BuyMesho review"
                        : pending
                          ? "Buyer has an open dispute"
                          : "Dispute history"}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-amber-900/80">
                    {settled
                      ? "This dispute is settled and no further seller resolution is required."
                      : adminOwned
                        ? "This dispute was submitted before seller payout was completed. BuyMesho is reviewing the case and the seller payout is protected while the review is active."
                        : pending
                          ? "Review the buyer’s request and choose one resolution."
                          : "This order has dispute history."}
                  </p>

                  {sellerSubmittedResolution ? (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
                        Seller resolution
                      </p>
                      <p className="mt-2 text-sm font-black text-zinc-950">
                        {sellerSubmittedResolution}
                      </p>
                      <button
                        type="button"
                        disabled
                        className="mt-3 rounded-xl bg-zinc-200 px-4 py-2.5 text-sm font-extrabold text-zinc-500"
                      >
                        Submitted
                      </button>
                    </div>
                  ) : null}

                  {disputeReason ? (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-white p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">
                        Issue
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-800">
                        {disputeReason}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-zinc-50 p-4">
              <p className="text-xs font-black uppercase tracking-wider text-zinc-400">
                Purchase
              </p>
              {selected.order.items.map((item) => (
                <div
                  key={`${item.title}-${item.quantity}`}
                  className="mt-3 flex justify-between gap-4 text-sm"
                >
                  <span className="font-semibold text-zinc-700">
                    {item.title} × {item.quantity}
                  </span>
                  <span className="font-extrabold text-zinc-950">
                    {selected.order.currency} {Number(item.unitPrice.amount * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
              <div className="mt-4 flex justify-between border-t border-zinc-200 pt-3 font-black">
                <span>Total</span>
                <span>{money(selected.order)}</span>
              </div>
            </div>

            <div className="rounded-2xl bg-zinc-50 p-4">
              <p className="text-xs font-black uppercase tracking-wider text-zinc-400">
                Buyer & Delivery
              </p>
              {buyer ? (
                <div className="mt-3 space-y-1 text-sm text-zinc-700">
                  <p className="font-extrabold text-zinc-950">{buyer.fullName}</p>
                  <p>{buyer.phone}</p>
                  <p>{buyer.addressLine}</p>
                  <p>
                    {buyer.area}, {buyer.townOrDistrict}
                  </p>
                  {buyer.landmark ? <p>Landmark: {buyer.landmark}</p> : null}
                </div>
              ) : (
                <p className="mt-3 text-sm text-zinc-500">
                  Buyer delivery details are not available for this order.
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-zinc-200 p-4">
            <p className="text-xs font-black uppercase tracking-wider text-zinc-400">
              Payment, Escrow & Payout
            </p>
            <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
              <p>
                <span className="text-zinc-500">Payment:</span>{" "}
                <strong>{selected.payment?.status ?? "—"}</strong>
              </p>
              <p>
                <span className="text-zinc-500">Escrow:</span>{" "}
                <strong>{selected.escrow?.state ?? "—"}</strong>
              </p>
              <p>
                <span className="text-zinc-500">Seller payout:</span>{" "}
                <strong>{selected.payoutStatus ?? "Not available"}</strong>
              </p>
            </div>
          </div>

          <OrderTimeline bundle={selected} />

          {pending && sellerOwned ? (
            <SellerDisputeResolution
              sellerResolution={sellerResolution}
              resolutionReason={resolutionReason}
              resolutionLoading={resolutionLoading}
              payoutPaid={payoutPaid}
              refundAmount={refundAmount}
              refundMethod={refundMethod}
              refundTransactionId={refundTransactionId}
              refundDate={refundDate}
              refundDestination={refundDestination}
              refundNote={refundNote}
              refundEvidence={refundEvidence}
              refundEvidenceInput={refundEvidenceInput}
              setResolutionReason={setResolutionReason}
              setRefundAmount={setRefundAmount}
              setRefundMethod={setRefundMethod}
              setRefundTransactionId={setRefundTransactionId}
              setRefundDate={setRefundDate}
              setRefundDestination={setRefundDestination}
              setRefundNote={setRefundNote}
              setRefundEvidenceInput={setRefundEvidenceInput}
              chooseSellerResolution={chooseSellerResolution}
              addEvidence={addEvidence}
              submitSellerRefund={submitSellerRefund}
              submitSellerNonRefund={submitSellerNonRefund}
              contactBuyer={() => contactBuyer(selected)}
            />
          ) : null}

          {pending && adminOwned ? (
            <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-5">
              <p className="text-sm font-black text-sky-950">BuyMesho dispute review</p>
              <p className="mt-1 text-sm leading-6 text-sky-900/80">
                Seller resolution is unavailable because the seller payout had not been completed when the dispute was submitted. BuyMesho will review the case and handle any refund from BuyMesho-controlled funds if approved.
              </p>
              <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <p><span className="text-sky-800/70">Payout at submission:</span>{" "}<strong>{selected.dispute?.payoutStatusAtSubmission ?? selected.payoutStatus ?? "Not available"}</strong></p>
                <p><span className="text-sky-800/70">Current payout:</span>{" "}<strong>{selected.payoutStatus ?? "Not available"}</strong></p>
              </div>
            </div>
          ) : null}

          {isActionRequired(selected) ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-black text-emerald-950">Ready to send</p>
              <p className="mt-1 text-sm text-emerald-900/80">
                Mark this order as sent when you have handed it to the buyer or delivery provider.
              </p>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => void markAsPendingDelivery(selected)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-extrabold text-white disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {actionLoading ? "Updating…" : "Mark as sent"}
              </button>
            </div>
          ) : null}

          {isDelivered(selected) ? (
            <div className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-extrabold text-emerald-900">
              <CheckCircle2 className="h-4 w-4" /> Delivery completed
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
