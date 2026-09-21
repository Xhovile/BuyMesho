import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronRight, CircleAlert, Download, Loader2, Palette, Monitor, RotateCcw, ShieldCheck } from "lucide-react";

type ServiceType = "graphic_design" | "website_development";
type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

interface ServicePayment {
  id: string;
  serviceType: ServiceType;
  customerName: string;
  customerEmail: string | null;
  description: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentReference: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CreateResponse {
  success: boolean;
  reference: string;
  checkoutUrl: string;
  servicePayment: ServicePayment;
}

interface StatusResponse {
  success: boolean;
  servicePayment: ServicePayment | null;
}

const SERVICE_LABELS: Record<ServiceType, string> = {
  graphic_design: "Graphic Design",
  website_development: "Website Development",
};

const API_BASE_URL = String(
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
    ?.VITE_BUYMESHO_API_BASE_URL ?? "",
).replace(/\/$/, "");

function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-MW", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function downloadReceipt(payment: ServicePayment) {
  const issued = new Date(payment.paidAt ?? payment.updatedAt).toLocaleString("en-MW");
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Xhovile Studio Receipt - ${escapeHtml(payment.paymentReference ?? payment.id)}</title>
<style>
body{font-family:Arial,Helvetica,sans-serif;background:#f5f5f5;margin:0;padding:40px;color:#111}
.receipt{max-width:680px;margin:auto;background:#fff;border:1px solid #ddd;padding:36px}
.brand{font-size:26px;font-weight:800;letter-spacing:.04em}.muted{color:#666}
.row{display:flex;justify-content:space-between;gap:24px;padding:12px 0;border-bottom:1px solid #eee}
.total{font-size:22px;font-weight:800}.note{margin-top:28px;padding-top:18px;border-top:1px solid #eee}
</style>
</head>
<body>
<div class="receipt">
<div class="brand">XHOVILE STUDIO</div>
<p class="muted">Payment Receipt</p>
<div class="row"><strong>Service</strong><span>${escapeHtml(SERVICE_LABELS[payment.serviceType])}</span></div>
<div class="row"><strong>Customer</strong><span>${escapeHtml(payment.customerName)}</span></div>
<div class="row"><strong>Description</strong><span>${escapeHtml(payment.description)}</span></div>
<div class="row"><strong>Reference</strong><span>${escapeHtml(payment.paymentReference ?? payment.id)}</span></div>
<div class="row"><strong>Paid</strong><span>${escapeHtml(issued)}</span></div>
<div class="row total"><strong>Amount</strong><span>${escapeHtml(formatMoney(payment.amount, payment.currency))}</span></div>
<div class="note"><p>Payment status: <strong>${escapeHtml(payment.status.toUpperCase())}</strong></p><p class="muted">Payment processing powered by BuyMesho and PayChangu.</p></div>
</div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `xhovile-studio-receipt-${payment.paymentReference ?? payment.id}.html`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function ServiceChoice({
  active,
  icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition ${
        active
          ? "border-zinc-900 bg-zinc-950 text-white shadow-lg"
          : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-400"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 rounded-xl p-2 ${
          active ? "bg-white/10 text-white" : "bg-zinc-100 text-zinc-700"
        }`}>{icon}</div>
        <div className="min-w-0">
          <p className="font-black">{title}</p>
          <p className={`mt-1 text-xs leading-5 ${
            active ? "text-zinc-300" : "text-zinc-500"
          }`}>{description}</p>
        </div>
        <div className="ml-auto pt-1">
          <div className={`h-4 w-4 rounded-full border ${
            active ? "border-white bg-white" : "border-zinc-300"
          }`} />
        </div>
      </div>
    </button>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#0a0f13] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl items-center justify-center">
        <div className="w-full">{children}</div>
      </div>
    </main>
  );
}

function PaymentForm() {
  const [serviceType, setServiceType] = useState<ServiceType>("graphic_design");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () =>
      !submitting &&
      customerName.trim().length >= 2 &&
      customerPhone.trim().length >= 7 &&
      Number(amount) > 0 &&
      description.trim().length >= 3,
    [amount, customerName, customerPhone, description, submitting],
  );

  async function submit() {
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(apiUrl("/api/public/service-payments"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceType,
          customerName,
          customerPhone,
          customerEmail,
          amount: Number(amount),
          description,
        }),
      });

      const data = (await response.json()) as Partial<CreateResponse> & { error?: string };
      if (!response.ok || !data.checkoutUrl) {
        throw new Error(data.error || "Unable to start payment.");
      }

      window.location.assign(data.checkoutUrl);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to start payment.");
      setSubmitting(false);
    }
  }

  return (
    <Shell>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#d65a63]">
            Xhovile Studio
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            Service Payment
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
            Tell us what you need, enter your payment amount, then continue to secure checkout.
          </p>
        </div>
        <div className="hidden rounded-2xl border border-white/10 bg-white/5 p-3 sm:block">
          <ShieldCheck className="h-6 w-6 text-zinc-200" />
        </div>
      </div>

      <section className="rounded-3xl border border-white/10 bg-white p-5 text-zinc-900 shadow-2xl sm:p-7">
        <div className="grid gap-3 sm:grid-cols-2">
          <ServiceChoice
            active={serviceType === "graphic_design"}
            icon={<Palette className="h-5 w-5" />}
            title="Graphic Design"
            description="Logos, posters, branding, social graphics and related design work."
            onClick={() => setServiceType("graphic_design")}
          />
          <ServiceChoice
            active={serviceType === "website_development"}
            icon={<Monitor className="h-5 w-5" />}
            title="Website Development"
            description="Business websites, landing pages and lightweight web builds."
            onClick={() => setServiceType("website_development")}
          />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-bold">Full name</span>
            <input
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none transition focus:border-zinc-900"
              placeholder="Your name"
              autoComplete="name"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold">Phone number</span>
            <input
              value={customerPhone}
              onChange={(event) => setCustomerPhone(event.target.value)}
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none transition focus:border-zinc-900"
              placeholder="e.g. 0999 123 456"
              autoComplete="tel"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-bold">Email <span className="font-normal text-zinc-400">(optional)</span></span>
            <input
              value={customerEmail}
              onChange={(event) => setCustomerEmail(event.target.value)}
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none transition focus:border-zinc-900"
              placeholder="you@example.com"
              type="email"
              autoComplete="email"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold">Amount (MWK)</span>
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, ""))}
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none transition focus:border-zinc-900"
              placeholder="25000"
              inputMode="decimal"
            />
          </label>
          <div className="flex items-end">
            <div className="w-full rounded-2xl bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
              You will choose the available payment method on PayChangu checkout.
            </div>
          </div>
          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-bold">Brief description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="min-h-28 w-full resize-y rounded-2xl border border-zinc-200 px-4 py-3 outline-none transition focus:border-zinc-900"
              placeholder={serviceType === "graphic_design" ? "e.g. Poster design for a campus event." : "e.g. One-page business website for a clothing shop."}
            />
          </label>
        </div>

        {error && (
          <div className="mt-5 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => void submit()}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 py-4 text-sm font-black text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          {submitting ? "Opening PayChangu…" : "Continue to Checkout"}
          {!submitting ? <ChevronRight className="h-5 w-5" /> : null}
        </button>

        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-zinc-400">
          <ShieldCheck className="h-4 w-4" />
          Secure checkout powered by BuyMesho + PayChangu
        </div>
      </section>
    </Shell>
  );
}

function ReceiptPage() {
  const [payment, setPayment] = useState<ServicePayment | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Confirming your payment…");

  const reference = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("ref") ?? params.get("tx_ref") ?? params.get("reference");
  }, []);

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
      <section className="rounded-3xl border border-white/10 bg-white p-6 text-zinc-900 shadow-2xl sm:p-8">
        <div className="text-center">
          {loading ? (
            <Loader2 className="mx-auto h-14 w-14 animate-spin text-zinc-500" />
          ) : payment?.status === "paid" ? (
            <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
          ) : (
            <CircleAlert className="mx-auto h-16 w-16 text-amber-500" />
          )}

          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] text-[#d65a63]">
            Xhovile Studio
          </p>
          <h1 className="mt-2 text-3xl font-black">
            {loading ? "Checking Payment" : payment?.status === "paid" ? "Payment Successful" : "Payment Status"}
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-500">{message}</p>
        </div>

        {payment && (
          <div className="mt-7 divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200">
            <div className="flex justify-between gap-6 p-4 text-sm">
              <span className="text-zinc-500">Service</span>
              <span className="font-bold">{SERVICE_LABELS[payment.serviceType]}</span>
            </div>
            <div className="flex justify-between gap-6 p-4 text-sm">
              <span className="text-zinc-500">Customer</span>
              <span className="font-bold">{payment.customerName}</span>
            </div>
            <div className="flex justify-between gap-6 p-4 text-sm">
              <span className="text-zinc-500">Reference</span>
              <span className="break-all text-right font-mono text-xs font-bold">{payment.paymentReference}</span>
            </div>
            <div className="flex justify-between gap-6 p-4 text-sm">
              <span className="text-zinc-500">Amount</span>
              <span className="font-black">{formatMoney(payment.amount, payment.currency)}</span>
            </div>
            <div className="p-4 text-sm">
              <span className="text-zinc-500">Description</span>
              <p className="mt-1 font-medium text-zinc-800">{payment.description}</p>
            </div>
          </div>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {payment?.status === "paid" && (
            <button
              type="button"
              onClick={() => downloadReceipt(payment)}
              className="flex items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 py-3.5 text-sm font-black text-white hover:bg-zinc-800"
            >
              <Download className="h-4 w-4" />
              Download Receipt
            </button>
          )}
          <button
            type="button"
            onClick={() => window.location.assign("/Services/XhovileStudio")}
            className="flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 px-5 py-3.5 text-sm font-black text-zinc-900 hover:bg-zinc-50"
          >
            <RotateCcw className="h-4 w-4" />
            Start Another Payment
          </button>
        </div>

        <p className="mt-5 text-center text-xs text-zinc-400">
          Keep your payment reference for your records.
        </p>
      </section>
    </Shell>
  );
}

export default function XhovileStudioPaymentPage() {
  const isReceipt = window.location.pathname === "/Services/XhovileStudio/receipt";
  return isReceipt ? <ReceiptPage /> : <PaymentForm />;
}
