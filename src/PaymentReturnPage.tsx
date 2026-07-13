import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import {
  EXPLORE_PATH,
  LISTING_PATH,
  navigateToPath,
} from "./lib/appNavigation";
import { apiFetch } from "./lib/api";
import {
  readBuyerPayments,
  subtractBuyerCartItemQuantities,
  updateBuyerPaymentStatus,
} from "./lib/buyerState";

type ReturnStatus = "loading" | "success" | "failed" | "cancelled";

interface PublicStatusResponse {
  reference?: string;
  orderId?: string;
  orderStatus?: string;
  paymentStatus?: string | null;
  paymentVerified?: boolean;
  escrowStatus?: string | null;
}

interface BuyerPaymentRecord {
  status?: string;
  updatedAt?: string;
  txRef?: string | null;
  reference?: string | null;
  listingId?: string | null;
  listingIds?: string[];
  checkoutItems?: Array<{ listingId: string; quantity: number }>;
  orderId?: string | null;
  paymentId?: string | null;
}

const buildListingDetailsPath = (listingId: string | null) =>
  listingId
    ? `${LISTING_PATH}?listing=${encodeURIComponent(listingId)}&image=0`
    : EXPLORE_PATH;

const normalizeStatus = (value: string | null | undefined) =>
  String(value ?? "").trim().toLowerCase();

const getPurchasedListingItems = (
  payment: BuyerPaymentRecord | null,
): Array<{ listingId: string; quantity: number }> => {
  if (!payment) return [];
  if (payment.checkoutItems?.length) {
    return payment.checkoutItems
      .map((item) => ({ listingId: String(item.listingId), quantity: Math.max(0, Math.floor(Number(item.quantity))) }))
      .filter((item) => item.listingId && item.quantity > 0);
  }
  if (payment.listingIds?.length && payment.listingIds[0]) {
    return [{ listingId: String(payment.listingIds[0]), quantity: 1 }];
  }
  return payment.listingId ? [{ listingId: String(payment.listingId), quantity: 1 }] : [];
};

