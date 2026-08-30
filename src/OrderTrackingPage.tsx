import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, Truck } from "lucide-react";

import {
  navigateToOrderDispute,
  navigateToPath,
} from "./lib/appNavigation";
import {
  fetchOrderByReference,
  openOrderDispute,
  releaseOrderEscrow,
  type OrderBundle,
} from "./lib/orderApi";
import { getOrderFlowType } from "./lib/orderFlow";
import EscrowProtectionCard from "./components/orders/EscrowProtectionCard";
import OrderProgressTracker from "./components/orders/OrderProgressTracker";
import OrderDetailsCard from "./components/orders/OrderDetailsCard";
import DisputeActionsCard from "./components/orders/DisputeActionsCard";
import EventTicketTrackingPage from "./EventTicketTrackingPage";
import { useAccountProfile } from "./hooks/useAccountProfile";
import { useRequireVerifiedUser } from "./hooks/useRequireVerifiedUser";

type TrackingPageProps = {
  reference?: string | null;
  initialBundle?: OrderBundle | null;
};

const listingStages = [
  "Order placed",
  "Payment pending",
  "Payment confirmed",
  "Funds in escrow",
  "Delivered",
  "Funds released",
];

function getReferenceFromUrl() {
  const segments = window.location.pathname.split("/").filter(Boolean);
  return segments[1] ? decodeURIComponent(segments[1]) : null;
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
        <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-600 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
          Loading order details…
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-4 py-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </div>
      </div>
    </div>
  );
}

export default function OrderTrackingPage({ reference: referenceProp = null, initialBundle = null }: TrackingPageProps = {}) {
  const ready = useRequireVerifiedUser();
  if (!ready) return null;
  return <OrderTrackingRouteContent reference={referenceProp ?? getReferenceFromUrl()} initialBundle={initialBundle} />;
}

function OrderTrackingRouteContent({ reference, initialBundle = null }: TrackingPageProps) {
  const [bundle, setBundle] = useState<OrderBundle | null>(initialBundle);
  const [loading, setLoading] = useState(() => !initialBundle);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const trimmed = reference?.trim();
    if (!trimmed) {
      setError("No order reference found in URL.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchOrderByReference(trimmed);
      setBundle(data);
    } catch (err) {
      setBundle(null);
      setError(err instanceof Error ? err.message : "Failed to load order details.");
    } finally {
      setLoading(false);
    }
  }, [reference]);

  useEffect(() => {
    if (initialBundle) {
      setBundle(initialBundle);
      setLoading(false);
      return;
    }

    void reload();
  }, [initialBundle, reload]);

  const flowType = useMemo(() => getOrderFlowType(bundle), [bundle]);

  if (loading) return <LoadingState />;
  if (error && !bundle) return <ErrorState message={error} />;
  if (bundle && flowType === "event_only") {
    return <EventTicketTrackingPage reference={reference ?? ""} initialBundle={bundle} />;
  }

  return <BuyerOrderTrackingContent reference={reference ?? null} initialBundle={bundle} />;
}

