import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Download,
  Loader2,
  Monitor,
  Palette,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";

type ServiceType = "graphic_design" | "website_development" | "both";
type PaymentMode = "deposit" | "full" | "balance";
type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

interface GraphicService {
  id: string;
  label: string;
  price: number;
}

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

const GRAPHIC_SERVICES: GraphicService[] = [
  { id: "music_artwork", label: "Music Artwork", price: 5500 },
  { id: "flyer", label: "Flyer", price: 6500 },
  { id: "wedding_card", label: "Wedding Card", price: 7500 },
  { id: "business_card", label: "Business Card", price: 7500 },
  { id: "birthday_card", label: "Birthday Card", price: 7500 },
  { id: "poster", label: "Poster", price: 9500 },
  { id: "logo_design", label: "Logo Design", price: 9500 },
  { id: "tshirt_design", label: "T-Shirt Design", price: 9500 },
  { id: "sticker_design", label: "Sticker Design", price: 9500 },
  { id: "album_cover", label: "Album Cover", price: 9500 },
  { id: "book_cover", label: "Book Cover", price: 9500 },
  { id: "banner_design", label: "Banner Design", price: 10500 },
];

const SERVICE_LABELS: Record<ServiceType, string> = {
  graphic_design: "Graphic Design",
  website_development: "Website Development",
  both: "Graphic Design + Web Development",
};

const API_BASE_URL = String(
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
    ?.VITE_BUYMESHO_API_BASE_URL ?? "",
).replace(/\/$/, "");

function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

function formatMoney(amount: number, currency = "MWK") {
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

function StudioBackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 280);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      title="Back to top"
      className="group fixed bottom-5 right-4 z-[120] flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#168cff] via-[#10151a] to-[#ff1d25] p-[1px] shadow-[0_10px_30px_rgba(0,0,0,0.45)] transition hover:-translate-y-0.5 sm:bottom-6 sm:right-6"
    >
      <span className="flex h-full w-full items-center justify-center rounded-full bg-[#10151a] text-white transition group-hover:bg-[#151b20]">
        <ArrowUp className="h-5 w-5" />
      </span>
    </button>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#0a0f13] px-3 py-5 text-white sm:px-6 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-2xl items-center justify-center sm:min-h-[calc(100vh-4rem)]">
        <div className="w-full">{children}</div>
      </div>
      <StudioBackToTop />
    </main>
  );
}

function ServiceChoice({
  active,
  color,
  icon,
  title,
  mobileTitle,
  onClick,
}: {
  active: boolean;
  color: "blue" | "red" | "split";
  icon: ReactNode;
  title: string;
  mobileTitle: string;
  onClick: () => void;
}) {
  const activeClass =
    color === "blue"
      ? "border-[#168cff] bg-[#071828] shadow-[0_0_0_1px_rgba(22,140,255,0.25),0_10px_30px_rgba(0,0,0,0.25)]"
      : color === "red"
        ? "border-[#ff1d25] bg-[#24070a] shadow-[0_0_0_1px_rgba(255,29,37,0.25),0_10px_30px_rgba(0,0,0,0.25)]"
        : "border-white bg-gradient-to-r from-[#071828] to-[#24070a] shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_10px_30px_rgba(0,0,0,0.25)]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[66px] w-full flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-2 text-center transition sm:min-h-[72px] sm:flex-row sm:items-center sm:justify-start sm:gap-3 sm:px-4 sm:text-left ${
        active
          ? activeClass
          : "border-white/10 bg-white/[0.035] text-zinc-300 hover:border-white/20 hover:bg-white/[0.06]"
      }`}
    >
      <span
        className={`rounded-xl p-2.5 sm:p-2 ${
          active
            ? color === "blue"
              ? "bg-[#168cff]/15 text-[#168cff]"
              : color === "red"
                ? "bg-[#ff1d25]/15 text-[#ff5b61]"
                : "bg-white/10 text-white"
            : "bg-white/5 text-zinc-500"
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0 max-w-full">
        <span className="block truncate text-[11px] font-black leading-4 text-white sm:hidden">{mobileTitle}</span>
        <span className="hidden truncate text-sm font-black leading-5 text-white sm:block">{title}</span>
        <span className="hidden text-[10px] uppercase tracking-[0.18em] text-zinc-500 sm:block">
          {active ? "Selected" : "Choose"}
        </span>
      </span>
      <span className="hidden h-4 w-4 shrink-0 rounded-full border border-white/20 p-0.5 sm:block">
        <span className={`block h-full w-full rounded-full ${active ? "bg-white" : "bg-transparent"}`} />
      </span>
    </button>
  );
}

