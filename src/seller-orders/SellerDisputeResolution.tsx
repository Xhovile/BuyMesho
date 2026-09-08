import { Send } from "lucide-react";
import type { SellerResolution } from "./types";

export type SellerDisputeResolutionProps = {
  sellerResolution: SellerResolution;
  resolutionReason: string;
  resolutionLoading: boolean;
  payoutPaid: boolean;
  refundAmount: string;
  refundMethod: string;
  refundTransactionId: string;
  refundDate: string;
  refundDestination: string;
  refundNote: string;
  refundEvidence: string[];
  refundEvidenceInput: string;
  setResolutionReason: (value: string) => void;
  setRefundAmount: (value: string) => void;
  setRefundMethod: (value: string) => void;
  setRefundTransactionId: (value: string) => void;
  setRefundDate: (value: string) => void;
  setRefundDestination: (value: string) => void;
  setRefundNote: (value: string) => void;
  setRefundEvidenceInput: (value: string) => void;
  chooseSellerResolution: (resolution: Exclude<SellerResolution, null>) => void;
  addEvidence: () => void;
  submitSellerRefund: () => Promise<void>;
  submitSellerNonRefund: () => Promise<void>;
  contactBuyer: () => Promise<void>;
};

export default function SellerDisputeResolution({
  sellerResolution,
  resolutionReason,
  resolutionLoading,
  payoutPaid,
  refundAmount,
  refundMethod,
  refundTransactionId,
  refundDate,
  refundDestination,
  refundNote,
  refundEvidence,
  refundEvidenceInput,
  setResolutionReason,
  setRefundAmount,
  setRefundMethod,
  setRefundTransactionId,
  setRefundDate,
  setRefundDestination,
  setRefundNote,
  setRefundEvidenceInput,
  chooseSellerResolution,
  addEvidence,
  submitSellerRefund,
  submitSellerNonRefund,
  contactBuyer,
}: SellerDisputeResolutionProps) {
  return (
    <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-5">
      <p className="text-sm font-black text-sky-950">Seller dispute resolution</p>
      <p className="mt-1 text-sm leading-6 text-sky-900/80">
        Choose how you want to resolve the buyer’s dispute. Contact Buyer is available while the dispute remains pending.
      </p>

      {payoutPaid ? (
        <>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {([
              ["refund", "Refund"],
              ["replacement", "Send another item"],
              ["rejected", "Reject"],
            ] as const).map(([resolution, label]) => (
              <button
                key={resolution}
                type="button"
                disabled={resolutionLoading}
                onClick={() => chooseSellerResolution(resolution)}
                className={`rounded-xl border px-4 py-3 text-sm font-extrabold ${
                  sellerResolution === resolution
                    ? "border-zinc-950 bg-zinc-950 text-white"
                    : "border-zinc-200 bg-white text-zinc-900"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {sellerResolution === "refund" ? (
            <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-semibold text-zinc-700">
                  Refund amount
                  <input
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    type="number"
                    min="0"
                    step="0.01"
                    className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5"
                  />
                </label>
                <label className="text-sm font-semibold text-zinc-700">
                  Refund method
                  <select
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5"
                  >
                    <option value="mobile_money">Mobile money</option>
                    <option value="bank_transfer">Bank transfer</option>
                    <option value="cash">Cash</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label className="text-sm font-semibold text-zinc-700">
                  Transaction ID
                  <input
                    value={refundTransactionId}
                    onChange={(e) => setRefundTransactionId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5"
                  />
                </label>
                <label className="text-sm font-semibold text-zinc-700">
                  Refund date
                  <input
                    value={refundDate}
                    onChange={(e) => setRefundDate(e.target.value)}
                    type="date"
                    className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5"
                  />
                </label>
                <label className="text-sm font-semibold text-zinc-700 sm:col-span-2">
                  Refund destination
                  <input
                    value={refundDestination}
                    onChange={(e) => setRefundDestination(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5"
                  />
                </label>
                <label className="text-sm font-semibold text-zinc-700 sm:col-span-2">
                  Note
                  <textarea
                    value={refundNote}
                    onChange={(e) => setRefundNote(e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5"
                  />
                </label>
              </div>

              <div className="mt-3 flex gap-2">
                <input
                  value={refundEvidenceInput}
                  onChange={(e) => setRefundEvidenceInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addEvidence();
                    }
                  }}
                  className="min-w-0 flex-1 rounded-xl border border-zinc-200 px-3 py-2.5 text-sm"
                  placeholder="Evidence reference (optional)"
                />
                <button
                  type="button"
                  onClick={addEvidence}
                  className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-bold"
                >
                  Add
                </button>
              </div>

              {refundEvidence.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {refundEvidence.map((evidence) => (
                    <span
                      key={evidence}
                      className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700"
                    >
                      {evidence}
                    </span>
                  ))}
                </div>
              ) : null}

              <button
                type="button"
                disabled={resolutionLoading || !payoutPaid}
                onClick={() => void submitSellerRefund()}
                className="mt-4 rounded-xl bg-zinc-950 px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50"
              >
                {resolutionLoading ? "Submitting…" : "Submit Refund"}
              </button>
            </div>
          ) : null}

          {sellerResolution === "replacement" || sellerResolution === "rejected" ? (
            <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4">
              <p className="text-sm font-black text-zinc-900">
                {sellerResolution === "replacement" ? "Send another item" : "Reject dispute"}
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                {sellerResolution === "replacement"
                  ? "Explain the replacement you will send. Use Contact Buyer to agree the physical delivery details."
                  : "Give the buyer a clear explanation for the rejection."}
              </p>
              <textarea
                value={resolutionReason}
                onChange={(e) => setResolutionReason(e.target.value)}
                rows={5}
                className="mt-4 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm"
                placeholder={
                  sellerResolution === "replacement"
                    ? "Explain the replacement…"
                    : "Explain why you are rejecting this dispute…"
                }
              />
              <button
                type="button"
                disabled={resolutionLoading || resolutionReason.trim().length < 10}
                onClick={() => void submitSellerNonRefund()}
                className="mt-4 rounded-xl bg-zinc-950 px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50"
              >
                {resolutionLoading ? "Submitting…" : "Submit Resolution"}
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      <div className="mt-4">
        <button
          type="button"
          disabled={resolutionLoading}
          onClick={() => void contactBuyer()}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-extrabold text-zinc-900 disabled:opacity-50"
        >
          <Send className="h-4 w-4" /> Contact Buyer
        </button>
      </div>
    </div>
  );
}
