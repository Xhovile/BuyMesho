import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  Download,
  Loader2,
  RotateCcw,
} from "lucide-react";
import {
  SERVICE_LABELS,
  type ServicePayment,
  type StatusResponse,
  apiUrl,
  formatMoney,
} from "./config";
import { Shell } from "./shared";

async function downloadReceipt(
  payment: ServicePayment,
  setDownloading: (value: boolean) => void,
  setError: (value: string | null) => void,
) {
  const reference = payment.paymentReference ?? payment.id;
  setDownloading(true);
  setError(null);

  try {
    const response = await fetch(
      apiUrl(`/api/public/service-payments/${encodeURIComponent(reference)}/receipt.pdf`),
      { cache: "no-store" },
    );

    if (!response.ok) {
      let message = "Unable to download the receipt.";
      try {
        const data = (await response.json()) as { error?: string };
        message = data.error || message;
      } catch {
        // Keep the generic download error when the response is not JSON.
      }
      throw new Error(message);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `xhovile-studio-receipt-${reference.replace(/[^a-zA-Z0-9._-]/g, "_")}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    setError(error instanceof Error ? error.message : "Unable to download the receipt.");
  } finally {
    setDownloading(false);
  }
}


function ReceiptPage() {
  const [payment, setPayment] = useState<ServicePayment | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Confirming your payment…");
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);

  const reference = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("ref") ?? params.get("tx_ref") ?? params.get("reference");
  }, []);

  const [receiptError, setReceiptError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!reference) {
      setMessage("No payment reference was supplied.");
      setLoading(false);
      return false;
    }

    try {
      const response = await fetch(
        apiUrl(`/api/public/service-payments/${encodeURIComponent(reference)}`),
        { cache: "no-store" },
      );
      const data = (await response.json()) as StatusResponse & { error?: string };
      if (!response.ok || !data.servicePayment) {
        throw new Error(data.error || "Payment receipt could not be loaded.");
      }

      setPayment(data.servicePayment);
      if (data.servicePayment.status === "paid") {
        setMessage("Payment confirmed.");
        setLoading(false);
        return true;
      }

      if (data.servicePayment.status === "failed" || data.servicePayment.status === "refunded") {
        setMessage(`Payment status: ${data.servicePayment.status}.`);
        setLoading(false);
        return true;
      }

      setMessage("Payment is still being confirmed…");
      return false;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load payment status.");
      return false;
    }
  }, [reference]);

  useEffect(() => {
    let mounted = true;
    let attempt = 0;
    let timer: number | null = null;

    const poll = async () => {
      const complete = await load();
      if (!mounted || complete) return;

      attempt += 1;
      if (attempt >= 10) {
        setLoading(false);
        setMessage("We could not confirm the payment yet. Refresh this page in a moment.");
        return;
      }

      timer = window.setTimeout(poll, 2000);
    };

    void poll();

    return () => {
      mounted = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [load]);

  return (
    <Shell>
      <section className="rounded-[26px] border border-zinc-200 bg-[#10151a] p-5 text-white shadow-2xl sm:p-7">
        <div className="text-center">
          {loading ? (
            <Loader2 className="mx-auto h-14 w-14 animate-spin text-zinc-500" />
          ) : payment?.status === "paid" ? (
            <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
          ) : (
            <CircleAlert className="mx-auto h-16 w-16 text-amber-500" />
          )}

          <p className="mt-4 text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">Service Payment</p>
          <h1 className="mt-1 text-2xl font-black">
            {loading ? "Checking Payment" : payment?.status === "paid" ? "Payment Successful" : "Payment Status"}
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-500">{message}</p>
        </div>

        {payment ? (
          <div className="mt-6 divide-y divide-white/10 overflow-hidden rounded-2xl border border-zinc-200">
            <div className="flex justify-between gap-6 p-3.5 text-sm">
              <span className="text-zinc-500">Service</span>
              <span className="text-right font-bold text-zinc-900">{SERVICE_LABELS[payment.serviceType]}</span>
            </div>
            <div className="flex justify-between gap-6 p-3.5 text-sm">
              <span className="text-zinc-500">Customer</span>
              <span className="font-bold text-zinc-900">{payment.customerName}</span>
            </div>
            <div className="flex justify-between gap-6 p-3.5 text-sm">
              <span className="text-zinc-500">Reference</span>
              <span className="break-all text-right font-mono text-xs font-bold text-zinc-900">{payment.paymentReference}</span>
            </div>
            <div className="flex justify-between gap-6 p-3.5 text-sm">
              <span className="text-zinc-500">Amount</span>
              <span className="font-black text-zinc-950">{formatMoney(payment.amount, payment.currency)}</span>
            </div>
            <div className="p-3.5 text-sm">
              <span className="text-zinc-500">Description</span>
              <p className="mt-1 font-medium text-zinc-800">{payment.description}</p>
            </div>
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {payment?.status === "paid" ? (
            <button
              type="button"
              disabled={downloadingReceipt}
              onClick={() => void downloadReceipt(payment, setDownloadingReceipt, setReceiptError)}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#8f1528] px-5 py-3 text-sm font-black text-white hover:bg-[#7b1223] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {downloadingReceipt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {downloadingReceipt ? "Preparing PDF…" : "Download Receipt"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => window.location.assign("/Services/XhovileStudio")}
            className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 px-5 py-3 text-sm font-black text-zinc-900 hover:bg-white/5"
          >
            <RotateCcw className="h-4 w-4" />
            Start Another Payment
          </button>
        </div>

        {receiptError ? (
          <p className="mt-4 text-center text-xs text-red-600">{receiptError}</p>
        ) : null}

        <p className="mt-4 text-center text-[10px] text-zinc-500">
          Keep your payment reference for your records.
        </p>
      </section>
    </Shell>
  );
}



export default ReceiptPage;
