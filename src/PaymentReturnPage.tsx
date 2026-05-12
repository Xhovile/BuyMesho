import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, Loader2, ChevronLeft } from "lucide-react";
import { EXPLORE_PATH, LISTING_PATH, navigateToPath } from "./lib/appNavigation";
import { apiFetch } from "./lib/api";
import { readBuyerPayments, removeBuyerCartItem, updateBuyerPaymentStatus } from "./lib/buyerState";

type ReturnStatus = "loading" | "success" | "failed" | "cancelled";

interface VerifyResult {
  verified: boolean;
  reference?: string;
  status?: string;
  orderId?: string;
}

const SUCCESS_PAYMENT_STATUSES = new Set([
  'success',
  'successful',
  'succeeded',
  'completed',
  'paid',
  'captured',
  'processed',
  'approved',
]);

const buildListingDetailsPath = (listingId: string | null) =>
  listingId ? `${LISTING_PATH}?listing=${encodeURIComponent(listingId)}&image=0` : EXPLORE_PATH;

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

    const buyerPayments = readBuyerPayments();

    const latestPendingPayment = buyerPayments
      .filter((payment) => payment.status === "pending")
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

    const txRef = txRefFromUrl
      ?? latestPendingPayment?.txRef
      ?? latestPendingPayment?.reference
      ?? null;

    if (!txRef) {
      setStatus("failed");
      setErrorMessage("No payment reference could be recovered for verification.");
      return;
    }

    let mounted = true;

    void (async () => {
      try {
        const result = (await apiFetch(`/api/payments/paychangu/verify/${encodeURIComponent(txRef)}`)) as VerifyResult;

        if (!mounted) return;

        const normalizedStatus = String(result.status ?? '').trim().toLowerCase();
        const isSuccessful = result.verified || SUCCESS_PAYMENT_STATUSES.has(normalizedStatus);

        if (isSuccessful) {
          const reference = result.reference ?? txRef;

          const orderIdFromLegacyShape = (result as unknown as Record<string, unknown>).order_id;

          const resolvedOrderId =
            result.orderId ??
            (typeof orderIdFromLegacyShape === "string" ? orderIdFromLegacyShape : null);

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

          setTimeout(() => {
            navigateToPath(`/orders/${encodeURIComponent(reference)}`, { replace: true });
          }, 900);
        } else {
          setErrorMessage(result.status ? `Payment status: ${result.status}` : "The payment could not be verified.");
          setStatus("failed");
        }
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
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:py-14">
        {status === "loading" && (
          <div className="flex flex-col items-center gap-4 py-14 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-zinc-500" />
            <h1 className="text-xl font-extrabold text-zinc-900">Verifying payment…</h1>
            <p className="text-sm text-zinc-500">Please wait while we confirm your payment.</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <CheckCircle2 className="h-16 w-16 text-emerald-500" />
            <h1 className="text-2xl font-black text-zinc-900">Payment successful!</h1>
            <p className="text-sm text-zinc-600 leading-6">Your payment has been confirmed.</p>
            {orderId ? (
              <p className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-mono text-zinc-600">
                Order ID: {orderId}
              </p>
            ) : null}
            <p className="text-xs text-zinc-400">Redirecting to your order tracking page…</p>
            <button type="button" onClick={() => navigateToPath(buildListingDetailsPath(fallbackListingId))} className="mt-2 rounded-2xl bg-zinc-900 px-6 py-3 text-sm font-extrabold text-white hover:bg-zinc-800 transition-colors">Back to listing</button>
          </div>
        )}

        {status === "failed" && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <AlertTriangle className="h-14 w-14 text-red-500" />
            <h1 className="text-2xl font-black text-zinc-900">Payment failed</h1>
            <p className="text-sm text-zinc-600 leading-6">{errorMessage ?? "We could not verify your payment. Please try again or contact support."}</p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
              <button type="button" onClick={() => navigateToPath(buildListingDetailsPath(fallbackListingId))} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 px-5 py-3 text-sm font-extrabold text-zinc-900 hover:bg-zinc-50 transition-colors"><ChevronLeft className="h-4 w-4" />Go back</button>
              <button type="button" onClick={() => navigateToPath(EXPLORE_PATH)} className="rounded-2xl bg-zinc-100 px-5 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-200 transition-colors">Browse listings</button>
            </div>
          </div>
        )}

        {status === "cancelled" && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <AlertTriangle className="h-14 w-14 text-amber-500" />
            <h1 className="text-2xl font-black text-zinc-900">Payment cancelled</h1>
            <p className="text-sm text-zinc-600 leading-6">You cancelled the payment. Your order was not charged.</p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
              <button type="button" onClick={() => navigateToPath(buildListingDetailsPath(fallbackListingId))} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 px-5 py-3 text-sm font-extrabold text-zinc-900 hover:bg-zinc-50 transition-colors"><ChevronLeft className="h-4 w-4" />Go back</button>
              <button type="button" onClick={() => navigateToPath(EXPLORE_PATH)} className="rounded-2xl bg-zinc-100 px-5 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-200 transition-colors">Browse listings</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
