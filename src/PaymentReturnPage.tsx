import { useEffect, useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ChevronLeft,
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
  const [fallbackListingId, setFallbackListingId] = useState<string | null>(null);

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

    const buyerPayments = readBuyerPayments() as BuyerPaymentRecord[];
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

    void (async () => {
      try {
        const result = (await apiFetch(
          `/api/payments/paychangu/verify/${encodeURIComponent(txRef)}`,
        )) as VerifyResult;

        if (!mounted) return;

        const normalizedStatus = String(result.status ?? "").trim().toLowerCase();
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
        const matchingPayment = buyerPayments.find(
          (record) =>
            record.reference === reference ||
            record.txRef === reference ||
            record.reference === txRef ||
            record.txRef === txRef,
        );

        const resolvedOrderId = result.orderId ?? matchingPayment?.orderId ?? null;

        setFallbackListingId(
          matchingPayment?.listingId ?? listingIdFromReturn ?? null,
        );

        updateBuyerPaymentStatus(reference, {
          status: "captured",
          txRef: reference,
          orderId: resolvedOrderId,
        });

        const purchasedListingIds = matchingPayment?.listingIds?.length
          ? matchingPayment.listingIds
          : matchingPayment?.listingId
            ? [matchingPayment.listingId]
            : [];

        purchasedListingIds.forEach((listingId) => removeBuyerCartItem(listingId));

        setOrderId(resolvedOrderId);
        setStatus("success");

        window.setTimeout(() => {
          navigateToPath(`/orders/${encodeURIComponent(reference)}`, {
            replace: true,
          });
        }, 900);
      } catch (err: unknown) {
        if (!mounted) return;
        setErrorMessage(err instanceof Error ? err.message : "Verification failed.");
        setStatus("failed");
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-900">
      <div className="mx-auto flex w-full max-w-lg flex-col items-center justify-center rounded-3xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
        {status === "loading" && (
          <>
            <Loader2 className="mb-4 h-10 w-10 animate-spin text-zinc-900" />
            <h1 className="text-2xl font-extrabold tracking-tight">
              Verifying payment…
            </h1>
            <p className="mt-3 text-sm text-zinc-600">
              Please wait while we confirm your payment.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="mb-4 h-10 w-10 text-emerald-600" />
            <h1 className="text-2xl font-extrabold tracking-tight">
              Payment successful!
            </h1>
            <p className="mt-3 text-sm text-zinc-600">
              Your payment has been confirmed.
            </p>

            {orderId ? (
              <p className="mt-4 rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-800">
                Order ID: {orderId}
              </p>
            ) : null}

            <p className="mt-4 text-sm text-zinc-600">
              Redirecting to your order tracking page…
            </p>

            <div className="mt-6 flex w-full flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() =>
                  navigateToPath(buildListingDetailsPath(fallbackListingId))
                }
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-zinc-200 px-5 py-3 text-sm font-extrabold text-zinc-900 transition-colors hover:bg-zinc-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Back to listing
              </button>
            </div>
          </>
        )}

        {status === "failed" && (
          <>
            <AlertTriangle className="mb-4 h-10 w-10 text-amber-600" />
            <h1 className="text-2xl font-extrabold tracking-tight">
              Payment failed
            </h1>
            <p className="mt-3 text-sm text-zinc-600">
              {errorMessage ??
                "We could not verify your payment. Please try again or contact support."}
            </p>

            <div className="mt-6 flex w-full flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() =>
                  navigateToPath(buildListingDetailsPath(fallbackListingId))
                }
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-zinc-200 px-5 py-3 text-sm font-extrabold text-zinc-900 transition-colors hover:bg-zinc-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Go back
              </button>
              <button
                type="button"
                onClick={() => navigateToPath(EXPLORE_PATH)}
                className="flex-1 rounded-2xl bg-zinc-100 px-5 py-3 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-200"
              >
                Browse listings
              </button>
            </div>
          </>
        )}

        {status === "cancelled" && (
          <>
            <AlertTriangle className="mb-4 h-10 w-10 text-zinc-500" />
            <h1 className="text-2xl font-extrabold tracking-tight">
              Payment cancelled
            </h1>
            <p className="mt-3 text-sm text-zinc-600">
              You cancelled the payment. Your order was not charged.
            </p>

            <div className="mt-6 flex w-full flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() =>
                  navigateToPath(buildListingDetailsPath(fallbackListingId))
                }
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-zinc-200 px-5 py-3 text-sm font-extrabold text-zinc-900 transition-colors hover:bg-zinc-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Go back
              </button>
              <button
                type="button"
                onClick={() => navigateToPath(EXPLORE_PATH)}
                className="flex-1 rounded-2xl bg-zinc-100 px-5 py-3 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-200"
              >
                Browse listings
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
