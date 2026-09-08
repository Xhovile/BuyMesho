import {
  AlertTriangle,
  ChevronRight,
  Package,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import MarketHeaderBar from "../components/shared/MarketHeaderBar";
import SellerOrderDetailView from "./SellerOrderDetailView";
import { useSellerOrders } from "./useSellerOrders";
import {
  FILTERS,
  getFilterCount,
  isPendingDispute,
  money,
  orderStatusLabel,
  requestedResolutionLabel,
} from "./utils";

export default function SellerOrdersView() {
  const {
    profileLoading,
    profile,
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
    return (
      <>
        <MarketHeaderBar subtitle="Seller Orders" />
        <SellerOrderDetailView
          selected={selected}
          actionLoading={actionLoading}
          resolutionLoading={resolutionLoading}
          sellerResolution={sellerResolution}
          resolutionReason={resolutionReason}
          refundAmount={refundAmount}
          refundMethod={refundMethod}
          refundTransactionId={refundTransactionId}
          refundDate={refundDate}
          refundDestination={refundDestination}
          refundNote={refundNote}
          refundEvidence={refundEvidence}
          refundEvidenceInput={refundEvidenceInput}
          payoutPaid={payoutPaid}
          setResolutionReason={setResolutionReason}
          setRefundAmount={setRefundAmount}
          setRefundMethod={setRefundMethod}
          setRefundTransactionId={setRefundTransactionId}
          setRefundDate={setRefundDate}
          setRefundDestination={setRefundDestination}
          setRefundNote={setRefundNote}
          setRefundEvidenceInput={setRefundEvidenceInput}
          closeOrder={closeOrder}
          markAsPendingDelivery={markAsPendingDelivery}
          chooseSellerResolution={chooseSellerResolution}
          addEvidence={addEvidence}
          submitSellerRefund={submitSellerRefund}
          submitSellerNonRefund={submitSellerNonRefund}
          contactBuyer={contactBuyer}
        />
      </>
    );
  }

  return (
    <>
      <MarketHeaderBar subtitle="Seller Orders" />
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

          <div className="sticky top-16 z-30 -mx-4 mt-6 bg-zinc-50/95 px-4 py-3 backdrop-blur-sm md:-mx-8 md:px-8">
            <div className="flex gap-2 overflow-x-auto pb-2">
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
              <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Dispute status">
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
          </div>

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
    </>
  );
}