function ChoiceButton({
  active,
  title,
  subtitle,
  onClick,
  accent = "neutral",
}: {
  active: boolean;
  title: string;
  subtitle?: string;
  onClick: () => void;
  accent?: "neutral" | "blue" | "red";
}) {
  const activeClass =
    accent === "blue"
      ? "border-[#168cff] bg-[#168cff]/10 text-white"
      : accent === "red"
        ? "border-[#ff1d25] bg-[#ff1d25]/10 text-white"
        : "border-white/30 bg-white/10 text-white";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-2.5 text-left transition ${
        active
          ? activeClass
          : "border-white/10 bg-white/[0.025] text-zinc-400 hover:border-white/20 hover:text-white"
      }`}
    >
      <span className="block text-xs font-black">{title}</span>
      {subtitle ? <span className="mt-0.5 block text-[10px] text-zinc-500">{subtitle}</span> : null}
    </button>
  );
}

function GraphicServicePicker({
  value,
  onChange,
  accent = "blue",
}: {
  value: string;
  onChange: (value: string) => void;
  accent?: "blue" | "red";
}) {
  const [open, setOpen] = useState(false);
  const selected = GRAPHIC_SERVICES.find((item) => item.id === value);
  const label = value === "custom" ? "Custom / multiple" : selected?.label ?? "Choose a service";
  const price = value === "custom" ? "Agreed price" : selected ? formatMoney(selected.price) : "";

  useEffect(() => {
    if (!open) return;

    const close = () => setOpen(false);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const borderClass = accent === "blue" ? "focus-within:border-[#168cff]" : "focus-within:border-[#ff1d25]";
  const highlightClass = accent === "blue" ? "bg-[#168cff]/10 text-white" : "bg-[#ff1d25]/10 text-white";

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0b1116] px-3 py-2.5 text-left outline-none transition ${borderClass}`}
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-white">{label}</span>
          <span className="mt-0.5 block text-[10px] text-zinc-500">{price}</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-600 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close graphic service menu"
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="listbox"
            className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 max-h-64 overflow-auto rounded-2xl border border-white/10 bg-[#10151a] p-1.5 shadow-[0_18px_45px_rgba(0,0,0,0.5)]"
          >
            {GRAPHIC_SERVICES.map((item) => {
              const active = item.id === value;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(item.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                    active ? highlightClass : "text-zinc-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="truncate text-sm">{item.label}</span>
                  <span className="shrink-0 text-[11px] font-bold text-zinc-500">{formatMoney(item.price)}</span>
                </button>
              );
            })}
            <button
              type="button"
              role="option"
              aria-selected={value === "custom"}
              onClick={() => {
                onChange("custom");
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                value === "custom" ? highlightClass : "text-zinc-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className="truncate text-sm">Custom / multiple</span>
              <span className="shrink-0 text-[11px] font-bold text-zinc-500">Agreed price</span>
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function PaymentForm() {
  const [serviceType, setServiceType] = useState<ServiceType>("graphic_design");
  const [graphicId, setGraphicId] = useState("poster");
  const [graphicCustomTotal, setGraphicCustomTotal] = useState("");
  const [websiteTotal, setWebsiteTotal] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("deposit");
  const [balanceAmount, setBalanceAmount] = useState("");
  const [projectReference, setProjectReference] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [description, setDescription] = useState("");
  const [showEmail, setShowEmail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedGraphic = GRAPHIC_SERVICES.find((item) => item.id === graphicId);
  const graphicTotal =
    graphicId === "custom"
      ? Number(graphicCustomTotal)
      : selectedGraphic?.price ?? 0;
  const websiteProjectTotal = Number(websiteTotal);
  const combinedProjectTotal =
    (serviceType === "graphic_design" || serviceType === "both" ? graphicTotal : 0) +
    (serviceType === "website_development" || serviceType === "both" ? websiteProjectTotal : 0);

  const amountDue = useMemo(() => {
    if (paymentMode === "balance") {
      const graphicBalance =
        needsGraphic ? Math.round((graphicTotal / 2) * 100) / 100 : 0;
      const websiteBalance =
        needsWebsite ? Number(balanceAmount) : 0;
      return graphicBalance + websiteBalance;
    }
    if (paymentMode === "full") return combinedProjectTotal;
    return combinedProjectTotal / 2;
  }, [balanceAmount, combinedProjectTotal, graphicTotal, needsGraphic, needsWebsite, paymentMode]);

  const theme = serviceType === "graphic_design" ? "blue" : serviceType === "website_development" ? "red" : "split";
  const accentButtonClass =
    theme === "blue"
      ? "bg-[#168cff] hover:bg-[#2b97ff]"
      : theme === "red"
        ? "bg-[#ff1d25] hover:bg-[#ff363d]"
        : "bg-gradient-to-r from-[#168cff] to-[#ff1d25]";

  const needsGraphic = serviceType === "graphic_design" || serviceType === "both";
  const needsWebsite = serviceType === "website_development" || serviceType === "both";
  const hasValidProjectTotal =
    paymentMode === "balance" ||
    ((!needsGraphic || graphicTotal > 0) &&
      (!needsWebsite || websiteProjectTotal >= 80000));
  const hasValidBalance =
    paymentMode !== "balance" ||
    (projectReference.trim().length >= 3 &&
      (!needsWebsite || (Number(balanceAmount) > 0 && Number(balanceAmount) <= websiteProjectTotal)));

  const canSubmit =
    !submitting &&
    customerName.trim().length >= 2 &&
    customerPhone.trim().length >= 7 &&
    description.trim().length >= 3 &&
    hasValidProjectTotal &&
    hasValidBalance &&
    Number.isFinite(amountDue) &&
    amountDue > 0;

  function selectService(next: ServiceType) {
    setServiceType(next);
    setPaymentMode("deposit");
    setError(null);
  }

  async function submit() {
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    const serviceParts: string[] = [];
    if (needsGraphic) {
      const label = graphicId === "custom" ? "Custom / multiple graphic design" : selectedGraphic?.label ?? "Graphic Design";
      serviceParts.push(label);
    }
    if (needsWebsite) serviceParts.push("Website development");
    const paymentLabel =
      paymentMode === "deposit" ? "50% deposit" : paymentMode === "full" ? "full payment" : "final balance";
    const referenceNote = paymentMode === "balance" ? ` | Project reference: ${projectReference.trim()}` : "";

    try {
      const response = await fetch(apiUrl("/api/public/service-payments"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceType,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim(),
          amount: amountDue,
          description: `${serviceParts.join(" + ")} — ${paymentLabel}${referenceNote}. ${description.trim()}`,
          graphicId: needsGraphic && paymentMode !== "balance" ? graphicId : undefined,
          graphicTotal: needsGraphic && paymentMode !== "balance" ? graphicTotal : undefined,
          websiteTotal: needsWebsite && paymentMode !== "balance" ? websiteProjectTotal : undefined,
          paymentMode,
          projectReference: paymentMode === "balance" ? projectReference.trim() : undefined,
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
      <header className="mb-4 sm:mb-5">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Xhovilé Studio</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
          Service Payment
        </h1>
        <p className="mt-2 max-w-xl text-xs leading-5 text-zinc-400">
          Choose what you need, confirm the amount due today, then continue to PayChangu.
        </p>
      </header>

      <section
        className={`overflow-hidden rounded-[26px] border bg-[#10151a] shadow-2xl transition ${
          theme === "blue"
            ? "border-[#168cff]/40"
            : theme === "red"
              ? "border-[#ff1d25]/40"
              : "border-white/15"
        }`}
      >
        <div className="grid grid-cols-3 gap-2 border-b border-white/10 p-2">
          <ServiceChoice
            active={serviceType === "graphic_design"}
            color="blue"
            icon={<Palette className="h-4 w-4" />}
            title="Graphic Design"
            mobileTitle="Graphics"
            onClick={() => selectService("graphic_design")}
          />
          <ServiceChoice
            active={serviceType === "website_development"}
            color="red"
            icon={<Monitor className="h-4 w-4" />}
            title="Web Development"
            mobileTitle="Web"
            onClick={() => selectService("website_development")}
          />
          <ServiceChoice
            active={serviceType === "both"}
            color="split"
            icon={<span className="text-[13px] font-black">+</span>}
            title="Both"
            mobileTitle="Both"
            onClick={() => selectService("both")}
          />
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">Full name</span>
              <input
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.045] px-3.5 py-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-white/30"
                placeholder="Your name"
                autoComplete="name"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">Phone</span>
              <input
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.045] px-3.5 py-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-white/30"
                placeholder="0999 123 456"
                autoComplete="tel"
              />
            </label>
          </div>

          <div className="space-y-3">
              {needsGraphic ? (
                <div className="rounded-xl border border-[#168cff]/20 bg-[#168cff]/5 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#168cff]">Graphic Design</p>
                      <p className="mt-0.5 text-[10px] text-zinc-500">Choose a design from the poster.</p>
                    </div>
                    <Palette className="h-4 w-4 text-[#168cff]" />
                  </div>
                  <div className="mt-2 flex gap-2">
                    <div className="min-w-0 flex-1">
                      <GraphicServicePicker value={graphicId} onChange={setGraphicId} />
                    </div>
                    {graphicId === "custom" ? (
                      <input
                        value={graphicCustomTotal}
                        onChange={(event) => setGraphicCustomTotal(event.target.value.replace(/[^0-9.]/g, ""))}
                        className="w-32 rounded-xl border border-white/10 bg-[#0b1116] px-3 py-2.5 text-sm text-white outline-none focus:border-[#168cff]"
                        placeholder="Total MWK"
                        inputMode="numeric"
                      />
                    ) : null}
                  </div>
                  <p className="mt-2 text-[10px] text-zinc-500">
                    Project price: <span className="font-black text-white">{formatMoney(graphicTotal)}</span>
                  </p>
                </div>
              ) : null}

              {needsWebsite ? (
                <div className="rounded-xl border border-[#ff1d25]/20 bg-[#ff1d25]/5 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#ff5b61]">Web Development</p>
                      <p className="mt-0.5 text-[10px] text-zinc-500">Websites from MWK 80,000.</p>
                    </div>
                    <Monitor className="h-4 w-4 text-[#ff5b61]" />
                  </div>
                  <label className="mt-2 block">
                    <span className="sr-only">Agreed website project price</span>
                    <input
                      value={websiteTotal}
                      onChange={(event) => setWebsiteTotal(event.target.value.replace(/[^0-9.]/g, ""))}
                      className="w-full rounded-xl border border-white/10 bg-[#0b1116] px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-[#ff1d25]"
                      placeholder="Agreed project price (MWK)"
                      inputMode="numeric"
                    />
                  </label>
                </div>
              ) : null}

              {paymentMode === "balance" ? (
                <div className="space-y-2">
                  <input
                    value={projectReference}
                    onChange={(event) => setProjectReference(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-white/30"
                    placeholder="Project reference"
                  />

                  {needsWebsite ? (
                    <div>
                      <label className="mb-1.5 block text-[10px] uppercase tracking-[0.14em] text-zinc-600">
                        Website balance to pay
                      </label>
                      <input
                        value={balanceAmount}
                        onChange={(event) => setBalanceAmount(event.target.value.replace(/[^0-9.]/g, ""))}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-white/30"
                        placeholder="Enter website balance (MWK)"
                        inputMode="numeric"
                      />
                      <p className="mt-1 text-[10px] text-zinc-600">
                        Enter the agreed remaining website balance. Graphic balances remain 50%.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-[#168cff]/20 bg-[#168cff]/5 px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-[#168cff]">Graphic balance</p>
                      <p className="mt-0.5 text-sm font-black text-white">{formatMoney(graphicTotal / 2)}</p>
                      <p className="mt-0.5 text-[10px] text-zinc-600">Fixed at 50% of the listed project price.</p>
                    </div>
                  )}
                </div>
              ) : null}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-white">Payment</p>
                <p className="mt-0.5 text-[10px] text-zinc-600">We start new work after a 50% deposit.</p>
              </div>
              <span className="text-sm font-black text-white">{formatMoney(amountDue)}</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <ChoiceButton
                active={paymentMode === "deposit"}
                title="50% Deposit"
                subtitle={combinedProjectTotal > 0 ? formatMoney(combinedProjectTotal / 2) : "Half now"}
                onClick={() => setPaymentMode("deposit")}
                accent={theme === "blue" ? "blue" : theme === "red" ? "red" : "neutral"}
              />
              <ChoiceButton
                active={paymentMode === "full"}
                title="Full Payment"
                subtitle={combinedProjectTotal > 0 ? formatMoney(combinedProjectTotal) : "Pay all"}
                onClick={() => setPaymentMode("full")}
                accent="neutral"
              />
              <ChoiceButton
                active={paymentMode === "balance"}
                title="Final Balance"
                subtitle={
                  paymentMode === "balance"
                    ? needsWebsite
                      ? "Enter website balance"
                      : needsGraphic
                        ? formatMoney(graphicTotal / 2)
                        : "Existing project"
                    : "Existing project"
                }
                onClick={() => setPaymentMode("balance")}
                accent="neutral"
              />
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black text-white">Your brief</p>
                <p className="mt-0.5 text-[10px] text-zinc-600">A sentence or two is enough.</p>
              </div>
              <span className="text-[10px] text-zinc-700">Required</span>
            </div>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-2 min-h-16 w-full resize-none rounded-xl border border-white/10 bg-[#0b1116] px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-white/30"
              placeholder={needsWebsite && !needsGraphic ? "e.g. One-page business website for my clothing brand." : "e.g. Poster for a campus event."}
            />
          </div>

          <details className="rounded-xl border border-white/10 bg-white/[0.02]">
            <summary className="cursor-pointer list-none px-3 py-2.5 text-xs font-bold text-zinc-400">
              Email address <span className="font-normal text-zinc-600">(optional)</span>
            </summary>
            <div className="border-t border-white/10 p-3">
              <input
                value={customerEmail}
                onChange={(event) => setCustomerEmail(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.045] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-white/30"
                placeholder="you@example.com"
                type="email"
                autoComplete="email"
              />
            </div>
          </details>

          {error ? (
            <div className="flex gap-2.5 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-200">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          ) : null}

          <div className="rounded-2xl border border-white/10 bg-[#0b1116] p-3">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">Amount to pay now</p>
                <p className="mt-1 text-2xl font-black text-white">{formatMoney(amountDue)}</p>
              </div>
              <div className="text-right text-[10px] text-zinc-600">
                <p>Project price</p>
                <p className="mt-0.5 font-bold text-zinc-400">
                  {paymentMode === "balance"
                    ? needsWebsite
                      ? "Website balance entered"
                      : formatMoney(graphicTotal)
                    : formatMoney(combinedProjectTotal)}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void submit()}
            className={`flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-black text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-35 ${accentButtonClass}`}
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            {submitting ? "Opening PayChangu…" : `Continue to Pay ${formatMoney(amountDue)}`}
            {!submitting ? <ChevronRight className="h-5 w-5" /> : null}
          </button>

          <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-600">
            <ShieldCheck className="h-3.5 w-3.5" />
            Secure checkout via PayChangu
          </div>
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
      <section className="rounded-[26px] border border-white/10 bg-[#10151a] p-5 text-white shadow-2xl sm:p-7">
        <div className="text-center">
          {loading ? (
            <Loader2 className="mx-auto h-14 w-14 animate-spin text-zinc-500" />
          ) : payment?.status === "paid" ? (
            <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
          ) : (
            <CircleAlert className="mx-auto h-16 w-16 text-amber-500" />
          )}

          <p className="mt-4 text-[10px] font-black uppercase tracking-[0.28em] text-zinc-500">Xhovilé Studio</p>
          <h1 className="mt-1 text-2xl font-black">
            {loading ? "Checking Payment" : payment?.status === "paid" ? "Payment Successful" : "Payment Status"}
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-500">{message}</p>
        </div>

        {payment ? (
          <div className="mt-6 divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10">
            <div className="flex justify-between gap-6 p-3.5 text-sm">
              <span className="text-zinc-500">Service</span>
              <span className="text-right font-bold">{SERVICE_LABELS[payment.serviceType]}</span>
            </div>
            <div className="flex justify-between gap-6 p-3.5 text-sm">
              <span className="text-zinc-500">Customer</span>
              <span className="font-bold">{payment.customerName}</span>
            </div>
            <div className="flex justify-between gap-6 p-3.5 text-sm">
              <span className="text-zinc-500">Reference</span>
              <span className="break-all text-right font-mono text-xs font-bold text-zinc-300">{payment.paymentReference}</span>
            </div>
            <div className="flex justify-between gap-6 p-3.5 text-sm">
              <span className="text-zinc-500">Amount</span>
              <span className="font-black">{formatMoney(payment.amount, payment.currency)}</span>
            </div>
            <div className="p-3.5 text-sm">
              <span className="text-zinc-500">Description</span>
              <p className="mt-1 font-medium text-zinc-300">{payment.description}</p>
            </div>
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {payment?.status === "paid" ? (
            <button
              type="button"
              onClick={() => downloadReceipt(payment)}
              className="flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-zinc-950 hover:bg-zinc-100"
            >
              <Download className="h-4 w-4" />
              Download Receipt
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => window.location.assign("/Services/XhovileStudio")}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-black text-white hover:bg-white/5"
          >
            <RotateCcw className="h-4 w-4" />
            Start Another Payment
          </button>
        </div>

        <p className="mt-4 text-center text-[10px] text-zinc-600">
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
