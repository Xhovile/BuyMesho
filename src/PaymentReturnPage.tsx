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
  removeBuyerCartItem,
  updateBuyerPaymentStatus,
} from "./lib/buyerState";

type ReturnStatus = "loading" | "success" | "failed" | "cancelled";

interface VerifyResult {
  verified: boolean;
  reference?: string;
  status?: string;
  orderId?: string;
}

interface BuyerPaymentRecord {
  status?: string;
  updatedAt?: string;
  txRef?: string | null;
  reference?: string | null;
  listingId?: string | null;
  listingIds?: string[];
  orderId?: string | null;
}

const SUCCESS_PAYMENT_STATUSES = new Set([
  "success",
  "successful",
  "succeeded",
  "completed",
  "paid",
  "captured",
  "processed",
  "approved",
]);

const buildListingDetailsPath = (listingId: string | null) =>
  listingId
    ? `${LISTING_PATH}?listing=${encodeURIComponent(listingId)}&image=0`
    : EXPLORE_PATH;

export default function PaymentReturnPage() {
  const [status, setStatus] = useState<ReturnStatus>("loading");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fallbackListingId, setFallbackListingId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const txRefFromUrl = params.get("tx_ref") ?? params.get("txRef");
    const cancelled = params.get("cancelled");
    const listingIdFromReturn = params.get("listingId");

    setFallbackListingId(listingIdFromReturn);

    if (cancelled === "1") {
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
      )[0];

    const txRef =
      txRefFromUrl ??
      latestPendingPayment?.txRef ??
      latestPendingPayment?.reference ??
      null;

    if (!txRef) {
      setStatus("failed");
      setErrorMessage("No payment reference could be recovered for verification.");
      return;
    }

    let mounted = true;
    let timer: number | undefined;

    void (async () => {
      try {
        const result = (await apiFetch(
          `/api/payments/paychangu/verify/${encodeURIComponent(txRef)}`,
        )) as VerifyResult;

        if (!mounted) return;

        const normalizedStatus = String(result.status ?? "")
          .trim()
          .toLowerCase();

        const isSuccessful =
          result.verified || SUCCESS_PAYMENT_STATUSES.has(normalizedStatus);

        if (!isSuccessful) {
          setErrorMessage(
            result.status
              ? `Payment status: ${result.status}`
              : "The payment could not be verified.",
          );
          setStatus("failed");
          return;
        }

        const reference = result.reference ?? txRef;
        const legacyOrderId = (result as unknown as Record<string, unknown>)
          .order_id;
        const resolvedOrderId =
          result.orderId ??
          (typeof legacyOrderId === "string" ? legacyOrderId : null);

        const matchingPayment = buyerPayments.find(
          (record) =>
            record.reference === reference ||
            record.txRef === reference ||
            record.reference === txRef ||
            record.txRef === txRef,
        );

        setFallbackListingId(matchingPayment?.listingId ?? listingIdFromReturn);

        updateBuyerPaymentStatus(reference, {
          status: "captured",
          txRef: reference,
          orderId: resolvedOrderId ?? matchingPayment?.orderId ?? null,
        });

        const purchasedListingIds = matchingPayment?.listingIds?.length
          ? matchingPayment.listingIds
          : matchingPayment?.listingId
            ? [matchingPayment.listingId]
            : [];

        purchasedListingIds.forEach((listingId) => removeBuyerCartItem(listingId));

        setOrderId(resolvedOrderId);
        setStatus("success");

        timer = window.setTimeout(() => {
          navigateToPath(`/orders/${encodeURIComponent(reference)}`, {
            replace: true,
          });
        }, 900);
      } catch (err: unknown) {
        if (!mounted) return;
        setErrorMessage(
          err instanceof Error ? err.message : "Verification failed.",
        );
        setStatus("failed");
      }
    })();

    return () => {
      mounted = false;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  return (
    <div className="min-h-screen w-full bg-white text-zinc-900">
      <div className="w-full px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        {status === "loading" && (
          <div className="w-full py-10 sm:py-14">
            <div className="flex items-center gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-zinc-500" />
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                Verifying payment…
              </h1>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
              Please wait while we confirm your payment.
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="w-full py-10 sm:py-14">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                Payment successful!
              </h1>
            </div>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
              Your payment has been confirmed.
            </p>

            {orderId ? (
              <p className="mt-6 font-mono text-xs text-zinc-500">
                Order ID: {orderId}
              </p>
            ) : null}

            <p className="mt-4 text-xs text-zinc-500">
              Redirecting to your order tracking page…
            </p>

            <div className="mt-8">
              <button
                type="button"
                onClick={() =>
                  navigateToPath(buildListingDetailsPath(fallbackListingId))
                }
                className="inline-flex items-center justify-center gap-2 border-0 bg-zinc-900 px-5 py-3 text-sm font-extrabold text-white transition-colors hover:bg-zinc-800"
              >
                <ChevronLeft className="h-4 w-4" />
                Back to listing
              </button>
            </div>
          </div>
        )}

        {status === "failed" && (
          <div className="w-full py-10 sm:py-14">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                Payment failed
              </h1>
            </div>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
              {errorMessage ??
                "We could not verify your payment. Please try again or contact support."}
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
