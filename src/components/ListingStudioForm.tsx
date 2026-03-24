import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { X } from "lucide-react";
import type {
  Category,
  CreateListingPayload,
  ListingDraft,
  ListingSpecValue,
  University,
} from "../types";
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

type ListingStudioFormProps = {
  mode: "create" | "edit";
  initialData: ListingDraft;
  onCancel: () => void;
  onSubmit: (payload: CreateListingPayload) => Promise<void> | void;
  showFeedback: (
    type: "success" | "error" | "info",
    title: string,
    message: string
  ) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  submitBusyLabel?: string;
};

export default function ListingStudioForm({
  mode,
  initialData,
  onCancel,
  onSubmit,
  showFeedback,
  isSubmitting = false,
  submitLabel,
  submitBusyLabel,
}: ListingStudioFormProps) {
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

  const setFieldError = (key: string, message: string) => {
    setFieldErrors((prev) => ({ ...prev, [key]: message }));
  };

  const clearFieldError = (key: string) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const hasMeaningfulTitle = (rawTitle: string) => {
    const trimmed = rawTitle.trim();
    if (trimmed.length < 3) return false;
    const alnumCount = (trimmed.match(/[a-zA-Z0-9]/g) ?? []).length;
    return alnumCount >= 3;
  };

  const isSchemaDrivenCategory =
    getListingSubcategories(form.category as Category).length > 0;

  const availableSubcategories = useMemo(() => {
    if (!isSchemaDrivenCategory) return [];
    return getListingSubcategories(form.category as Category);
  }, [isSchemaDrivenCategory, form.category]);

  const availableItemTypes = useMemo(() => {
    if (!isSchemaDrivenCategory || !form.subcategory) return [];
    return getListingItemTypes(form.category as Category, form.subcategory);
  }, [isSchemaDrivenCategory, form.category, form.subcategory]);

  const selectedItemConfig = useMemo(() => {
    if (!isSchemaDrivenCategory || !form.subcategory || !form.item_type) {
      return null;
    }

    return getListingItemConfig(
      form.category as Category,
      form.subcategory,
      form.item_type
    );
  }, [isSchemaDrivenCategory, form.category, form.subcategory, form.item_type]);

  const basicSpecFields = useMemo(() => {
    if (!isSchemaDrivenCategory || !form.subcategory || !form.item_type) {
      return [];
    }

    return getBasicListingFields(
      form.category as Category,
      form.subcategory,
      form.item_type
    );
  }, [isSchemaDrivenCategory, form.category, form.subcategory, form.item_type]);

  const advancedSpecFields = useMemo(() => {
    if (!isSchemaDrivenCategory || !form.subcategory || !form.item_type) {
      return [];
    }

    return getAdvancedListingFields(
      form.category as Category,
      form.subcategory,
      form.item_type
    );
  }, [isSchemaDrivenCategory, form.category, form.subcategory, form.item_type]);

  const requiredSpecCount = useMemo(() => {
    return selectedItemConfig?.requiredKeys.length || 0;
  }, [selectedItemConfig]);

  const completedRequiredSpecCount = useMemo(() => {
    if (!selectedItemConfig) return 0;

    return selectedItemConfig.requiredKeys.filter((key) => {
      const value = form.spec_values[key];
      return !(
        value === null ||
        value === undefined ||
        value === "" ||
        (Array.isArray(value) && value.length === 0)
      );
    }).length;
  }, [selectedItemConfig, form.spec_values]);

  const advancedSpecCount = advancedSpecFields.length;

  const handleCategoryChange = (category: Category) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.subcategory;
      delete next.item_type;
      return next;
    });

    setForm((prev) => ({
      ...prev,
      category,
      subcategory: "",
      item_type: "",
      spec_values: {},
    }));
    setShowAdvancedSpecs(false);
  };

  const handleSubcategoryChange = (subcategory: string) => {
    clearFieldError("subcategory");
    clearFieldError("item_type");
    setForm((prev) => ({
      ...prev,
      subcategory,
      item_type: "",
      spec_values: {},
    }));
    setShowAdvancedSpecs(false);
  };

  const handleItemTypeChange = (itemType: string) => {
    clearFieldError("item_type");
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (selectedItemConfig) {
        for (const field of selectedItemConfig.schema.fields) {
          delete next[field.key];
        }
      }
      return next;
    });

    setForm((prev) => ({
      ...prev,
      item_type: itemType,
      spec_values: createEmptyListingSpecValues(
        prev.category as Category,
        prev.subcategory,
        itemType
      ),
    }));
    setShowAdvancedSpecs(false);
  };

  const handleSpecValueChange = (key: string, value: ListingSpecValue) => {
    clearFieldError(key);
    setForm((prev) => ({
      ...prev,
      spec_values: {
        ...prev.spec_values,
        [key]: value,
      },
    }));
  };

  const scrollToSpecField = (fieldKey: string) => {
    const target = specFieldRefs.current[fieldKey];
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const renderListingSpecField = (field: ListingSpecField) => {
    const rawValue = form.spec_values[field.key];
    const value = rawValue === null || rawValue === undefined ? "" : rawValue;
    const isRequired =
      !!field.required || !!selectedItemConfig?.requiredKeys.includes(field.key);
    const labelText = `${field.label}${isRequired ? " *" : ""}`;
    const fieldError = fieldErrors[field.key];
    const inputClass = `w-full px-4 py-2 bg-zinc-50 border rounded-xl outline-none ${
      fieldError
        ? "border-red-500 focus:ring-2 focus:ring-red-200"
        : "border-zinc-200 focus:ring-2 focus:ring-primary/20"
    }`;

    if (field.type === "select") {
      return (
        <div key={field.key} ref={(el) => { specFieldRefs.current[field.key] = el; }}>
          <div className={fieldError ? "rounded-xl ring-2 ring-red-200" : ""}>
            <FormDropdown
              label={labelText}
              value={value as string}
              options={field.options || []}
              onChange={(selected) => handleSpecValueChange(field.key, selected)}
              placeholder={`Select ${field.label}`}
            />
          </div>
          {fieldError ? <p className="mt-1 text-xs text-red-600">{fieldError}</p> : null}
          {field.helpText ? <p className="mt-1 text-xs text-zinc-500">{field.helpText}</p> : null}
        </div>
      );
    }

    if (field.type === "textarea") {
      return (
        <div key={field.key} ref={(el) => { specFieldRefs.current[field.key] = el; }}>
          <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">{labelText}</label>
          <textarea
            value={value as string}
            onChange={(e) => handleSpecValueChange(field.key, e.target.value)}
            className={`${inputClass} h-24 resize-none`}
            placeholder={field.placeholder || ""}
          />
          {fieldError ? <p className="mt-1 text-xs text-red-600">{fieldError}</p> : null}
          {field.helpText ? <p className="mt-1 text-xs text-zinc-500">{field.helpText}</p> : null}
        </div>
      );
    }

    if (field.type === "boolean") {
      const boolValue = typeof rawValue === "boolean" ? rawValue : null;
      return (
        <div key={field.key} ref={(el) => { specFieldRefs.current[field.key] = el; }}>
          <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">{labelText}</label>
          <div className={`grid grid-cols-3 gap-2 rounded-xl ${fieldError ? "ring-2 ring-red-200 p-1" : ""}`}>
            <button type="button" onClick={() => handleSpecValueChange(field.key, null)} className={`px-3 py-2 rounded-xl border text-sm font-bold transition ${boolValue === null ? "bg-zinc-900 text-white border-zinc-900" : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100"}`}>Not set</button>
            <button type="button" onClick={() => handleSpecValueChange(field.key, true)} className={`px-3 py-2 rounded-xl border text-sm font-bold transition ${boolValue === true ? "bg-zinc-900 text-white border-zinc-900" : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100"}`}>Yes</button>
            <button type="button" onClick={() => handleSpecValueChange(field.key, false)} className={`px-3 py-2 rounded-xl border text-sm font-bold transition ${boolValue === false ? "bg-zinc-900 text-white border-zinc-900" : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100"}`}>No</button>
          </div>
          {fieldError ? <p className="mt-1 text-xs text-red-600">{fieldError}</p> : null}
          {field.helpText ? <p className="mt-1 text-xs text-zinc-500">{field.helpText}</p> : null}
        </div>
      );
    }

    if (field.type === "multiselect") {
      const selectedValues = Array.isArray(rawValue) ? rawValue : [];
      return (
        <div key={field.key} ref={(el) => { specFieldRefs.current[field.key] = el; }}>
          <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">{labelText}</label>
          <div className={`grid grid-cols-2 gap-2 rounded-xl border bg-zinc-50 p-3 ${fieldError ? "border-red-500 ring-2 ring-red-200" : "border-zinc-200"}`}>
            {(field.options || []).map((option: string) => {
              const isChecked = selectedValues.includes(option);
              return (
                <label key={option} className="flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        handleSpecValueChange(field.key, [...selectedValues, option]);
                        return;
                      }
                      handleSpecValueChange(field.key, selectedValues.filter((item: string) => item !== option));
                    }}
                  />
                  <span>{option}</span>
                </label>
              );
            })}
          </div>
          {fieldError ? <p className="mt-1 text-xs text-red-600">{fieldError}</p> : null}
          {field.helpText ? <p className="mt-1 text-xs text-zinc-500">{field.helpText}</p> : null}
        </div>
      );
    }

    if (field.type === "number") {
      return (
        <div key={field.key} ref={(el) => { specFieldRefs.current[field.key] = el; }}>
          <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">{labelText}</label>
          <input
            type="number"
            value={value === "" ? "" : String(value)}
            onChange={(e) => handleSpecValueChange(field.key, e.target.value === "" ? null : Number(e.target.value))}
            className={inputClass}
            placeholder={field.placeholder || ""}
          />
          {fieldError ? <p className="mt-1 text-xs text-red-600">{fieldError}</p> : null}
          {field.helpText ? <p className="mt-1 text-xs text-zinc-500">{field.helpText}</p> : null}
        </div>
      );
    }

    return (
      <div key={field.key} ref={(el) => { specFieldRefs.current[field.key] = el; }}>
        <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">{labelText}</label>
        <input
          type="text"
          value={value as string}
          onChange={(e) => handleSpecValueChange(field.key, e.target.value)}
          className={inputClass}
          placeholder={field.placeholder || ""}
        />
        {fieldError ? <p className="mt-1 text-xs text-red-600">{fieldError}</p> : null}
        {field.helpText ? <p className="mt-1 text-xs text-zinc-500">{field.helpText}</p> : null}
      </div>
    );
  };

  const uploadMediaFile = async (file: File) => {
    const formData = new FormData();
    formData.append("image", file);

    const res = await fetch("/api/upload/", { method: "POST", body: formData });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;

    if (!res.ok) {
      throw new Error(data?.error || "Upload failed");
    }

    return data.url as string;
  };

  const handleAddImages = async (e: ChangeEvent<HTMLInputElement>) => {
    const files: File[] = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const remaining = 5 - form.photos.length;
    const selectedFiles = files.slice(0, remaining);

    if (selectedFiles.length < files.length) {
      showFeedback("info", "Photo limit reached", "You can upload a maximum of 5 photos per listing.");
    }

    setUploadingMedia(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of selectedFiles) {
        const url = await uploadMediaFile(file);
        uploadedUrls.push(url);
      }

      setForm((prev) => ({ ...prev, photos: [...prev.photos, ...uploadedUrls].slice(0, 5) }));
      clearFieldError("photos");
    } catch (err: any) {
      showFeedback("error", "Image upload failed", err?.message || "We could not upload the images.");
    } finally {
      setUploadingMedia(false);
      e.target.value = "";
    }
  };

  const handleRemoveImage = (index: number) => {
    clearFieldError("photos");
    setForm((prev) => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) }));
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

  const handleRemoveVideo = () => {
    setForm((prev) => ({ ...prev, video_url: "" }));
  };

  const handleSave = async () => {
    setFieldErrors({});

    const priceNum = Number(form.price);
    const quantityNum = Number(form.quantity);
    const soldQuantityNum = Number(form.sold_quantity);

    if (!hasMeaningfulTitle(form.name)) {
      const message = "Please enter a clear listing title with at least 3 letters or numbers.";
      setFieldError("name", message);
      showFeedback("error", "Title needed", message);
      return;
    }

    const trimmedDescription = form.description.trim();
    if (trimmedDescription.length < 10) {
      const message = "Please enter a product description of at least 10 characters.";
      setFieldError("description", message);
      showFeedback("error", "Description needed", message);
      return;
    }

    if (!form.whatsapp_number.trim()) {
      const message = "WhatsApp number is required.";
      setFieldError("whatsapp_number", message);
      showFeedback("error", "WhatsApp number required", message);
      return;
    }

    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      const message = "Please enter a valid price greater than 0.";
      setFieldError("price", message);
      showFeedback("error", "Invalid price", message);
      return;
    }

    if (form.photos.length < 1) {
      const message = "Add at least 1 photo.";
      setFieldError("photos", message);
      showFeedback("error", "Photo required", "Add at least 1 photo so buyers can trust what is being sold.");
      return;
    }

    if (!Number.isInteger(quantityNum) || quantityNum < 1) {
      const message = "Total quantity must be a whole number of at least 1.";
      setFieldError("quantity", message);
      showFeedback("error", "Invalid quantity", message);
      return;
    }

    if (!Number.isInteger(soldQuantityNum) || soldQuantityNum < 0) {
      const message = "Sold quantity cannot be negative.";
      setFieldError("sold_quantity", message);
      showFeedback("error", "Invalid sold quantity", message);
      return;
    }

    if (soldQuantityNum > quantityNum) {
      const message = "Sold quantity cannot be greater than total quantity.";
      setFieldError("sold_quantity", message);
      showFeedback("error", "Invalid stock values", message);
      return;
    }

    if (isSchemaDrivenCategory) {
      if (!form.subcategory || !form.item_type) {
        if (!form.subcategory) setFieldError("subcategory", "Please choose a subcategory.");
        if (!form.item_type) setFieldError("item_type", "Please choose an item type.");
        showFeedback("info", "Item details needed", "Please choose a subcategory and item type first.");
        return;
      }

      const validation = validateListingSpecValues(
        form.category as Category,
        form.subcategory,
        form.item_type,
        form.spec_values
      );

      if (!validation.isValid) {
        const firstError = validation.errors[0];
        const errorKey = firstError?.key;
        const nextErrors = validation.errors.reduce<Record<string, string>>((acc, error) => {
          if (error.key) acc[error.key] = error.message;
          return acc;
        }, {});
        setFieldErrors(nextErrors);

        if (errorKey) {
          const erroredField = selectedItemConfig?.schema.fields.find((field) => field.key === errorKey);
          if (erroredField?.advanced) {
            setShowAdvancedSpecs(true);
            setTimeout(() => scrollToSpecField(errorKey), 150);
          } else {
            setTimeout(() => scrollToSpecField(errorKey), 0);
          }
        }

        showFeedback("error", "Missing or invalid details", firstError?.message || "Please complete the required item details.");
        return;
      }
    }

    try {
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
      });
    } catch {
      // parent handles submit feedback
    }
  };

  const resolvedSubmitLabel = submitLabel || (mode === "create" ? "Post Listing" : "Save Changes");
  const resolvedSubmitBusyLabel = submitBusyLabel || (mode === "create" ? "Posting..." : "Saving...");

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="p-6 overflow-y-auto flex-1">
        <div className="space-y-4 pr-1">
          <div className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Basic Info</p>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Product Name</label>
              <input type="text" className={`w-full px-4 py-3 bg-white border rounded-xl outline-none ${fieldErrors.name ? "border-red-500 focus:ring-2 focus:ring-red-200" : "border-zinc-200 focus:ring-2 focus:ring-primary/20"}`} value={form.name} onChange={(e) => { clearFieldError("name"); setForm({ ...form, name: e.target.value }); }} />
              {fieldErrors.name ? <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p> : null}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Price (MK)</label>
                <input type="number" className={`w-full px-4 py-3 bg-white border rounded-xl outline-none ${fieldErrors.price ? "border-red-500 focus:ring-2 focus:ring-red-200" : "border-zinc-200 focus:ring-2 focus:ring-primary/20"}`} value={form.price} onChange={(e) => { clearFieldError("price"); setForm({ ...form, price: e.target.value }); }} />
                {fieldErrors.price ? <p className="mt-1 text-xs text-red-600">{fieldErrors.price}</p> : null}
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">WhatsApp Number</label>
                <input type="text" placeholder="265..." className={`w-full px-4 py-3 bg-white border rounded-xl outline-none ${fieldErrors.whatsapp_number ? "border-red-500 focus:ring-2 focus:ring-red-200" : "border-zinc-200 focus:ring-2 focus:ring-primary/20"}`} value={form.whatsapp_number} onChange={(e) => { clearFieldError("whatsapp_number"); setForm({ ...form, whatsapp_number: e.target.value }); }} />
                {fieldErrors.whatsapp_number ? <p className="mt-1 text-xs text-red-600">{fieldErrors.whatsapp_number}</p> : null}
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Listing Setup</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Total Quantity</label>
                <input type="number" min="1" className={`w-full px-4 py-3 bg-white border rounded-xl outline-none ${fieldErrors.quantity ? "border-red-500 focus:ring-2 focus:ring-red-200" : "border-zinc-200 focus:ring-2 focus:ring-primary/20"}`} value={form.quantity} onChange={(e) => { clearFieldError("quantity"); setForm({ ...form, quantity: e.target.value }); }} />
                {fieldErrors.quantity ? <p className="mt-1 text-xs text-red-600">{fieldErrors.quantity}</p> : null}
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Sold Quantity</label>
                <input type="number" min="0" className={`w-full px-4 py-3 bg-white border rounded-xl outline-none ${fieldErrors.sold_quantity ? "border-red-500 focus:ring-2 focus:ring-red-200" : "border-zinc-200 focus:ring-2 focus:ring-primary/20"}`} value={form.sold_quantity} onChange={(e) => { clearFieldError("sold_quantity"); setForm({ ...form, sold_quantity: e.target.value }); }} />
                {fieldErrors.sold_quantity ? <p className="mt-1 text-xs text-red-600">{fieldErrors.sold_quantity}</p> : null}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormDropdown label="Category" value={form.category} options={CATEGORIES} searchPlaceholder="Search category..." onChange={(value) => handleCategoryChange(value as Category)} />
              <FormDropdown label="University" value={form.university} options={UNIVERSITIES} searchPlaceholder="Search university..." onChange={(value) => setForm({ ...form, university: value as University })} />
            </div>
            <FormDropdown label="Condition" value={form.condition} options={["new", "used", "refurbished"]} onChange={(value) => setForm({ ...form, condition: value as "new" | "used" | "refurbished" })} />
          </div>

          <div className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Description</p>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Product Description</label>
              <textarea rows={4} className={`w-full px-4 py-3 bg-white border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none resize-none ${fieldErrors.description ? "border-red-400 ring-2 ring-red-200" : "border-zinc-200"}`} value={form.description} onChange={(e) => { clearFieldError("description"); setForm({ ...form, description: e.target.value }); }} />
              {fieldErrors.description ? <p className="mt-1 text-xs text-red-600">{fieldErrors.description}</p> : null}
            </div>
          </div>

          {isSchemaDrivenCategory && (
            <div className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Item Details</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className={fieldErrors.subcategory ? "rounded-xl ring-2 ring-red-200" : ""}>
                    <FormDropdown label="Subcategory" value={form.subcategory} options={availableSubcategories} onChange={handleSubcategoryChange} />
                  </div>
                  {fieldErrors.subcategory ? <p className="mt-1 text-xs text-red-600">{fieldErrors.subcategory}</p> : null}
                </div>
                <div>
                  <div className={fieldErrors.item_type ? "rounded-xl ring-2 ring-red-200" : ""}>
                    <FormDropdown label="Item Type" value={form.item_type} options={availableItemTypes} onChange={handleItemTypeChange} />
                  </div>
                  {fieldErrors.item_type ? <p className="mt-1 text-xs text-red-600">{fieldErrors.item_type}</p> : null}
                </div>
              </div>

              {form.subcategory && form.item_type && selectedItemConfig && (
                <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4">
                  <div>
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Item details</p>
                    <p className="text-xs text-zinc-400 mt-1">{requiredSpecCount > 0 ? `${completedRequiredSpecCount}/${requiredSpecCount} required fields completed. Fill required fields marked with *.` : "Fill required fields marked with *."}</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4">{basicSpecFields.map(renderListingSpecField)}</div>
                  {advancedSpecFields.length > 0 && (
                    <div>
                      <button type="button" onClick={() => setShowAdvancedSpecs((prev) => !prev)} className="text-sm font-bold text-primary hover:underline">
                        {showAdvancedSpecs ? "Hide optional advanced details" : `Add optional advanced details (${advancedSpecCount})`}
                      </button>
                    </div>
                  )}
                  {showAdvancedSpecs && advancedSpecFields.length > 0 && (
                    <div className="grid grid-cols-1 gap-4 border-t border-zinc-200 pt-4">{advancedSpecFields.map(renderListingSpecField)}</div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Media</p>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Photos (max 5)</label>
              {form.photos.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {form.photos.map((url, idx) => (
                    <div key={`${url}-${idx}`} className="relative aspect-square rounded-xl overflow-hidden border bg-zinc-100">
                      <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => handleRemoveImage(idx)} className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              )}
              <input type="file" accept="image/*" multiple onChange={handleAddImages} disabled={uploadingMedia || form.photos.length >= 5} className={`w-full rounded-xl border p-2 ${fieldErrors.photos ? "border-red-500 ring-2 ring-red-200" : "border-zinc-200"}`} />
              {fieldErrors.photos ? <p className="mt-1 text-xs text-red-600">{fieldErrors.photos}</p> : null}
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Video (optional, 1)</label>
              {form.video_url ? (
                <div className="relative rounded-xl overflow-hidden border bg-zinc-100 mb-3">
                  <video src={form.video_url} controls className="w-full" />
                  <button type="button" onClick={handleRemoveVideo} className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"><X className="w-4 h-4" /></button>
                </div>
              ) : null}
              <input type="file" accept="video/*" onChange={handleReplaceVideo} disabled={uploadingMedia} className="w-full" />
            </div>
          </div>
        </div>

        <div className="hidden sm:block rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 mt-4">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Note</p>
          <p className="text-sm text-zinc-600">You can upload up to 5 photos and 1 video. Buyers trust clearer listings, so complete the required fields carefully before submitting.</p>
        </div>
      </div>

      <div className="p-6 border-t border-zinc-100 bg-white flex gap-3 flex-shrink-0">
        <button type="button" onClick={onCancel} className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 py-3 rounded-xl font-bold transition-colors">Cancel</button>
        <button type="button" onClick={() => { void handleSave(); }} disabled={uploadingMedia || isSubmitting} className={`flex-1 bg-zinc-900 text-white py-3 rounded-xl font-bold transition-colors ${uploadingMedia || isSubmitting ? "opacity-50 cursor-not-allowed" : "hover:bg-zinc-800"}`}>
          {uploadingMedia || isSubmitting ? resolvedSubmitBusyLabel : resolvedSubmitLabel}
        </button>
      </div>
    </div>
  );
}
