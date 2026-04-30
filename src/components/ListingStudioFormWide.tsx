import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { X } from "lucide-react";
import type { Category, CreateListingPayload, ListingCondition, ListingDraft, ListingSpecValue, University } from "../types";
import { CATEGORIES, UNIVERSITIES } from "../constants";
import FormDropdown from "./FormDropdown";
import {
  createEmptyListingSpecValues,
  getAdvancedListingFields,
  getBasicListingFields,
  getListingItemConfig,
  getListingItemTypes,
  getListingSubcategories,
  validateListingSpecValues,
} from "../listingSchemas";
import type { ListingSpecField } from "../listingSchemas";

const CONDITION_OPTIONS_BY_CATEGORY: Record<string, { label: string; options: string[] }> = {
  "Food & Snacks": { label: "Freshness", options: ["fresh", "packed", "prepared", "frozen"] },
  "Fashion & Clothing": { label: "Condition", options: ["new", "like new", "used", "thrifted"] },
  "Academic Services": { label: "Service Status", options: ["available", "ongoing", "completed", "remote"] },
  "Electronics & Gadgets": { label: "Condition", options: ["new", "used", "refurbished"] },
  "Beauty & Personal Care": { label: "Condition", options: ["new", "opened", "used", "refill"] },
};

const getConditionConfig = (category: string) => CONDITION_OPTIONS_BY_CATEGORY[category] || { label: "Condition", options: ["new", "used", "refurbished"] };

type Props = {
  mode: "create" | "edit";
  initialData: ListingDraft;
  onCancel: () => void;
  onSubmit: (payload: CreateListingPayload) => Promise<void> | void;
  showFeedback: (type: "success" | "error" | "info", title: string, message: string) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  submitBusyLabel?: string;
};

