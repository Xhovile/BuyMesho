import { useMemo, useRef, useState } from "react";
import {
  CircleAlert,
  Monitor,
  Palette,
  ShieldCheck,
} from "lucide-react";
import {
  GRAPHIC_SERVICES,
  MIN_WEBSITE_PROJECT_TOTAL,
  apiUrl,
  type CreateResponse,
  type PaymentMode,
  type ServiceType,
  formatMoney,
} from "./config";
import {
  PayChanguLogo,
  ServiceChoice,
  Shell,
  StudioCheckoutButton,
} from "./shared";
import ReferenceUploader, {
  type StudioReferenceSelection,
} from "./ReferenceUploader";
import StudioPaymentOptions from "./StudioPaymentOptions";

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
  const [referenceFiles, setReferenceFiles] = useState<StudioReferenceSelection>({
    images: [],
    video: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);

  const selectedGraphic = GRAPHIC_SERVICES.find((item) => item.id === graphicId);
  const graphicTotal =
    graphicId === "custom"
      ? Number(graphicCustomTotal)
      : selectedGraphic?.price ?? 0;
  const websiteProjectTotal = Number(websiteTotal);
  const needsGraphic = serviceType === "graphic_design" || serviceType === "both";
  const needsWebsite = serviceType === "website_development" || serviceType === "both";

  const combinedProjectTotal =
    (needsGraphic ? graphicTotal : 0) +
    (needsWebsite ? websiteProjectTotal : 0);

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

  const hasValidProjectTotal =
    paymentMode === "balance" ||
    ((!needsGraphic || graphicTotal > 0) &&
      (!needsWebsite || websiteProjectTotal >= MIN_WEBSITE_PROJECT_TOTAL));
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
      const idempotencyKey =
        idempotencyKeyRef.current ?? crypto.randomUUID();
      idempotencyKeyRef.current = idempotencyKey;

      const formData = new FormData();
      formData.append("serviceType", serviceType);
      formData.append("customerName", customerName.trim());
      formData.append("customerPhone", customerPhone.trim());
      formData.append("customerEmail", customerEmail.trim());
      formData.append("amount", String(amountDue));
      formData.append("description", `${serviceParts.join(" + ")} — ${paymentLabel}${referenceNote}. ${description.trim()}`);
      if (needsGraphic) {
        formData.append("graphicId", graphicId);
        formData.append("graphicTotal", String(graphicTotal));
      }
      if (needsWebsite) {
        formData.append("websiteTotal", String(websiteProjectTotal));
      }
      formData.append("paymentMode", paymentMode);
      if (paymentMode === "balance") {
        formData.append("projectReference", projectReference.trim());
      }
      referenceFiles.images.forEach((file) => {
        formData.append("referenceImages", file, file.name);
      });
  if (referenceFiles.video) {
        formData.append("referenceVideo", referenceFiles.video, referenceFiles.video.name);
      }

      const response = await fetch(apiUrl("/api/public/service-payments"), {
        method: "POST",
        headers: {
          "Idempotency-Key": idempotencyKey,
        },
        body: formData,
      });

      const data = (await response.json()) as Partial<CreateResponse> & { error?: string };
      if (!response.ok || !data.checkoutUrl) {
        if (response.status === 409) {
          idempotencyKeyRef.current = null;
        }
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
      <header className="mb-5 text-center sm:mb-6">
        <h1 className="text-xl font-black uppercase tracking-[0.28em] text-zinc-900 sm:text-2xl">
          Service Payment
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-zinc-500">
          Choose what you need, confirm the amount due today, then continue to PayChangu.
        </p>
      </header>

      <section
        className={`overflow-hidden rounded-[26px] border bg-white shadow-[0_18px_55px_rgba(30,25,20,0.10)] transition ${
          theme === "blue"
            ? "border-[#168cff]/50"
            : theme === "red"
              ? "border-[#ff1d25]/50"
              : "border-zinc-300"
        }`}
      >
        <div className="grid grid-cols-3 gap-2 border-b border-zinc-200 p-2">
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
                className="w-full rounded-xl border border-zinc-200 bg-[#fffdfa] px-3.5 py-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-400"
                placeholder="Your name"
                autoComplete="name"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">Phone</span>
              <input
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-[#fffdfa] px-3.5 py-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-400"
                placeholder="0999 123 456"
                autoComplete="tel"
              />
            </label>
          </div>

          <StudioPaymentOptions
            needsGraphic={needsGraphic}
            needsWebsite={needsWebsite}
            graphicId={graphicId}
            graphicCustomTotal={graphicCustomTotal}
            websiteTotal={websiteTotal}
            paymentMode={paymentMode}
            balanceAmount={balanceAmount}
            projectReference={projectReference}
            graphicTotal={graphicTotal}
            combinedProjectTotal={combinedProjectTotal}
            amountDue={amountDue}
            theme={theme}
            onGraphicIdChange={setGraphicId}
            onGraphicCustomTotalChange={setGraphicCustomTotal}
            onWebsiteTotalChange={setWebsiteTotal}
            onPaymentModeChange={setPaymentMode}
            onBalanceAmountChange={setBalanceAmount}
            onProjectReferenceChange={setProjectReference}
          />

          <div className="rounded-xl border border-zinc-200 bg-[#fffdfa] p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black text-zinc-900">Your brief</p>
                <p className="mt-0.5 text-[10px] text-zinc-500">A sentence or two is enough.</p>
              </div>
              <span className="text-[10px] text-zinc-700">Required</span>
            </div>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-2 min-h-16 w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-700 focus:border-white/30"
              placeholder={needsWebsite && !needsGraphic ? "e.g. One-page business website for my clothing brand." : "e.g. Poster for a campus event."}
            />
          </div>

          <ReferenceUploader onChange={setReferenceFiles} />

          <details className="rounded-xl border border-zinc-200 bg-[#fffdfa]">
            <summary className="cursor-pointer list-none px-3 py-2.5 text-xs font-bold text-zinc-400">
              Email address <span className="font-normal text-zinc-600">(optional)</span>
            </summary>
            <div className="border-t border-zinc-200 p-3">
              <input
                value={customerEmail}
                onChange={(event) => setCustomerEmail(event.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-[#fffdfa] px-3.5 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-400"
                placeholder="you@example.com"
                type="email"
                autoComplete="email"
              />
            </div>
          </details>

          {error ? (
            <div className="flex gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          ) : null}

          <div className="rounded-2xl border border-zinc-200 bg-[#f8f5f1] p-3">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">Amount to pay now</p>
                <p className="mt-1 text-2xl font-black text-zinc-950">{formatMoney(amountDue)}</p>
              </div>
              <div className="text-right text-[10px] text-zinc-500">
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

          <StudioCheckoutButton
            disabled={!canSubmit}
            submitting={submitting}
            amount={amountDue}
            accentClass={accentButtonClass}
            onClick={() => void submit()}
          />

          <div className="flex items-center justify-center gap-2.5 text-[10px] text-zinc-500">
            <ShieldCheck className="h-3.5 w-3.5 text-zinc-500" />
            <span>Secure payment by</span>
            <PayChanguLogo />
          </div>
        </div>
      </section>
    </Shell>
  );
}



export default PaymentForm;