function BuyerOrderTrackingContent({ reference, initialBundle = null }: TrackingPageProps) {
  const { firebaseUser, profile } = useAccountProfile();
  const [bundle, setBundle] = useState<OrderBundle | null>(initialBundle);
  const [loading, setLoading] = useState(() => !initialBundle);
  const [error, setError] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [submitting, setSubmitting] = useState<"release" | "dispute" | null>(null);

  const effectiveReference = reference ?? getReferenceFromUrl();

  const reload = useCallback(async () => {
    const trimmed = effectiveReference?.trim();
    if (!trimmed) {
      setError("No order reference found in URL.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchOrderByReference(trimmed);
      setBundle(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load order details.");
      setBundle(null);
    } finally {
      setLoading(false);
    }
  }, [effectiveReference]);

  useEffect(() => {
    if (initialBundle) {
      setBundle(initialBundle);
      setLoading(false);
      return;
    }

    void reload();
  }, [initialBundle, reload]);

  const order = bundle?.order ?? null;
  const flowType = useMemo(() => getOrderFlowType(bundle), [bundle]);
  const viewerUid = firebaseUser?.uid ?? profile?.uid ?? null;
  const orderSellerUid =
    typeof order?.sellerId === "string"
      ? order.sellerId
      : typeof order?.seller_id === "string"
        ? order.seller_id
        : null;
  const isSellerViewer = !!viewerUid && !!orderSellerUid && viewerUid === orderSellerUid;

  const paymentStatus =
    typeof bundle?.payment?.status === "string"
      ? String(bundle.payment.status)
      : order?.status ?? "pending";
  const escrowState =
    typeof bundle?.escrow?.state === "string"
      ? String(bundle.escrow.state)
      : "initiated";

  const firstItem = order?.items?.[0] ?? null;
  const firstItemTitle = firstItem?.title ?? "—";
  const mixedHasEvent = flowType === "mixed_checkout";
  const firstListingId = order?.items?.find((item) => item?.listingId)?.listingId ?? null;

  const activeIndex = useMemo(() => {
    if (!order) return 0;

    if (escrowState === "released" || order.status === "fulfilled" || order.status === "closed") {
      return 5;
    }

    if (order.status === "in_escrow" || escrowState === "funded" || escrowState === "held" || escrowState === "disputed") {
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

  const totalAmount = Number(order?.total?.amount ?? 0);
  const totalCurrency = String(order?.total?.currency ?? "MWK");

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
      const message = err instanceof Error ? err.message : "";
      const isClientTimeout = /request timed out after \d+ms/i.test(message);

      if (!isClientTimeout) {
        setError(message || "Failed to confirm delivery.");
        setSubmitting(null);
        return;
      }

      // The release request was already sent. The client timeout only means
      // it stopped waiting for the HTTP response, so verify persisted state
      // before presenting a release failure.
      const maxChecks = 5;
      const retryDelayMs = 1500;

      for (let check = 0; check < maxChecks; check += 1) {
        try {
          const trimmedReference = effectiveReference?.trim();
          if (!trimmedReference) break;

          const latest = await fetchOrderByReference(trimmedReference);
          setBundle(latest);

          const latestEscrowState = String(
            latest.escrow?.state ?? latest.escrow?.status ?? "",
          )
            .trim()
            .toLowerCase();
          const latestOrderStatus = String(latest.order?.status ?? "")
            .trim()
            .toLowerCase();

          if (
            latestEscrowState === "released" ||
            latestOrderStatus === "fulfilled" ||
            latestOrderStatus === "closed"
          ) {
            setError(null);
            return;
          }
        } catch {
          // Keep the release UI active while status verification is retried.
        }

        if (check < maxChecks - 1) {
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        }
      }

      setError(
        "Escrow release was submitted, but its final status could not be confirmed yet. Please check the order status before trying again.",
      );
    } finally {
      setSubmitting(null);
    }
  };

  const handleOpenDisputeForm = async () => {
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
        <div className="mt-8 border-b border-zinc-200 pb-6">
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-900">
              <Truck className="h-5 w-5" />
            </div>

            <div className="max-w-3xl space-y-2">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">BUYER ORDER TRACKING</p>
              <h1 className="text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">ORDER STATUS OVERVIEW</h1>
              <p className="text-sm leading-7 text-zinc-600 sm:text-base">Monitor payment, escrow, and delivery progress in one place.</p>
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

              {mixedHasEvent ? (
                <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 sm:p-6">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Linked ticket</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-black tracking-tight text-zinc-950">This order includes an event ticket</h2>
                      <p className="mt-1 text-sm text-zinc-600">Open Tickets for ticket details.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigateToPath(`/tickets?reference=${encodeURIComponent(effectiveReference ?? "")}`)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-zinc-900 bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open tickets
                    </button>
                  </div>
                </div>
              ) : null}

              <OrderProgressTracker stages={listingStages} activeIndex={activeIndex} />
            </div>

            <div className="space-y-6">
              <OrderDetailsCard
                reference={effectiveReference}
                firstItemTitle={firstItemTitle}
                items={order.items}
                paymentStatus={paymentStatus}
                orderStatus={order.status}
                escrowState={escrowState}
                orderId={order.id}
                totalCurrency={totalCurrency}
                totalAmount={totalAmount}
                sellerPayout={null}
              />

              <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 sm:p-6">
                <h2 className="text-lg font-black text-zinc-950">Delivery and dispute</h2>
                <div className="mt-4">
                  <DisputeActionsCard
                    disputeReason={disputeReason}
                    submitting={submitting}
                    canConfirmDelivery={canConfirmDelivery}
                    onChangeReason={setDisputeReason}
                    onConfirmDelivery={handleConfirmDelivery}
                    onOpenDispute={handleOpenDisputeForm}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
