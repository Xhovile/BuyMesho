import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, CreditCard, MapPin, Ticket, Truck } from "lucide-react";
import {
  EVENTS_PATH,
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

const listingStages = [
  "Order placed",
  "Payment pending",
  "Payment confirmed",
  "Funds in escrow",
  "Delivered",
  "Funds released",
];

const eventStages = [
  "Ticket ordered",
  "Payment confirmed",
  "Ticket issued",
  "Ready for event",
  "Event day",
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

  const firstItem = order?.items?.[0] ?? null;
  const firstItemTitle = firstItem?.title ?? "—";
  const firstItemKind = firstItem?.kind ?? (firstItem?.eventId ? "event_ticket" : "listing");
  const isEventOrder = firstItemKind === "event_ticket";
  const activeStages = isEventOrder ? eventStages : listingStages;

  const activeIndex = useMemo(() => {
    if (!order) return 0;

    if (isEventOrder) {
      if (order.status === "fulfilled" || order.status === "closed") return 4;
      if (order.status === "in_escrow") return 3;
      if (order.status === "paid") return 2;
      if (order.status === "pending_payment") return 0;
      if (order.status === "refunded" || order.status === "cancelled") return 0;
      return 1;
    }

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
  }, [escrowState, isEventOrder, order]);

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
  const eventDetails = isEventOrder
    ? {
        eventDate: String((firstItem as Record<string, unknown> | null)?.eventDate ?? ""),
        startTime: String((firstItem as Record<string, unknown> | null)?.startTime ?? ""),
        venue: String((firstItem as Record<string, unknown> | null)?.venue ?? ""),
        location: String((firstItem as Record<string, unknown> | null)?.location ?? ""),
        organizerName: String((firstItem as Record<string, unknown> | null)?.organizerName ?? "Event organizer"),
      }
    : null;

  const canConfirmDelivery =
    !isEventOrder &&
    order?.status === "in_escrow" &&
    escrowState !== "released" &&
    escrowState !== "refunded" &&
    escrowState !== "closed" &&
    nowMs >= releaseAvailableAt;

  const handleBack = () => {
    if (isEventOrder && firstItem?.eventId) {
      navigateToPath(`${EVENTS_PATH}?event=${encodeURIComponent(String(firstItem.eventId))}`);
      return;
    }

    const firstListingId = firstItem?.listingId;
    if (firstListingId) {
      navigateToListingDetails(firstListingId);
      return;
    }

    navigateToPath(PAYMENTS_HUB_PATH);
  };

  const handleConfirmDelivery = async () => {
    if (!order || isEventOrder) return;

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
    if (!order || isEventOrder) return;

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
            onClick={handleBack}
            className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-800 hover:bg-zinc-50"
          >
            <ArrowLeft className="h-4 w-4" />
            {isEventOrder ? "Back to event" : "Back"}
          </button>
        </div>

        <div className="mt-8 border-b border-zinc-200 pb-6">
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-900">
              {isEventOrder ? <Ticket className="h-5 w-5" /> : <Truck className="h-5 w-5" />}
            </div>

            <div className="max-w-3xl space-y-2">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
                {isEventOrder ? "BUYER TICKET TRACKING" : "BUYER ORDER TRACKING"}
              </p>

              <h1 className="text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">
                {isEventOrder ? "TICKET STATUS OVERVIEW" : "ORDER STATUS OVERVIEW"}
              </h1>

              <p className="text-sm leading-7 text-zinc-600 sm:text-base">
                {isEventOrder
                  ? "Review your ticket status and event details in one place."
                  : "Monitor payment, escrow, and delivery progress in one place."}
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
              {isEventOrder ? (
                <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Event ticket</p>
                      <h2 className="mt-2 text-2xl font-black tracking-tight text-zinc-950">{eventDetails?.organizerName || firstItemTitle}</h2>
                      <p className="mt-2 text-sm text-zinc-600">{firstItemTitle}</p>
                    </div>
                    <div className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-white">
                      {paymentStatus}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-zinc-50 px-4 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Date</p>
                      <p className="mt-1 text-sm font-semibold text-zinc-900">{eventDetails?.eventDate || "—"}</p>
                    </div>
                    <div className="rounded-2xl bg-zinc-50 px-4 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Time</p>
                      <p className="mt-1 text-sm font-semibold text-zinc-900">{eventDetails?.startTime || "—"}</p>
                    </div>
                    <div className="rounded-2xl bg-zinc-50 px-4 py-3 sm:col-span-2">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Venue</p>
                      <p className="mt-1 text-sm font-semibold text-zinc-900">
                        {[eventDetails?.venue, eventDetails?.location].filter(Boolean).join(" • ") || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Ticket reference</p>
                    <p className="mt-1 break-all font-mono text-sm font-semibold text-zinc-900">{reference}</p>
                  </div>
                </div>
              ) : (
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
              )}

              <OrderProgressTracker stages={activeStages} activeIndex={activeIndex} />
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

              {isEventOrder ? (
                <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 sm:p-6">
                  <div className="flex items-center gap-2 text-zinc-500">
                    <CreditCard className="h-4 w-4" />
                    <p className="text-xs font-black uppercase tracking-[0.2em]">Ticket note</p>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-zinc-600">
                    This ticket uses the event page and buyer wallet instead of escrow delivery actions.
                  </p>
                  <button
                    type="button"
                    onClick={handleBack}
                    className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800"
                  >
                    <MapPin className="h-4 w-4" />
                    Open event
                  </button>
                </div>
              ) : (
                <DisputeActionsCard
                  disputeReason={disputeReason}
                  submitting={submitting}
                  canConfirmDelivery={canConfirmDelivery}
                  releaseCountdownText={releaseCountdownText}
                  onChangeReason={setDisputeReason}
                  onConfirmDelivery={() => void handleConfirmDelivery()}
                  onOpenDispute={() => void handleOpenDispute()}
                />
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
