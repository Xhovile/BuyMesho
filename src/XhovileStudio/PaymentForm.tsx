import { useMemo, useState } from "react";
import {
  CircleAlert,
  Monitor,
  Palette,
  ShieldCheck,
} from "lucide-react";
import {
  GRAPHIC_SERVICES,
  apiUrl,
  type CreateResponse,
  type PaymentMode,
  type ServiceType,
  formatMoney,
} from "./config";
import {
  ChoiceButton,
  GraphicServicePicker,
  PayChanguLogo,
  ServiceChoice,
  Shell,
  StudioCheckoutButton,
} from "./shared";

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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          graphicId: needsGraphic ? graphicId : undefined,
          graphicTotal: needsGraphic ? graphicTotal : undefined,
          websiteTotal: needsWebsite ? websiteProjectTotal : undefined,
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

          <div className="space-y-3">
              {needsGraphic ? (
                <div className="rounded-xl border border-[#168cff]/25 bg-[#eef8ff] p-3">
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
                        className="w-32 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-[#168cff]"
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
                <div className="rounded-xl border border-[#ff1d25]/25 bg-[#fff1f1] p-3">
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
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-700 focus:border-[#ff1d25]"
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
                    className="w-full rounded-xl border border-zinc-200 bg-[#fffdfa] px-3 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-400"
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
                        className="w-full rounded-xl border border-zinc-200 bg-[#fffdfa] px-3 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-400"
                        placeholder="Enter website balance (MWK)"
                        inputMode="numeric"
                      />
                      <p className="mt-1 text-[10px] text-zinc-500">
                        Enter the agreed remaining website balance. Graphic balances remain 50%.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-[#168cff]/20 bg-[#168cff]/5 px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-[#168cff]">Graphic balance</p>
                      <p className="mt-0.5 text-sm font-black text-zinc-900">{formatMoney(graphicTotal / 2)}</p>
                      <p className="mt-0.5 text-[10px] text-zinc-500">Fixed at 50% of the listed project price.</p>
                    </div>
                  )}
                </div>
              ) : null}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-zinc-900">Payment</p>
                <p className="mt-0.5 text-[10px] text-zinc-500">We start new work after a 50% deposit.</p>
              </div>
              <span className="text-sm font-black text-zinc-900">{formatMoney(amountDue)}</span>
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

          <details className="rounded-xl border border-zinc-200 bg-[#fffdfa]">
            <summary className="cursor-pointer list-none px-3 py-2.5 text-xs font-bold text-zinc-400">
              Email address <span className="font-normal text-zinc-600">(optional · used for your PayChangu receipt)</span>
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
