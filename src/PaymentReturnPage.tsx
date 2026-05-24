import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, Loader2, ChevronLeft } from "lucide-react";
import { EXPLORE_PATH, navigateToPath } from "./lib/appNavigation";
import { apiFetch } from "./lib/api";

type ReturnStatus = "loading" | "success" | "failed" | "cancelled";

interface PublicStatusResponse {
  reference?: string;
  orderId?: string;
  orderStatus?: string;
  paymentStatus?: string | null;
  paymentVerified?: boolean;
  escrowStatus?: string | null;
}

export default function PaymentReturnPage() {
  const [status, setStatus] = useState<ReturnStatus>("loading");
  const [reference, setReference] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const txRef = params.get("tx_ref") ?? params.get("txRef");
    const cancelled = params.get("cancelled");

    if (cancelled === "1") {
      setStatus("cancelled");
      return;
    }

    if (!txRef) {
      setStatus("failed");
      setErrorMessage("No payment reference found in the URL.");
      return;
    }

    setReference(txRef);

    let mounted = true;
    let attempts = 0;

    const pollStatus = async () => {
      try {
        const result = (await apiFetch(
          `/api/payments/public-status/${encodeURIComponent(txRef)}`,
        )) as PublicStatusResponse;

        if (!mounted) return;

        const paymentVerified = Boolean(result.paymentVerified);
        const orderStatus = String(result.orderStatus ?? "").toLowerCase();
        const paymentStatus = String(result.paymentStatus ?? "").toLowerCase();

        const isSuccessful =
          paymentVerified ||
          paymentStatus === "captured" ||
          orderStatus === "paid" ||
          orderStatus === "processing";

        if (isSuccessful) {
          setOrderId(result.orderId ?? null);
          setStatus("success");

          window.setTimeout(() => {
            navigateToPath(`/orders/${encodeURIComponent(txRef)}`, {
              replace: true,
            });
          }, 1200);

          return;
        }

        const isFailed =
          paymentStatus === "failed" ||
          paymentStatus === "cancelled" ||
          paymentStatus === "canceled";

        if (isFailed) {
          setErrorMessage(`Payment status: ${paymentStatus}`);
          setStatus("failed");
          return;
        }

        attempts += 1;

        if (attempts >= 8) {
          setStatus("success");

          window.setTimeout(() => {
            navigateToPath(`/orders/${encodeURIComponent(txRef)}`, {
              replace: true,
            });
          }, 1200);

          return;
        }

        window.setTimeout(pollStatus, 2000);
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

        window.setTimeout(pollStatus, 2000);
      }
    };

    void pollStatus();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-lg">
        {status === "loading" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-zinc-500" />
            <h1 className="text-xl font-extrabold text-zinc-900">Finalizing payment…</h1>
            <p className="text-sm text-zinc-500">
              We are confirming your order and syncing payment status.
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
              {errorMessage ?? "We could not recover your payment status."}
            </p>
            <button
              type="button"
              onClick={() => window.history.back()}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 py-3 text-sm font-extrabold text-zinc-900 hover:bg-zinc-50 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Go back
            </button>
            <button
              type="button"
              onClick={() => navigateToPath(EXPLORE_PATH)}
              className="w-full rounded-2xl bg-zinc-100 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-200 transition-colors"
            >
              Browse listings
            </button>
          </div>
        )}

        {status === "cancelled" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertTriangle className="h-14 w-14 text-amber-500" />
            <h1 className="text-2xl font-black text-zinc-900">Payment cancelled</h1>
            <p className="text-sm text-zinc-600 leading-6">
              You cancelled the payment. Your order was not charged.
            </p>
            <button
              type="button"
              onClick={() => window.history.back()}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 py-3 text-sm font-extrabold text-zinc-900 hover:bg-zinc-50 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Go back
            </button>
            <button
              type="button"
              onClick={() => navigateToPath(EXPLORE_PATH)}
              className="w-full rounded-2xl bg-zinc-100 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-200 transition-colors"
            >
              Browse listings
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
