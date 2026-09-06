import { useMemo, useState, type ChangeEvent } from "react";
import type {
  Category,
  CreateListingPayload,
  ListingDraft,
  ListingMode,
  University,
} from "../types";
import {
  getAdvancedListingFields,
  getBasicListingFields,
  getListingItemConfig,
  getListingItemTypes,
  getListingSubcategories,
  validateListingSpecValues,
} from "../listingSchemas";
import ListingAiStudio from "../components/ai/ListingAiStudio";
import ListingStudioFields from "./ListingStudioFields";
import ListingStudioMedia from "./ListingStudioMedia";
import ListingStudioPricing from "./ListingStudioPricing";
import ListingStudioSpecs from "./ListingStudioSpecs";
import type { ListingStudioFormProps } from "./listingStudio.types";

const inferListingMode = (draft: ListingDraft): ListingMode => {
  if (draft.listing_mode) return draft.listing_mode;
  if (draft.is_wholesale) return "wholesale";
  if (String(draft.original_price ?? "").trim()) return "deal";
  return "normal";
};

export default function ListingStudio({
  mode,
  initialData,
  onCancel,
  onSubmit,
  showFeedback,
  isSubmitting = false,
  submitLabel,
  submitBusyLabel,
}: ListingStudioFormProps) {
  const [form, setForm] = useState<ListingDraft>(() => ({
    ...initialData,
    listing_mode: inferListingMode(initialData),
  }));
  const [showAdvancedSpecs, setShowAdvancedSpecs] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const isSchemaDrivenCategory = getListingSubcategories(form.category as Category).length > 0;
  const availableSubcategories = useMemo(
    () => (isSchemaDrivenCategory ? getListingSubcategories(form.category as Category) : []),
    [isSchemaDrivenCategory, form.category]
  );
  const availableItemTypes = useMemo(
    () =>
      isSchemaDrivenCategory && form.subcategory
        ? getListingItemTypes(form.category as Category, form.subcategory)
        : [],
    [isSchemaDrivenCategory, form.category, form.subcategory]
  );
  const selectedItemConfig = useMemo(
    () =>
      isSchemaDrivenCategory && form.subcategory && form.item_type
        ? getListingItemConfig(form.category as Category, form.subcategory, form.item_type)
        : null,
    [isSchemaDrivenCategory, form.category, form.subcategory, form.item_type]
  );
  const basicSpecFields = useMemo(
    () =>
      isSchemaDrivenCategory && form.subcategory && form.item_type
        ? getBasicListingFields(form.category as Category, form.subcategory, form.item_type)
        : [],
    [isSchemaDrivenCategory, form.category, form.subcategory, form.item_type]
  );
  const advancedSpecFields = useMemo(
    () =>
      isSchemaDrivenCategory && form.subcategory && form.item_type
        ? getAdvancedListingFields(form.category as Category, form.subcategory, form.item_type)
        : [],
    [isSchemaDrivenCategory, form.category, form.subcategory, form.item_type]
  );

  const setError = (key: string, message: string) => {
    setFieldErrors((prev) => ({ ...prev, [key]: message }));
  };

  const clearError = (key: string) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const scrollToInvalidField = (fieldKey: string) => {
    const existingSpecTarget = document.getElementById(`listing-spec-${fieldKey}`);
    if (existingSpecTarget) {
      existingSpecTarget.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const placeholderByField: Record<string, string> = {
      name: "What are you selling?",
      description: "Explain what the buyer should know about this listing.",
    };
    const placeholder = placeholderByField[fieldKey];
    if (placeholder) {
      const target = document.querySelector<HTMLElement>(`[placeholder="${placeholder}"]`);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (target) return;
    }

    const labelMatches = Array.from(document.querySelectorAll<HTMLLabelElement>("label"));
    const normalizedKey = fieldKey.replace(/_/g, " ").toLowerCase();
    const labelTarget = labelMatches.find((label) => {
      const text = label.textContent?.replace(/\s+/g, " ").trim().toLowerCase() || "";
      return text === normalizedKey || text.startsWith(`${normalizedKey} `) || text.startsWith(`${normalizedKey}*`);
    });

    if (labelTarget) {
      const target = labelTarget.closest("[data-form-dropdown]") || labelTarget.parentElement;
      if (target instanceof HTMLElement) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
    }

    if (fieldKey === "photos") {
      const mediaLabel = labelMatches.find((label) => label.textContent?.trim().toLowerCase() === "photos");
      const mediaTarget = mediaLabel?.closest("section");
      if (mediaTarget instanceof HTMLElement) {
        mediaTarget.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
    }

    if (["original_price", "deal_label", "deal_expires_at", "price", "pack_size", "bulk_units", "single_item_price"].includes(fieldKey)) {
      const pricingHeading = Array.from(document.querySelectorAll<HTMLElement>("h2")).find(
        (heading) => heading.textContent?.trim().toLowerCase() === "choose how you sell it"
      );
      const pricingTarget = pricingHeading?.closest("section");
      if (pricingTarget instanceof HTMLElement) {
        pricingTarget.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  const scrollAfterError = (fieldKey: string) => {
    requestAnimationFrame(() => scrollToInvalidField(fieldKey));
  };

  const handleModeChange = (nextMode: ListingMode) => {
    setForm((prev) => ({
      ...prev,
      listing_mode: nextMode,
      ...(nextMode === "normal"
        ? {
            original_price: "",
            deal_label: "",
            deal_expires_at: "",
            is_wholesale: false,
            can_sell_individually: undefined,
            pack_size: "",
            bulk_units: "",
            single_item_price: "",
          }
        : nextMode === "deal"
          ? {
              is_wholesale: false,
              can_sell_individually: undefined,
              pack_size: "",
              bulk_units: "",
              single_item_price: "",
            }
          : {
              original_price: "",
              deal_label: "",
              deal_expires_at: "",
              is_wholesale: true,
            }),
    }));
    clearError("original_price");
    clearError("pack_size");
    clearError("bulk_units");
    clearError("single_item_price");
  };

  const uploadMediaFile = async (file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    const response = await fetch("/api/upload/", { method: "POST", body: formData });
    const text = await response.text();
    let data: { url?: string; error?: string } | null = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    if (!response.ok) throw new Error(data?.error || "Upload failed");
    if (!data?.url) throw new Error("Upload succeeded but no URL was returned.");
    return data.url;
  };

  const handleAddImages = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    const selectedFiles = files.slice(0, Math.max(0, 5 - form.photos.length));
    if (selectedFiles.length < files.length) {
      showFeedback("info", "Photo limit reached", "You can upload a maximum of 5 photos per listing.");
    }
    setUploadingMedia(true);
    try {
      const urls: string[] = [];
      for (const file of selectedFiles) urls.push(await uploadMediaFile(file));
      setForm((prev) => ({ ...prev, photos: [...prev.photos, ...urls].slice(0, 5) }));
      clearError("photos");
    } catch (error: unknown) {
      showFeedback("error", "Image upload failed", error instanceof Error ? error.message : "We could not upload the images.");
    } finally {
      setUploadingMedia(false);
      event.target.value = "";
    }
  };

  const handleReplaceVideo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingMedia(true);
    try {
      const url = await uploadMediaFile(file);
      setForm((prev) => ({ ...prev, video_url: url }));
    } catch (error: unknown) {
      showFeedback("error", "Video upload failed", error instanceof Error ? error.message : "We could not upload the video.");
    } finally {
      setUploadingMedia(false);
      event.target.value = "";
    }
  };

  const handleSave = async () => {
    setFieldErrors({});
    const priceNum = Number(form.price);
    const quantityNum = Number(form.quantity);
    const soldQuantityNum = Number(form.sold_quantity);
    const originalPriceRaw = String(form.original_price ?? "").trim();
    const dealLabelRaw = String(form.deal_label ?? "").trim();
    const dealExpiresAtRaw = String(form.deal_expires_at ?? "").trim();
    const packSizeRaw = String(form.pack_size ?? "").trim();
    const bulkUnitsRaw = String(form.bulk_units ?? "").trim();
    const singleItemPriceRaw = String(form.single_item_price ?? "").trim();
    const originalPriceNum = originalPriceRaw ? Number(originalPriceRaw) : null;
    const packSizeNum = packSizeRaw ? Number(packSizeRaw) : null;
    const singleItemPriceNum = singleItemPriceRaw ? Number(singleItemPriceRaw) : null;
    const listingMode = form.listing_mode || "normal";
    const isDeal = listingMode === "deal";
    const isWholesale = listingMode === "wholesale" || Boolean(form.is_wholesale);

    if (form.name.trim().replace(/\s+/g, " ").length < 3) {
      setError("name", "Please enter a clear listing title.");
      scrollAfterError("name");
      return;
    }
    if (String(form.description || "").trim().length < 10) {
      setError("description", "Please enter at least 10 characters.");
      scrollAfterError("description");
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setError("price", "Please enter a valid price.");
      scrollAfterError("price");
      return;
    }
    if (isDeal && (!Number.isFinite(originalPriceNum as number) || (originalPriceNum as number) <= priceNum)) {
      showFeedback("error", "Invalid deal price", "Original price must be higher than current price.");
      scrollAfterError("original_price");
      return;
    }
    if (isWholesale) {
      if (!packSizeRaw || !Number.isInteger(packSizeNum as number) || (packSizeNum as number) < 1) {
        setError("pack_size", "Pack size must be a whole number of at least 1.");
        scrollAfterError("pack_size");
        return;
      }
      if (!bulkUnitsRaw) {
        setError("bulk_units", "Bulk units are required for wholesale listings.");
        scrollAfterError("bulk_units");
        return;
      }
      if (form.can_sell_individually && (!singleItemPriceRaw || !Number.isFinite(singleItemPriceNum as number) || (singleItemPriceNum as number) <= 0)) {
        setError("single_item_price", "Enter a valid single item price.");
        scrollAfterError("single_item_price");
        return;
      }
    }
    if (form.photos.length < 1) {
      setError("photos", "Add at least 1 photo.");
      scrollAfterError("photos");
      return;
    }
    if (!Number.isInteger(quantityNum) || quantityNum < 1) {
      setError("quantity", "Quantity must be at least 1.");
      scrollAfterError("quantity");
      return;
    }
    if (!Number.isInteger(soldQuantityNum) || soldQuantityNum < 0) {
      setError("sold_quantity", "Sold quantity cannot be negative.");
      scrollAfterError("sold_quantity");
      return;
    }
    if (soldQuantityNum > quantityNum) {
      setError("sold_quantity", "Sold quantity cannot be greater than total quantity.");
      scrollAfterError("sold_quantity");
      return;
    }

    if (isSchemaDrivenCategory) {
      if (!form.subcategory) {
        setError("subcategory", "Choose a subcategory.");
        scrollAfterError("subcategory");
        return;
      }
      if (!form.item_type) {
        setError("item_type", "Choose an item type.");
        scrollAfterError("item_type");
        return;
      }
      const validation = validateListingSpecValues(form.category as Category, form.subcategory, form.item_type, form.spec_values);
      if (!validation.isValid) {
        const nextErrors: Record<string, string> = {};
        for (const item of validation.errors) {
          if (item.key) nextErrors[item.key] = item.message;
        }
        setFieldErrors(nextErrors);
        const first = validation.errors[0];
        if (first?.key) scrollAfterError(first.key);
        return;
      }
    }

    const payload: CreateListingPayload = {
      name: form.name,
      price: priceNum,
      description: form.description,
      category: form.category as Category,
      subcategory: form.subcategory || null,
      item_type: form.item_type || null,
      spec_values: isSchemaDrivenCategory ? form.spec_values : {},
      university: form.university as University,
      status: form.status,
      condition: form.condition,
      quantity: quantityNum,
      sold_quantity: soldQuantityNum,
      photos: form.photos,
      video_url: form.video_url || null,
      listing_mode: listingMode,
      original_price: isDeal ? originalPriceNum : null,
      discount_percent: null,
      deal_label: isDeal ? dealLabelRaw || null : null,
      deal_expires_at: isDeal ? dealExpiresAtRaw || null : null,
      is_wholesale: isWholesale,
      can_sell_individually: isWholesale ? form.can_sell_individually === true : null,
      pack_size: isWholesale ? packSizeNum : null,
      bulk_units: isWholesale ? bulkUnitsRaw || null : null,
      single_item_price: isWholesale && form.can_sell_individually ? singleItemPriceNum : null,
    };

    await onSubmit(payload);
  };

  const resolvedSubmitLabel = submitLabel || (mode === "create" ? "Post Listing" : "Save Changes");
  const resolvedSubmitBusyLabel = submitBusyLabel || (mode === "create" ? "Posting..." : "Saving...");

  return (
    <div className="w-full space-y-6">
      <ListingAiStudio
        currentDraft={form}
        onApplyDraftSuggestion={(suggested) => setForm((prev) => ({ ...prev, ...suggested }))}
        showFeedback={showFeedback}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <ListingStudioMedia
            photos={form.photos}
            videoUrl={form.video_url}
            uploading={uploadingMedia}
            error={fieldErrors.photos}
            onAddImages={handleAddImages}
            onRemovePhoto={(index) => {
              setForm((prev) => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) }));
              clearError("photos");
            }}
            onReplaceVideo={handleReplaceVideo}
            onRemoveVideo={() => setForm((prev) => ({ ...prev, video_url: "" }))}
          />

          <ListingStudioFields
            form={form}
            setForm={setForm}
            fieldErrors={fieldErrors}
            clearError={clearError}
            subcategories={availableSubcategories}
            itemTypes={availableItemTypes}
            onAdvancedDetailsReset={() => setShowAdvancedSpecs(false)}
          />
        </div>

        <div className="space-y-6">
          <ListingStudioPricing
            form={form}
            setForm={setForm}
            mode={form.listing_mode || "normal"}
            onModeChange={handleModeChange}
            fieldErrors={fieldErrors}
            clearError={clearError}
          />

          <ListingStudioSpecs
            basicFields={basicSpecFields}
            advancedFields={advancedSpecFields}
            selectedItemConfig={selectedItemConfig}
            form={form}
            setForm={setForm}
            fieldErrors={fieldErrors}
            clearError={clearError}
            showAdvanced={showAdvancedSpecs}
            setShowAdvanced={setShowAdvancedSpecs}
          />
        </div>
      </div>

      <section className="sticky bottom-0 z-30 border-t border-zinc-200 bg-zinc-100/95 py-3 backdrop-blur">
        <div className="flex flex-row gap-3">
          <button type="button" onClick={onCancel} className="w-full rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-extrabold text-zinc-700 hover:bg-zinc-50">
            Cancel
          </button>
          <button type="button" onClick={() => void handleSave()} disabled={isSubmitting || uploadingMedia} className="w-full rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800 disabled:opacity-50">
            {isSubmitting || uploadingMedia ? resolvedSubmitBusyLabel : resolvedSubmitLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
