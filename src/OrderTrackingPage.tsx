import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, BadgeCheck, CreditCard, ShieldAlert, Truck } from "lucide-react";
import { navigateBackOrPath, navigateToPath, CART_PATH, EXPLORE_PATH } from "./lib/appNavigation";
import { fetchOrderByReference, openOrderDispute, releaseOrderEscrow, type OrderBundle } from "./lib/orderApi";

const stages = [
  "Order placed",
  "Payment pending",
  "Payment confirmed",
  "Funds in escrow",
  "Delivered",
  "Funds released",
];

function getBuyerFriendlyEscrowState(state: string): string {
  switch (state) {
    case "initiated":
      return "Escrow initiated";
    case "funded":
      return "Funds secured in escrow";
    case "held":
      return "Funds temporarily held";
    case "released":
      return "Funds released to seller";
    case "refunded":
      return "Funds refunded to buyer";
    case "disputed":
      return "Escrow under dispute";
    case "closed":
      return "Escrow closed";
    default:
      return state;
  }
}

export default function OrderTrackingPage() {
  const [bundle, setBundle] = useState<OrderBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [submitting, setSubmitting] = useState<"release" | "dispute" | null>(null);

  const reference = useMemo(() => {
    const segments = window.location.pathname.split("/").filter(Boolean);
    return segments[1] ? decodeURIComponent(segments[1]) : null;
  }, []);

  const reload = useCallback(async () => {
    if (!reference) {
      setError("No order reference found in URL.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchOrderByReference(reference);
      setBundle(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load order details.");
      setBundle(null);
    } finally {
      setLoading(false);
    }
  }, [reference]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const order = bundle?.order ?? null;

  const paymentStatus = typeof bundle?.payment?.status === "string"
    ? String(bundle?.payment?.status)
    : order?.status ?? "pending";

  const escrowState = typeof bundle?.escrow?.state === "string"
    ? String(bundle?.escrow?.state)
    : "initiated";

  const activeIndex = useMemo(() => {
    if (!order) return 0;

    if (
      escrowState === "released" ||
      order.status === "fulfilled" ||
      order.status === "closed"
    ) {
      return 5;
    }

    if (
      order.status === "in_escrow" ||
      escrowState === "funded" ||
      escrowState === "held" ||
      escrowState === "disputed"
    ) {
      return 3;
    }

    if (order.status === "paid") {
      return 2;
    }

    if (order.status === "pending_payment") {
      return 1;
    }

    if (order.status === "refunded" || escrowState === "refunded") {
      return 5;
    }

    return 0;
  }, [escrowState, order]);

  const totalAmount = Number(order?.total?.amount ?? 0);
  const totalCurrency = String(order?.total?.currency ?? "MWK");
  const firstItemTitle = order?.items?.[0]?.title ?? "—";

  const canConfirmDelivery =
    order?.status === "in_escrow" &&
    escrowState !== "released" &&
    escrowState !== "refunded" &&
    escrowState !== "closed";

  const handleConfirmDelivery = async () => {
    if (!order) return;

    try {
      setSubmitting("release");
      setError(null);

      await releaseOrderEscrow(order.id);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to confirm delivery.");
    } finally {
      setSubmitting(null);
    }
  };

  const handleOpenDispute = async () => {
    if (!order) return;

    if (!disputeReason.trim()) {
      setError("Please provide a dispute reason.");
      return;
    }

    try {
      setSubmitting("dispute");
      setError(null);

      await openOrderDispute(order.id, disputeReason.trim());
      setDisputeReason("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit dispute.");
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigateBackOrPath(EXPLORE_PATH)}
            className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-800 shadow-sm hover:bg-zinc-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <button
            type="button"
            onClick={() => navigateToPath(CART_PATH)}
            className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-zinc-800"
          >
            <CreditCard className="h-4 w-4" />
            Cart
          </button>
        </div>

        <section className="mt-6 rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-900 text-white">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
                Buyer order tracking
              </p>
              <h1 className="text-3xl font-black tracking-tight text-zinc-950">
                Track the order without admin noise
              </h1>
            </div>
          </div>

          {loading ? (
            <div className="mt-6 rounded-[2rem] border border-zinc-200 bg-zinc-50 p-6 text-sm leading-6 text-zinc-600">
              Loading order details…
            </div>
          ) : error ? (
            <div className="mt-6 rounded-[2rem] border border-red-200 bg-red-50 p-6 text-sm leading-6 text-red-700">
              {error}
            </div>
          ) : order ? (
            <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[2rem] border border-zinc-200 bg-zinc-50 p-5 sm:p-6">
                <h2 className="text-lg font-black text-zinc-950">Progress</h2>

                <div className="mt-4 grid gap-3">
                  {stages.map((stage, index) => {
                    const active = index <= activeIndex;

                    return (
                      <div
                        key={stage}
                        className={`flex items-center gap-3 rounded-2xl border p-4 ${active
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-200 bg-white text-zinc-700"
                          }`}
                      >
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${active
                            ? "bg-white text-zinc-900"
                            : "bg-zinc-100 text-zinc-700"
                            }`}
                        >
                          {index + 1}
                        </div>

                        <div>
                          <p className="text-sm font-bold">{stage}</p>

                          {index === activeIndex ? (
                            <p className={`text-xs ${active ? "text-zinc-200" : "text-zinc-500"}`}>
                              Current state
                            </p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[2rem] border border-zinc-200 bg-zinc-50 p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <BadgeCheck className="h-5 w-5 text-red-900" />
                  <h2 className="text-lg font-black text-zinc-950">Order details</h2>
                </div>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                    <span className="text-zinc-500">BuyMesho reference</span>
                    <p className="mt-1 font-semibold text-zinc-900 break-all">{reference}</p>
                  </div>

                  <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                    <span className="text-zinc-500">Item</span>
                    <p className="mt-1 font-semibold text-zinc-900">{firstItemTitle}</p>
                  </div>

                  <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                    <span className="text-zinc-500">Payment status</span>
                    <p className="mt-1 font-semibold capitalize text-zinc-900">{paymentStatus}</p>
                  </div>

                  <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                    <span className="text-zinc-500">Order status</span>
                    <p className="mt-1 font-semibold capitalize text-zinc-900">
                      {order.status.replace(/_/g, " ")}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                    <span className="text-zinc-500">Escrow status</span>
                    <p className="mt-1 font-semibold text-zinc-900">
                      {getBuyerFriendlyEscrowState(escrowState)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                    <span className="text-zinc-500">Order ID</span>
                    <p className="mt-1 font-semibold text-zinc-900 break-all">{order.id}</p>
                  </div>

                  <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                    <span className="text-zinc-500">Total</span>
                    <p className="mt-1 font-semibold text-zinc-900">
                      {totalCurrency} {totalAmount.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <button
                    type="button"
                    onClick={() => void handleConfirmDelivery()}
                    disabled={!canConfirmDelivery || submitting !== null}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-60"
                  >
                    <CreditCard className="h-4 w-4" />
                    {submitting === "release"
                      ? "Confirming..."
                      : "Confirm delivery (release escrow)"}
                  </button>

                  <div className="rounded-2xl border border-zinc-200 bg-white p-3">
                    <label className="mb-2 block text-xs font-bold text-zinc-600">
                      Dispute reason
                    </label>

                    <input
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                      placeholder="Describe the issue"
                    />

                    <button
                      type="button"
                      onClick={() => void handleOpenDispute()}
                      disabled={submitting !== null}
                      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
                    >
                      <ShieldAlert className="h-4 w-4" />
                      {submitting === "dispute" ? "Submitting..." : "Open dispute"}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      reference &&
                      navigateToOrderDispute(reference)
                    }
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold text-zinc-900 hover:bg-zinc-50"
                  >
                    Go to dispute form
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-[2rem] border border-zinc-200 bg-zinc-50 p-6 text-sm leading-6 text-zinc-600">
              No tracking record yet. Start from the cart or checkout flow and the latest order will appear here.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