export default function ListingStudioFormWide({
  mode,
  initialData,
  onCancel,
  onSubmit,
  showFeedback,
  isSubmitting = false,
  submitLabel,
  submitBusyLabel,
}: Props) {
  const [form, setForm] = useState<ListingDraft>(initialData);
  const [showAdvancedSpecs, setShowAdvancedSpecs] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const specFieldRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    setForm(initialData);
    setFieldErrors({});
    setShowAdvancedSpecs(false);
  }, [initialData]);

  const isSchemaDrivenCategory = getListingSubcategories(form.category as Category).length > 0;

  const availableSubcategories = useMemo(() => {
    if (!isSchemaDrivenCategory) return [];
    return getListingSubcategories(form.category as Category);
  }, [isSchemaDrivenCategory, form.category]);

  const availableItemTypes = useMemo(() => {
    if (!isSchemaDrivenCategory || !form.subcategory) return [];
    return getListingItemTypes(form.category as Category, form.subcategory);
  }, [isSchemaDrivenCategory, form.category, form.subcategory]);

  const selectedItemConfig = useMemo(() => {
    if (!isSchemaDrivenCategory || !form.subcategory || !form.item_type) return null;
    return getListingItemConfig(form.category as Category, form.subcategory, form.item_type);
  }, [isSchemaDrivenCategory, form.category, form.subcategory, form.item_type]);

  const basicSpecFields = useMemo(() => {
    if (!isSchemaDrivenCategory || !form.subcategory || !form.item_type) return [];
    return getBasicListingFields(form.category as Category, form.subcategory, form.item_type);
  }, [isSchemaDrivenCategory, form.category, form.subcategory, form.item_type]);

  const advancedSpecFields = useMemo(() => {
    if (!isSchemaDrivenCategory || !form.subcategory || !form.item_type) return [];
    return getAdvancedListingFields(form.category as Category, form.subcategory, form.item_type);
  }, [isSchemaDrivenCategory, form.category, form.subcategory, form.item_type]);

  const conditionConfig = getConditionConfig(form.category);

  const setError = (key: string, message: string) => setFieldErrors((prev) => ({ ...prev, [key]: message }));
  const clearError = (key: string) => setFieldErrors((prev) => {
    if (!prev[key]) return prev;
    const next = { ...prev };
    delete next[key];
    return next;
  });

  const hasMeaningfulTitle = (raw: string) => raw.trim().replace(/\s+/g, " ").length >= 3;

  const uploadMediaFile = async (file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    const res = await fetch("/api/upload/", { method: "POST", body: formData });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) throw new Error(data?.error || "Upload failed");
    return data.url as string;
  };

  const handleAddImages = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
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
    } catch (err: any) {
      showFeedback("error", "Image upload failed", err?.message || "We could not upload the images.");
    } finally {
      setUploadingMedia(false);
      e.target.value = "";
    }
  };

  const handleReplaceVideo = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMedia(true);
    try {
      const url = await uploadMediaFile(file);
      setForm((prev) => ({ ...prev, video_url: url }));
    } catch (err: any) {
      showFeedback("error", "Video upload failed", err?.message || "We could not upload the video.");
    } finally {
      setUploadingMedia(false);
      e.target.value = "";
    }
  };

  const renderSpecField = (field: ListingSpecField) => {
    const rawValue = form.spec_values[field.key];
    const value = rawValue ?? "";
    const error = fieldErrors[field.key];
    const required = !!field.required || !!selectedItemConfig?.requiredKeys.includes(field.key);
    const label = `${field.label}${required ? " *" : ""}`;

    if (field.type === "select") {
      return (
        <div key={field.key} ref={(el) => { specFieldRefs.current[field.key] = el; }}>
          <FormDropdown
            label={label}
            value={String(value)}
            options={field.options || []}
            onChange={(selected) => {
              clearError(field.key);
              setForm((prev) => ({ ...prev, spec_values: { ...prev.spec_values, [field.key]: selected } }));
            }}
            placeholder={`Select ${field.label}`}
          />
          {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
        </div>
      );
    }

    if (field.type === "textarea") {
      return (
        <div key={field.key} ref={(el) => { specFieldRefs.current[field.key] = el; }}>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-400">{label}</label>
          <textarea
            value={String(value)}
            onChange={(e) => {
              clearError(field.key);
              setForm((prev) => ({ ...prev, spec_values: { ...prev.spec_values, [field.key]: e.target.value } }));
            }}
            className="h-24 w-full resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
          />
          {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
        </div>
      );
    }

    if (field.type === "boolean") {
      const boolValue = typeof rawValue === "boolean" ? rawValue : null;
      return (
        <div key={field.key} ref={(el) => { specFieldRefs.current[field.key] = el; }}>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-400">{label}</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Not set", value: null },
              { label: "Yes", value: true },
              { label: "No", value: false },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  clearError(field.key);
                  setForm((prev) => ({ ...prev, spec_values: { ...prev.spec_values, [field.key]: item.value as any } }));
                }}
                className={`rounded-2xl border px-3 py-2 text-sm font-bold ${boolValue === item.value ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-600"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
        </div>
      );
    }

    if (field.type === "multiselect") {
      const selectedValues = Array.isArray(rawValue) ? rawValue : [];
      return (
        <div key={field.key} ref={(el) => { specFieldRefs.current[field.key] = el; }}>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-zinc-400">{label}</label>
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-zinc-200 bg-white p-3">
            {(field.options || []).map((option) => {
              const checked = selectedValues.includes(option);
              return (
                <label key={option} className="flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      clearError(field.key);
                      setForm((prev) => ({
                        ...prev,
                        spec_values: {
                          ...prev.spec_values,
                          [field.key]: e.target.checked
                            ? [...selectedValues, option]
                            : selectedValues.filter((item: string) => item !== option),
                        },
                      }));
                    }}
                  />
                  <span>{option}</span>
                </label>
              );
            })}
          </div>
          {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
        </div>
      );
    }

    if (field.type === "number") {
      return (
        <div key={field.key} ref={(el) => { specFieldRefs.current[field.key] = el; }}>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-400">{label}</label>
          <input
            type="number"
            value={value === "" ? "" : String(value)}
            onChange={(e) => {
              clearError(field.key);
              setForm((prev) => ({ ...prev, spec_values: { ...prev.spec_values, [field.key]: e.target.value === "" ? null : Number(e.target.value) } }));
            }}
            className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
          />
          {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
        </div>
      );
    }

    return (
      <div key={field.key} ref={(el) => { specFieldRefs.current[field.key] = el; }}>
        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-400">{label}</label>
        <input
          type="text"
          value={value as string}
          onChange={(e) => {
            clearError(field.key);
            setForm((prev) => ({ ...prev, spec_values: { ...prev.spec_values, [field.key]: e.target.value } }));
          }}
          className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
        />
        {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
      </div>
    );
  };

  const handleSave = async () => {
    setFieldErrors({});

    const priceNum = Number(form.price);
    const quantityNum = Number(form.quantity);
    const soldQuantityNum = Number(form.sold_quantity);
    const originalPriceRaw = String((form as any).original_price ?? "").trim();
    const dealLabelRaw = String((form as any).deal_label ?? "").trim();
    const discountPercentRaw = String((form as any).discount_percent ?? "").trim();
    const isWholesale = Boolean((form as any).is_wholesale);
    const originalPriceNum = originalPriceRaw ? Number(originalPriceRaw) : null;
    const discountPercentNum = discountPercentRaw ? Number(discountPercentRaw) : null;

    if (!hasMeaningfulTitle(form.name)) {
      setError("name", "Please enter a clear listing title.");
      return;
    }

    if (String(form.description || "").trim().length < 10) {
      setError("description", "Please enter at least 10 characters.");
      return;
    }

    if (!form.whatsapp_number.trim()) {
      setError("whatsapp_number", "WhatsApp number is required.");
      return;
    }

    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setError("price", "Please enter a valid price.");
      return;
    }

    if (originalPriceRaw && (!Number.isFinite(originalPriceNum as number) || (originalPriceNum as number) <= 0)) {
      setError("original_price", "Original price must be greater than 0.");
      return;
    }

    if (discountPercentRaw && (!Number.isFinite(discountPercentNum as number) || (discountPercentNum as number) <= 0 || (discountPercentNum as number) > 100)) {
      setError("discount_percent", "Discount must be between 1 and 100.");
      return;
    }

    if (form.photos.length < 1) {
      setError("photos", "Add at least 1 photo.");
      return;
    }

    if (!Number.isInteger(quantityNum) || quantityNum < 1) {
      setError("quantity", "Quantity must be at least 1.");
      return;
    }

    if (!Number.isInteger(soldQuantityNum) || soldQuantityNum < 0) {
      setError("sold_quantity", "Sold quantity cannot be negative.");
      return;
    }

    if (soldQuantityNum > quantityNum) {
      setError("sold_quantity", "Sold quantity cannot be greater than total quantity.");
      return;
    }

    if (isSchemaDrivenCategory) {
      if (!form.subcategory) {
        setError("subcategory", "Choose a subcategory.");
        return;
      }
      if (!form.item_type) {
        setError("item_type", "Choose an item type.");
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
        if (first?.key) {
          const target = specFieldRefs.current[first.key];
          target?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return;
      }
    }

    await onSubmit({
      name: form.name,
      price: priceNum,
      description: form.description,
      category: form.category as Category,
      subcategory: form.subcategory || null,
      item_type: form.item_type || null,
      spec_values: isSchemaDrivenCategory ? form.spec_values : {},
      university: form.university as University,
      whatsapp_number: form.whatsapp_number,
      status: form.status,
      condition: form.condition,
      quantity: quantityNum,
      sold_quantity: soldQuantityNum,
      photos: form.photos,
      video_url: form.video_url || null,
      original_price: originalPriceNum,
      discount_percent: discountPercentNum,
      deal_label: dealLabelRaw || null,
      is_wholesale: isWholesale,
    });
  };

  const resolvedSubmitLabel = submitLabel || (mode === "create" ? "Post Listing" : "Save Changes");
  const resolvedSubmitBusyLabel = submitBusyLabel || (mode === "create" ? "Posting..." : "Saving...");

  return (
    <div className="w-full">
      <div className="grid gap-8 xl:grid-cols-2">
        <div className="space-y-8">
          <section className="border-b border-zinc-200 pb-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Basic info</p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-400">Product name</label>
                <input value={form.name} onChange={(e) => { clearError("name"); setForm((prev) => ({ ...prev, name: e.target.value })); }} className={`w-full rounded-2xl border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 ${fieldErrors.name ? "border-red-500" : "border-zinc-200"}`} />
                {fieldErrors.name ? <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p> : null}
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-400">Description</label>
                <textarea rows={7} value={form.description} onChange={(e) => { clearError("description"); setForm((prev) => ({ ...prev, description: e.target.value })); }} className={`w-full resize-none rounded-2xl border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 ${fieldErrors.description ? "border-red-500" : "border-zinc-200"}`} />
                {fieldErrors.description ? <p className="mt-1 text-xs text-red-600">{fieldErrors.description}</p> : null}
              </div>
            </div>
          </section>

          <section className="border-b border-zinc-200 pb-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Media</p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-400">Photos (max 5)</label>
                {form.photos.length > 0 && (
                  <div className="mb-3 grid grid-cols-3 gap-3">
                    {form.photos.map((url, idx) => (
                      <div key={`${url}-${idx}`} className="relative aspect-square overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">
                        <img src={url} alt={`Photo ${idx + 1}`} className="h-full w-full object-cover" />
                        <button type="button" onClick={() => setForm((prev) => ({ ...prev, photos: prev.photos.filter((_, i) => i !== idx) }))} className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"><X className="h-4 w-4" /></button>
                      </div>
                    ))}
                  </div>
                )}
                <input type="file" accept="image/*" multiple onChange={handleAddImages} disabled={uploadingMedia || form.photos.length >= 5} className={`w-full rounded-2xl border bg-white p-3 ${fieldErrors.photos ? "border-red-500" : "border-zinc-200"}`} />
                {fieldErrors.photos ? <p className="mt-1 text-xs text-red-600">{fieldErrors.photos}</p> : null}
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-400">Video (optional)</label>
                <input type="file" accept="video/*" onChange={handleReplaceVideo} disabled={uploadingMedia} className="w-full rounded-2xl border border-zinc-200 bg-white p-3" />
                {form.video_url ? <p className="mt-2 text-xs text-zinc-500">Video attached.</p> : null}
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section className="border-b border-zinc-200 pb-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Listing setup</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-400">Price (MK)</label>
                <input type="number" value={form.price} onChange={(e) => { clearError("price"); setForm((prev) => ({ ...prev, price: e.target.value })); }} className={`w-full rounded-2xl border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 ${fieldErrors.price ? "border-red-500" : "border-zinc-200"}`} />
                {fieldErrors.price ? <p className="mt-1 text-xs text-red-600">{fieldErrors.price}</p> : null}
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-400">WhatsApp number</label>
                <input value={form.whatsapp_number} onChange={(e) => { clearError("whatsapp_number"); setForm((prev) => ({ ...prev, whatsapp_number: e.target.value })); }} className={`w-full rounded-2xl border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 ${fieldErrors.whatsapp_number ? "border-red-500" : "border-zinc-200"}`} />
                {fieldErrors.whatsapp_number ? <p className="mt-1 text-xs text-red-600">{fieldErrors.whatsapp_number}</p> : null}
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-400">Total quantity</label>
                <input type="number" min="1" value={form.quantity} onChange={(e) => { clearError("quantity"); setForm((prev) => ({ ...prev, quantity: e.target.value })); }} className={`w-full rounded-2xl border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 ${fieldErrors.quantity ? "border-red-500" : "border-zinc-200"}`} />
                {fieldErrors.quantity ? <p className="mt-1 text-xs text-red-600">{fieldErrors.quantity}</p> : null}
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-400">Sold quantity</label>
                <input type="number" min="0" value={form.sold_quantity} onChange={(e) => { clearError("sold_quantity"); setForm((prev) => ({ ...prev, sold_quantity: e.target.value })); }} className={`w-full rounded-2xl border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 ${fieldErrors.sold_quantity ? "border-red-500" : "border-zinc-200"}`} />
                {fieldErrors.sold_quantity ? <p className="mt-1 text-xs text-red-600">{fieldErrors.sold_quantity}</p> : null}
              </div>
              <div>
                <FormDropdown label="Category" value={form.category} options={CATEGORIES} onChange={(value) => {
                  const category = value as Category;
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.subcategory;
                    delete next.item_type;
                    return next;
                  });
                  setForm((prev) => ({ ...prev, category, subcategory: "", item_type: "", spec_values: {}, condition: (getConditionConfig(category).options[0] as ListingCondition) || prev.condition }));
                  setShowAdvancedSpecs(false);
                }} />
              </div>
              <div>
                <FormDropdown label="University" value={form.university} options={UNIVERSITIES} onChange={(value) => setForm((prev) => ({ ...prev, university: value as University }))} />
              </div>
              <div className="sm:col-span-2">
                <FormDropdown label={conditionConfig.label} value={form.condition} options={conditionConfig.options} onChange={(value) => setForm((prev) => ({ ...prev, condition: value as ListingCondition }))} />
              </div>
            </div>
          </section>

          <section className="border-b border-zinc-200 pb-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Deal pricing & wholesale</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-400">Original price (optional)</label>
                <input type="number" min="0" value={(form as any).original_price ?? ""} onChange={(e) => { clearError("original_price"); setForm((prev) => ({ ...prev, original_price: e.target.value } as ListingDraft)); }} className={`w-full rounded-2xl border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 ${fieldErrors.original_price ? "border-red-500" : "border-zinc-200"}`} />
                {fieldErrors.original_price ? <p className="mt-1 text-xs text-red-600">{fieldErrors.original_price}</p> : null}
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-400">Discount percent (optional)</label>
                <input type="number" min="0" max="100" value={(form as any).discount_percent ?? ""} onChange={(e) => { clearError("discount_percent"); setForm((prev) => ({ ...prev, discount_percent: e.target.value } as ListingDraft)); }} className={`w-full rounded-2xl border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 ${fieldErrors.discount_percent ? "border-red-500" : "border-zinc-200"}`} />
                {fieldErrors.discount_percent ? <p className="mt-1 text-xs text-red-600">{fieldErrors.discount_percent}</p> : null}
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-400">Deal label (optional)</label>
                <input type="text" value={String((form as any).deal_label ?? "")} onChange={(e) => setForm((prev) => ({ ...prev, deal_label: e.target.value } as ListingDraft))} placeholder="e.g. Back to school deal" className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="flex items-end">
                <label className="flex w-full items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-700">
                  <span>Wholesale listing</span>
                  <input type="checkbox" checked={Boolean((form as any).is_wholesale)} onChange={(e) => setForm((prev) => ({ ...prev, is_wholesale: e.target.checked } as ListingDraft))} className="h-4 w-4 rounded border-zinc-300" />
                </label>
              </div>
            </div>
          </section>

          {isSchemaDrivenCategory ? (
            <section className="border-b border-zinc-200 pb-6">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Item details</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <FormDropdown label="Subcategory" value={form.subcategory} options={availableSubcategories} onChange={(value) => {
                    clearError("subcategory");
                    clearError("item_type");
                    setForm((prev) => ({ ...prev, subcategory: value, item_type: "", spec_values: {} }));
                    setShowAdvancedSpecs(false);
                  }} />
                  {fieldErrors.subcategory ? <p className="mt-1 text-xs text-red-600">{fieldErrors.subcategory}</p> : null}
                </div>
                <div>
                  <FormDropdown label="Item type" value={form.item_type} options={availableItemTypes} onChange={(value) => {
                    clearError("item_type");
                    setForm((prev) => ({ ...prev, item_type: value, spec_values: createEmptyListingSpecValues(prev.category as Category, prev.subcategory, value) }));
                    setShowAdvancedSpecs(false);
                  }} />
                  {fieldErrors.item_type ? <p className="mt-1 text-xs text-red-600">{fieldErrors.item_type}</p> : null}
                </div>
              </div>
              {form.subcategory && form.item_type && selectedItemConfig ? (
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                    <p className="text-sm font-bold text-zinc-900">Required details</p>
                    <div className="mt-4 grid gap-4">
                      {basicSpecFields.map(renderSpecField)}
                    </div>
                  </div>
                  {advancedSpecFields.length > 0 ? (
                    <button type="button" onClick={() => setShowAdvancedSpecs((prev) => !prev)} className="text-left text-sm font-bold text-primary hover:underline">
                      {showAdvancedSpecs ? "Hide optional details" : `Add optional details (${advancedSpecFields.length})`}
                    </button>
                  ) : null}
                  {showAdvancedSpecs && advancedSpecFields.length > 0 ? (
                    <div className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-4">
                      {advancedSpecFields.map(renderSpecField)}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      </div>

      <section className="mt-8 border-t border-zinc-200 pt-6">
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} className="rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-extrabold text-zinc-700 hover:bg-zinc-50">
            Cancel
          </button>
          <button type="button" onClick={() => void handleSave()} disabled={isSubmitting || uploadingMedia} className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800 disabled:opacity-50">
            {isSubmitting || uploadingMedia ? resolvedSubmitBusyLabel : resolvedSubmitLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
