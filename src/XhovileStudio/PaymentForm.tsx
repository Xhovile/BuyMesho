import { useEffect, useMemo, useRef, useState } from "react";
import {
  CircleAlert,
  Images,
  Monitor,
  Palette,
  ShieldCheck,
  Upload,
  Video,
  X,
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
  ChoiceButton,
  GraphicServicePicker,
  PayChanguLogo,
  ServiceChoice,
  Shell,
  StudioCheckoutButton,
} from "./shared";

type ReferenceImage = {
  id: string;
  file: File;
  previewUrl: string;
};

const MAX_REFERENCE_IMAGES = 4;
const MAX_REFERENCE_FILE_SIZE = 10 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [referenceVideo, setReferenceVideo] = useState<File | null>(null);
  const [referenceVideoPreviewUrl, setReferenceVideoPreviewUrl] = useState<string | null>(null);
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);
  const referenceIdCounter = useRef(0);
  const referencePreviewUrlsRef = useRef<Set<string>>(new Set());
  const referenceVideoPreviewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      for (const url of referencePreviewUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
      referencePreviewUrlsRef.current.clear();

      if (referenceVideoPreviewUrlRef.current) {
        URL.revokeObjectURL(referenceVideoPreviewUrlRef.current);
        referenceVideoPreviewUrlRef.current = null;
      }
    };
  }, []);

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

  function addReferenceImages(files: FileList | null) {
    if (!files?.length) return;

    const incoming = Array.from(files);
    const availableSlots = MAX_REFERENCE_IMAGES - referenceImages.length;
    const accepted: ReferenceImage[] = [];
    let nextError: string | null = incoming.length > availableSlots
      ? `You can attach up to ${MAX_REFERENCE_IMAGES} images.`
      : null;

    for (const file of incoming.slice(0, Math.max(availableSlots, 0))) {
      if (!file.type.startsWith("image/")) {
        nextError = "Please choose image files for the image references.";
        continue;
      }
      if (file.size > MAX_REFERENCE_FILE_SIZE) {
        nextError = `${file.name} is larger than ${formatFileSize(MAX_REFERENCE_FILE_SIZE)}.`;
        continue;
      }
      const duplicate = referenceImages.some((item) =>
        item.file.name === file.name &&
        item.file.size === file.size &&
        item.file.lastModified === file.lastModified
      );
      if (duplicate) continue;

      const previewUrl = URL.createObjectURL(file);
      referencePreviewUrlsRef.current.add(previewUrl);
      accepted.push({
        id: `${file.name}-${file.size}-${file.lastModified}-${referenceIdCounter.current++}`,
        file,
        previewUrl,
      });
    }

    setReferenceImages((current) => [...current, ...accepted].slice(0, MAX_REFERENCE_IMAGES));
    setReferenceError(nextError);
  }

  function removeReferenceImage(id: string) {
    setReferenceImages((current) => {
      const target = current.find((item) => item.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
        referencePreviewUrlsRef.current.delete(target.previewUrl);
      }
      return current.filter((item) => item.id !== id);
    });
    setReferenceError(null);
  }

  function addReferenceVideo(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setReferenceError("Please choose a video file for the video reference.");
      return;
    }
    if (file.size > MAX_REFERENCE_FILE_SIZE) {
      setReferenceError(`The video is larger than ${formatFileSize(MAX_REFERENCE_FILE_SIZE)}.`);
      return;
    }

    if (referenceVideoPreviewUrl) {
      URL.revokeObjectURL(referenceVideoPreviewUrl);
      referenceVideoPreviewUrlRef.current = null;
    }

    const previewUrl = URL.createObjectURL(file);
    referenceVideoPreviewUrlRef.current = previewUrl;
    setReferenceVideo(file);
    setReferenceVideoPreviewUrl(previewUrl);
    setReferenceError(null);
  }

  function removeReferenceVideo() {
    if (referenceVideoPreviewUrl) {
      URL.revokeObjectURL(referenceVideoPreviewUrl);
      referenceVideoPreviewUrlRef.current = null;
    }
    setReferenceVideo(null);
    setReferenceVideoPreviewUrl(null);
    setReferenceError(null);
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
      referenceImages.forEach((item) => {
        formData.append("referenceImages", item.file, item.file.name);
      });
      if (referenceVideo) {
        formData.append("referenceVideo", referenceVideo, referenceVideo.name);
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

          <section className="rounded-xl border border-zinc-200 bg-[#fffdfa] p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black text-zinc-900">References <span className="font-normal text-zinc-500">(optional)</span></p>
                <p className="mt-0.5 text-[10px] leading-5 text-zinc-500">Upload up to 4 images and 1 video to show the style or result you have in mind.</p>
              </div>
              <Images className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#168cff]/20 bg-[#eef8ff] px-3 py-2.5 hover:border-[#168cff]/40">
                <span className="flex min-w-0 items-center gap-2">
                  <Images className="h-4 w-4 shrink-0 text-[#168cff]" />
                  <span className="min-w-0">
                    <span className="block text-xs font-black text-zinc-900">Add images</span>
                    <span className="block text-[10px] text-zinc-500">{referenceImages.length}/{MAX_REFERENCE_IMAGES} selected</span>
                  </span>
                </span>
                <Upload className="h-4 w-4 shrink-0 text-[#168cff]" />
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  disabled={referenceImages.length >= MAX_REFERENCE_IMAGES}
                  onChange={(event) => {
                    addReferenceImages(event.target.files);
                    event.currentTarget.value = "";
                  }}
                />
              </label>

              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#ff1d25]/20 bg-[#fff1f1] px-3 py-2.5 hover:border-[#ff1d25]/40">
                <span className="flex min-w-0 items-center gap-2">
                  <Video className="h-4 w-4 shrink-0 text-[#ff5b61]" />
                  <span className="min-w-0">
                    <span className="block text-xs font-black text-zinc-900">Add video</span>
                    <span className="block text-[10px] text-zinc-500">{referenceVideo ? "1/1 selected" : "0/1 selected"}</span>
                  </span>
                </span>
                <Upload className="h-4 w-4 shrink-0 text-[#ff5b61]" />
                <input
                  type="file"
                  accept="video/*"
                  className="sr-only"
                  onChange={(event) => {
                    addReferenceVideo(event.target.files?.[0] ?? null);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            </div>

            <p className="mt-2 text-[10px] text-zinc-400">Images and video: up to {formatFileSize(MAX_REFERENCE_FILE_SIZE)} each.</p>

            {referenceImages.length ? (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {referenceImages.map((item, index) => (
                  <div key={item.id} className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
                    <img src={item.previewUrl} alt={`Reference ${index + 1}`} className="aspect-square w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeReferenceImage(item.id)}
                      className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white hover:bg-black/80"
                      aria-label={`Remove reference image ${index + 1}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {referenceVideo && referenceVideoPreviewUrl ? (
              <div className="mt-2 overflow-hidden rounded-xl border border-zinc-200 bg-white">
                <video src={referenceVideoPreviewUrl} controls preload="metadata" className="max-h-64 w-full bg-black" />
                <div className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-bold text-zinc-800">{referenceVideo.name}</p>
                    <p className="text-[10px] text-zinc-400">{formatFileSize(referenceVideo.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={removeReferenceVideo}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 hover:bg-zinc-50"
                    aria-label="Remove reference video"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : null}

            {referenceError ? <p className="mt-2 rounded-lg bg-red-50 px-2.5 py-2 text-[10px] font-semibold text-red-700">{referenceError}</p> : null}
          </section>

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
