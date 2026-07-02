import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CreditCard, Truck } from "lucide-react";
import {
  PAYMENTS_HUB_PATH,
  navigateToOrderDispute,
  navigateToPath,
  navigateToListingDetails,
} from "./lib/appNavigation";
import {
  fetchOrderByReference,
  getOrderPayoutMetadata,
  openOrderDispute,
  releaseOrderEscrow,
  type OrderBundle,
} from "./lib/orderApi";
import { getCountdownParts, getNextCatMidnightMs } from "./lib/settlementWindow";
import EscrowProtectionCard from "./components/orders/EscrowProtectionCard";
import OrderProgressTracker from "./components/orders/OrderProgressTracker";
import OrderDetailsCard from "./components/orders/OrderDetailsCard";
import DisputeActionsCard from "./components/orders/DisputeActionsCard";
import SellerOrderPayoutPanel from "./components/orders/SellerOrderPayoutPanel";
import { useAccountProfile } from "./hooks/useAccountProfile";
import { useRequireVerifiedUser } from "./hooks/useRequireVerifiedUser";
import { buildSellerOrderPayoutViewModel } from "./modules/payouts/orderPayoutViewModel";

const stages = [
  "Order placed",
  "Payment pending",
  "Payment confirmed",
  "Funds in escrow",
  "Delivered",
  "Funds released",
];

export default function OrderTrackingPage() {
  const ready = useRequireVerifiedUser();
  if (!ready) return null;
  return <OrderTrackingPageContent />;
}

function OrderTrackingPageContent() {
  const { firebaseUser, profile } = useAccountProfile();
  const [bundle, setBundle] = useState<OrderBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [submitting, setSubmitting] = useState<"release" | "dispute" | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

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

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const order = bundle?.order ?? null;
  const viewerUid = firebaseUser?.uid ?? profile?.uid ?? null;
  const orderSellerUid =
    typeof order?.sellerId === "string"
      ? order.sellerId
      : typeof order?.seller_id === "string"
        ? order.seller_id
        : null;
  const isSellerViewer = !!viewerUid && !!orderSellerUid && viewerUid === orderSellerUid;
  const sellerPayoutMetadata = bundle ? getOrderPayoutMetadata(bundle) : null;
  const showSellerPayout = isSellerViewer && !!sellerPayoutMetadata?.paymentCaptured;
  const sellerPayoutModel =
    showSellerPayout && sellerPayoutMetadata
      ? buildSellerOrderPayoutViewModel({ metadata: sellerPayoutMetadata })
      : null;

  const paymentStatus =
    typeof bundle?.payment?.status === "string"
      ? String(bundle?.payment?.status)
      : order?.status ?? "pending";

  const escrowState =
    typeof bundle?.escrow?.state === "string"
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

    if (order.status === "refunded" || order.status === "cancelled") {
      return 5;
    }

    return 0;
  }, [escrowState, order]);

  const paidAt =
  typeof bundle?.payment?.paidAt === "string"
    ? bundle.payment.paidAt
    : typeof bundle?.payment?.paid_at === "string"
      ? bundle.payment.paid_at
      : null;

const escrowUpdatedAt =
  typeof bundle?.escrow?.updatedAt === "string"
    ? bundle.escrow.updatedAt
    : typeof bundle?.escrow?.updated_at === "string"
      ? bundle.escrow.updated_at
      : null;
  
  const releaseAvailableAt = getNextCatMidnightMs(paidAt ?? escrowUpdatedAt ?? Date.now());
  const releaseCountdownParts = getCountdownParts(releaseAvailableAt, nowMs);
  const releaseCountdownText =
    releaseCountdownParts.diffMs === 0
      ? "Now"
      : `${releaseCountdownParts.days}d ${releaseCountdownParts.hours}h ${releaseCountdownParts.minutes}m`;

  const totalAmount = Number(order?.total?.amount ?? 0);
  const totalCurrency = String(order?.total?.currency ?? "MWK");
  const firstItemTitle = order?.items?.[0]?.title ?? "—";

  const canConfirmDelivery =
    order?.status === "in_escrow" &&
    escrowState !== "released" &&
    escrowState !== "refunded" &&
    escrowState !== "closed" &&
    nowMs >= releaseAvailableAt;

  const handleBackToListing = () => {
    const firstListingId = order?.items?.[0]?.listingId;
    if (firstListingId) {
      navigateToListingDetails(firstListingId);
      return;
    }

    navigateToPath(PAYMENTS_HUB_PATH);
  };

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
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBackToListing}
            className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-800 hover:bg-zinc-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>

        <div className="mt-8 border-b border-zinc-200 pb-6">
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-900">
              <Truck className="h-5 w-5" />
            </div>

            <div className="max-w-3xl space-y-2">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
                BUYER ORDER TACKING
              </p>

              <h1 className="text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">
                ORDER STATUS OVERVIEW 
              </h1>

              <p className="text-sm leading-7 text-zinc-600 sm:text-base">
                Monitor payment, escrow, and delivery progress in one place.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-6 text-zinc-600">
            Loading order details…
          </div>
        ) : error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
            {error}
          </div>
        ) : order ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <EscrowProtectionCard
                state={{
                  orderStatus: order.status,
                  paymentStatus,
                  escrowState,
                }}
                paidAt={paidAt}
                escrowUpdatedAt={escrowUpdatedAt}
                viewer={isSellerViewer ? "seller" : "buyer"}
              />

              <OrderProgressTracker stages={stages} activeIndex={activeIndex} />
            </div>

            <div className="space-y-6">
              {sellerPayoutModel ? <SellerOrderPayoutPanel model={sellerPayoutModel} /> : null}

              <OrderDetailsCard
                reference={reference}
                firstItemTitle={firstItemTitle}
                items={order.items}
                paymentStatus={paymentStatus}
                orderStatus={order.status}
                escrowState={escrowState}
                orderId={order.id}
                totalCurrency={totalCurrency}
                totalAmount={totalAmount}
                sellerPayout={
                  sellerPayoutMetadata && showSellerPayout
                    ? {
                        paymentCaptured: sellerPayoutMetadata.paymentCaptured,
                        escrowState: sellerPayoutMetadata.escrowState,
                        releaseEligibility: sellerPayoutMetadata.releaseEligibility,
                        payoutStatus: sellerPayoutMetadata.payoutStatus,
                        estimatedPayoutDate: sellerPayoutModel?.estimatedPayoutDate,
                        payoutDestinationMask: sellerPayoutModel?.payoutDestinationMask,
                      }
                    : null
                }
              />

              <DisputeActionsCard
                disputeReason={disputeReason}
                submitting={submitting}
                canConfirmDelivery={canConfirmDelivery}
                releaseCountdownText={releaseCountdownText}
                onChangeReason={setDisputeReason}
                onConfirmDelivery={() => void handleConfirmDelivery()}
                onOpenDispute={() => void handleOpenDispute()}
              />

              <button
                type="button"
                onClick={() => reference && navigateToOrderDispute(reference)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm font-bold text-zinc-900 hover:bg-zinc-50"
              >
                Go to dispute form
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-6 text-zinc-600">
            No tracking record yet. Start from the cart or checkout flow and the latest order will appear here.
          </div>
        )}
      </div>
    </div>
  );
}
