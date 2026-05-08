import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, Loader2, ChevronLeft } from "lucide-react";
import { EXPLORE_PATH, navigateToPath } from "./lib/appNavigation";
import { apiFetch } from "./lib/api";
import { updateBuyerPaymentStatus } from "./lib/buyerState";

type ReturnStatus = "loading" | "success" | "failed" | "cancelled";

interface VerifyResult {
  verified: boolean;
  reference?: string;
  status?: string;
  orderId?: string;
}

export default function PaymentReturnPage() {
  const [status, setStatus] = useState<ReturnStatus>("loading");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const txRef = params.get("tx_ref") ?? params.get("txRef");
    const cancelled = params.get("cancelled");

    if (cancelled === "1") {
      if (txRef) {
        updateBuyerPaymentStatus(txRef, { status: "cancelled", txRef });
      }
      setStatus("cancelled");
      return;
    }

    if (!txRef) {
      setStatus("failed");
      setErrorMessage("No payment reference found in the URL.");
      return;
    }

    let mounted = true;
    void (async () => {
      try {
        const result = (await apiFetch(`/api/payments/paychangu/verify/${encodeURIComponent(txRef)}`)) as VerifyResult;

        if (!mounted) return;

        if (result.verified) {
          if (result.reference || txRef) {
            updateBuyerPaymentStatus(result.reference ?? txRef, {
              status: "captured",
              orderId: result.orderId ?? null,
              txRef,
            });
          }
          setOrderId(result.orderId ?? null);
          setStatus("success");
        } else {
          updateBuyerPaymentStatus(txRef, { status: "failed", txRef });
          setErrorMessage(result.status ? `Payment status: ${result.status}` : "The payment could not be verified.");
          setStatus("failed");
        }
      } catch (err: unknown) {
        if (!mounted) return;
        updateBuyerPaymentStatus(txRef, { status: "failed", txRef });
        setErrorMessage(err instanceof Error ? err.message : "Verification failed.");
        setStatus("failed");
      }
    })();

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
            <h1 className="text-xl font-extrabold text-zinc-900">Verifying payment…</h1>
            <p className="text-sm text-zinc-500">Please wait while we confirm your payment.</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <CheckCircle2 className="h-16 w-16 text-emerald-500" />
            <h1 className="text-2xl font-black text-zinc-900">Payment successful!</h1>
            <p className="text-sm text-zinc-600 leading-6">Your payment has been confirmed and your order is now held securely in escrow. The seller has been notified.</p>
            {orderId && <p className="rounded-xl bg-zinc-50 px-4 py-2 text-xs font-mono text-zinc-400">Order: {orderId}</p>}
            <button type="button" onClick={() => navigateToPath(EXPLORE_PATH)} className="mt-2 w-full rounded-2xl bg-zinc-900 py-3 text-sm font-extrabold text-white hover:bg-zinc-800 transition-colors">Continue shopping</button>
          </div>
        )}

        {status === "failed" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertTriangle className="h-14 w-14 text-red-500" />
            <h1 className="text-2xl font-black text-zinc-900">Payment failed</h1>
            <p className="text-sm text-zinc-600 leading-6">{errorMessage ?? "We could not verify your payment. Please try again or contact support."}</p>
            <button type="button" onClick={() => window.history.back()} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 py-3 text-sm font-extrabold text-zinc-900 hover:bg-zinc-50 transition-colors"><ChevronLeft className="h-4 w-4" />Go back</button>
            <button type="button" onClick={() => navigateToPath(EXPLORE_PATH)} className="w-full rounded-2xl bg-zinc-100 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-200 transition-colors">Browse listings</button>
          </div>
        )}

        {status === "cancelled" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertTriangle className="h-14 w-14 text-amber-500" />
            <h1 className="text-2xl font-black text-zinc-900">Payment cancelled</h1>
            <p className="text-sm text-zinc-600 leading-6">You cancelled the payment. Your order was not charged.</p>
            <button type="button" onClick={() => window.history.back()} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 py-3 text-sm font-extrabold text-zinc-900 hover:bg-zinc-50 transition-colors"><ChevronLeft className="h-4 w-4" />Go back</button>
            <button type="button" onClick={() => navigateToPath(EXPLORE_PATH)} className="w-full rounded-2xl bg-zinc-100 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-200 transition-colors">Browse listings</button>
          </div>
        )}
      </div>
    </div>
  );
}
