import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Package,
  RefreshCw,
  Send,
  ShieldAlert,
} from "lucide-react";
import { SELLER_HUB_PATH } from "../lib/appNavigation.paths";
import { useSellerOrders } from "./useSellerOrders";
import type { SellerResolution } from "./types";
import {
  FILTERS,
  getFilterCount,
  hasDispute,
  isActionRequired,
  isDelivered,
  isPendingDispute,
  isSettledDispute,
  money,
  orderStatusLabel,
  requestedResolutionLabel,
  settlementLabel,
} from "./utils";

export default function SellerOrdersView() {
  const {
    profileLoading,
    profile,
    selectedOrderId,
    orders,
    filter,
    disputedFilter,
    selected,
    loading,
    refreshing,
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
    error,
    filteredOrders,
    pendingDisputes,
    payoutPaid,
    setFilter,
    setDisputedFilter,
    setResolutionReason,
    setRefundAmount,
    setRefundMethod,
    setRefundTransactionId,
    setRefundDate,
    setRefundDestination,
    setRefundNote,
    setRefundEvidenceInput,
    loadOrders,
    openOrder,
    closeOrder,
    markAsPendingDelivery,
    contactBuyer,
    chooseSellerResolution,
    addEvidence,
    submitSellerRefund,
    submitSellerNonRefund,
    navigateToSellerHub,
  } = useSellerOrders();

  if (profileLoading) {
    return (
      <main className="min-h-screen grid place-items-center bg-zinc-50 text-sm font-semibold text-zinc-500">
        Loading seller orders…
      </main>
    );
  }

  if (!profile?.is_seller) {
    return (
      <main className="min-h-screen grid place-items-center bg-zinc-50 px-6 text-center">
        <div>
          <p className="font-extrabold text-zinc-900">Seller access required</p>
          <button
            type="button"
            onClick={navigateToSellerHub}
            className="mt-3 text-sm font-bold text-zinc-600 hover:text-zinc-950"
          >
            Back to Workspace
          </button>
        </div>
      </main>
    );
  }

  if (selected) {
    const buyer = selected.order.buyerDetails;
    const dispute = selected.dispute;
    const disputeReason = String(
      dispute?.reason ?? dispute?.latestAttempt?.reason ?? "",
    ).trim();
    const settled = isSettledDispute(selected);
    const pending = isPendingDispute(selected);
    const settledLabel = settlementLabel(selected);

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

            {hasDispute(selected) ? (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-amber-950">
                      {settled
                        ? `Dispute settled — ${settledLabel}`
                        : pending
                          ? "Buyer has an open dispute"
                          : "Dispute history"}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-amber-900/80">
                      {settled
                        ? "This dispute is settled and no further seller resolution is required."
                        : pending
                          ? "Review the buyer’s request and choose one resolution."
                          : "This order has dispute history."}
                    </p>
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

            {pending ? (
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
                          onClick={() => chooseSellerResolution(resolution as Exclude<SellerResolution, null>)}
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
                    onClick={() => void contactBuyer(selected)}
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-extrabold text-zinc-900 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" /> Contact Buyer
                  </button>
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

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
              Seller Workspace
            </p>
            <h1 className="mt-1 text-3xl font-black text-zinc-950">Seller Orders</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Manage purchases made from your listings and respond to order disputes in the same workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadOrders(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {pendingDisputes.length > 0 ? (
          <section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-amber-700" />
                  <h2 className="text-lg font-black text-amber-950">Pending Disputes</h2>
                  <span className="rounded-full bg-amber-200 px-2.5 py-1 text-xs font-black text-amber-900">
                    {pendingDisputes.length}
                  </span>
                </div>
                <p className="mt-1 text-sm text-amber-900/80">
                  Review buyer requests before continuing delivery or settlement actions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFilter("disputed");
                  setDisputedFilter("pending");
                }}
                className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-extrabold text-amber-900 hover:bg-amber-100"
              >
                View pending disputes
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {pendingDisputes.slice(0, 5).map((bundle) => (
                <button
                  key={bundle.order.id}
                  type="button"
                  onClick={() => openOrder(bundle)}
                  className="group w-full rounded-2xl border border-amber-200 bg-white p-4 text-left transition hover:border-amber-300 hover:shadow-sm"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-zinc-950">
                        {bundle.order.items[0]?.title ?? "Order"}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {bundle.order.id} · {bundle.order.buyerDetails?.fullName ?? "Buyer"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700">
                          {requestedResolutionLabel(
                            bundle.dispute?.requestedResolution ??
                              bundle.dispute?.latestAttempt?.requestedResolution ??
                              bundle.refundRequest?.requestedResolution,
                          )}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-zinc-500">
                          {money(bundle.order)}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-amber-600" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
          {FILTERS.map((item) => {
            const count = getFilterCount(orders, item.key, disputedFilter);
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setFilter(item.key);
                  if (item.key !== "disputed") setDisputedFilter("all");
                }}
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-xs font-extrabold transition ${
                  filter === item.key
                    ? "bg-zinc-950 text-white"
                    : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-100"
                }`}
              >
                {item.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    filter === item.key
                      ? "bg-white/15 text-white"
                      : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {filter === "disputed" ? (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Dispute status">
            {([
              ["all", "All", "bg-zinc-900 text-white"],
              ["pending", "Pending", "bg-amber-100 text-amber-900"],
              ["settled", "Settled", "bg-emerald-100 text-emerald-900"],
            ] as const).map(([key, label, activeClass]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={disputedFilter === key}
                onClick={() => setDisputedFilter(key)}
                className={`rounded-xl px-4 py-2 text-xs font-black ${
                  disputedFilter === key
                    ? activeClass
                    : "bg-white text-zinc-600 ring-1 ring-zinc-200"
                }`}
              >
                {label}{" "}
                <span className="ml-1 opacity-70">
                  {getFilterCount(orders, "disputed", key)}
                </span>
              </button>
            ))}
          </div>
        ) : null}

        {error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> {error}
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-10 text-center text-sm font-semibold text-zinc-500">
            Loading seller orders…
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-10 text-center">
            <Package className="mx-auto h-8 w-8 text-zinc-300" />
            <p className="mt-3 font-extrabold text-zinc-800">No orders in this view.</p>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {filteredOrders.map((bundle) => (
              <button
                key={bundle.order.id}
                type="button"
                onClick={() => openOrder(bundle)}
                className="group w-full rounded-2xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition hover:border-zinc-300 hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-zinc-950">
                      {bundle.order.items[0]?.title ?? "Order"}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {bundle.order.id} · {bundle.order.buyerDetails?.fullName ?? "Buyer"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-black text-zinc-950">{money(bundle.order)}</p>
                      <p className="mt-1 text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
                        {orderStatusLabel(bundle)}
                      </p>
                    </div>
                    {isPendingDispute(bundle) ? (
                      <ShieldAlert className="h-4 w-4 text-amber-600" />
                    ) : null}
                    <ChevronRight className="h-4 w-4 text-zinc-400" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={navigateToSellerHub}
          className="mt-8 text-sm font-bold text-zinc-500 hover:text-zinc-950"
        >
          Back to Workspace
        </button>
      </div>
    </main>
  );
}