export default function PaymentReturnPage() {
  const [status, setStatus] = useState<ReturnStatus>("loading");
  const [reference, setReference] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fallbackListingId, setFallbackListingId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const txRefFromUrl =
      params.get("tx_ref") ?? params.get("txRef") ?? params.get("reference");
    const cancelled = params.get("cancelled");
    const paymentStatusFromUrl = normalizeStatus(
      params.get("payment_status") ?? params.get("paymentStatus") ?? params.get("status"),
    );
    const listingIdFromReturn = params.get("listingId");

    setFallbackListingId(listingIdFromReturn);

    if (
      cancelled === "1" ||
      paymentStatusFromUrl === "cancelled" ||
      paymentStatusFromUrl === "canceled"
    ) {
      setStatus("cancelled");
      return;
    }

    const rawPayments = readBuyerPayments();
    const buyerPayments = Array.isArray(rawPayments)
      ? (rawPayments as BuyerPaymentRecord[])
      : [];

    const latestPendingPayment = buyerPayments
      .filter((payment) => payment.status === "pending")
      .sort(
        (a, b) =>
          new Date(b.updatedAt ?? 0).getTime() -
          new Date(a.updatedAt ?? 0).getTime(),
      )[0] ?? null;

    const txRef = txRefFromUrl?.trim() || null;

    if (!txRef) {
      if (latestPendingPayment?.txRef || latestPendingPayment?.reference) {
        updateBuyerPaymentStatus(
          String(latestPendingPayment.txRef ?? latestPendingPayment.reference),
          {
            status: "cancelled",
            txRef: String(latestPendingPayment.txRef ?? latestPendingPayment.reference),
          },
        );
      }

      setStatus("failed");
      setErrorMessage(
        "No completed payment was detected for this session. You can go back to the app and try again.",
      );
      return;
    }

    setReference(txRef);

    let mounted = true;
    let attempts = 0;
    let timer: number | null = null;

    const pollStatus = async () => {
      try {
        const result = (await apiFetch(
          `/api/payments/public-status/${encodeURIComponent(txRef)}`,
        )) as PublicStatusResponse;

        if (!mounted) return;

        const paymentVerified = Boolean(result.paymentVerified);
        const orderStatus = normalizeStatus(result.orderStatus);
        const paymentStatus = normalizeStatus(result.paymentStatus);

        const isSuccessful =
          paymentVerified ||
          paymentStatus === "captured" ||
          paymentStatus === "paid" ||
          orderStatus === "paid" ||
          orderStatus === "processing";

        if (isSuccessful) {
          const matchedPayment =
            buyerPayments.find(
              (payment) => payment.txRef === txRef || payment.reference === txRef,
            ) ?? latestPendingPayment;

          if (matchedPayment) {
            const purchasedItems = getPurchasedListingItems(matchedPayment);
            updateBuyerPaymentStatus(matchedPayment.reference || txRef, {
              status: "captured",
              txRef,
              orderId: result.orderId ?? matchedPayment.orderId ?? null,
              paymentId: matchedPayment.paymentId,
            });
            subtractBuyerCartItemQuantities(purchasedItems);
          }

          setOrderId(result.orderId ?? null);
          setStatus("success");

          timer = window.setTimeout(() => {
            navigateToPath(`/orders/${encodeURIComponent(txRef)}`, {
              replace: true,
            });
          }, 1200);

          return;
        }

        const isFailed =
          paymentStatus === "failed" ||
          paymentStatus === "cancelled" ||
          paymentStatus === "canceled" ||
          paymentStatus === "expired" ||
          orderStatus === "failed" ||
          orderStatus === "cancelled" ||
          orderStatus === "canceled";

        if (isFailed) {
          setErrorMessage(`Payment status: ${paymentStatus || orderStatus}`);
          setStatus("failed");
          return;
        }

        attempts += 1;

        if (attempts >= 8) {
          setErrorMessage(
            "We could not confirm a completed payment for this session. Your order was not marked as paid.",
          );
          setStatus("failed");
          return;
        }

        timer = window.setTimeout(pollStatus, 2000);
      } catch (err: unknown) {
        if (!mounted) return;

        attempts += 1;

        if (attempts >= 8) {
          setErrorMessage(
            err instanceof Error ? err.message : "Failed to recover payment status.",
          );
          setStatus("failed");
          return;
        }

        timer = window.setTimeout(pollStatus, 2000);
      }
    };

    void pollStatus();

    return () => {
      mounted = false;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  return (
    <div className="min-h-screen w-full bg-white text-zinc-900">
      <div className="w-full px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        {status === "loading" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-zinc-500" />
            <h1 className="text-xl font-extrabold text-zinc-900">Finalizing payment…</h1>
            <p className="text-sm text-zinc-500">
              We are confirming your order
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <CheckCircle2 className="h-16 w-16 text-emerald-500" />
            <h1 className="text-2xl font-black text-zinc-900">Payment received!</h1>
            <p className="text-sm text-zinc-600 leading-6">
              Your payment was received successfully. Opening your order tracking page.
            </p>

            {reference && (
              <p className="rounded-xl bg-zinc-50 px-4 py-2 text-xs font-mono text-zinc-400">
                Ref: {reference}
              </p>
            )}

            {orderId && (
              <p className="rounded-xl bg-zinc-50 px-4 py-2 text-xs font-mono text-zinc-400">
                Order: {orderId}
              </p>
            )}

            <button
              type="button"
              onClick={() =>
                reference
                  ? navigateToPath(`/orders/${encodeURIComponent(reference)}`)
                  : navigateToPath(EXPLORE_PATH)
              }
              className="mt-2 w-full rounded-2xl bg-zinc-900 py-3 text-sm font-extrabold text-white hover:bg-zinc-800 transition-colors"
            >
              Open order tracking
            </button>
          </div>
        )}

        {status === "failed" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertTriangle className="h-14 w-14 text-red-500" />
            <h1 className="text-2xl font-black text-zinc-900">Payment status unavailable</h1>
            <p className="text-sm text-zinc-600 leading-6">
              {errorMessage ?? "We could not verify your payment status. Please try again or contact support!"}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  navigateToPath(buildListingDetailsPath(fallbackListingId))
                }
                className="inline-flex items-center justify-center gap-2 bg-zinc-100 px-5 py-3 text-sm font-extrabold text-zinc-900 transition-colors hover:bg-zinc-200"
              >
                <ChevronLeft className="h-4 w-4" />
                Go back
              </button>

              <button
                type="button"
                onClick={() => navigateToPath(EXPLORE_PATH)}
                className="bg-transparent px-5 py-3 text-sm font-bold text-zinc-700 underline-offset-4 hover:underline"
              >
                Browse listings
              </button>
            </div>
          </div>
        )}

        {status === "cancelled" && (
          <div className="w-full py-10 sm:py-14">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                Payment cancelled
              </h1>
            </div>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
              You cancelled the payment. Your order was not charged.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  navigateToPath(buildListingDetailsPath(fallbackListingId))
                }
                className="inline-flex items-center justify-center gap-2 bg-zinc-100 px-5 py-3 text-sm font-extrabold text-zinc-900 transition-colors hover:bg-zinc-200"
              >
                <ChevronLeft className="h-4 w-4" />
                Go back
              </button>

              <button
                type="button"
                onClick={() => navigateToPath(EXPLORE_PATH)}
                className="bg-transparent px-5 py-3 text-sm font-bold text-zinc-700 underline-offset-4 hover:underline"
              >
                Browse listings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
