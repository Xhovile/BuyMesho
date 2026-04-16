import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { X } from "lucide-react";
import { Listing, Category, University, ListingSpecValue } from "../types";
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

export default function EditListingModal({
  listing,
  onClose,
  onSave,
  showFeedback,
}: {
  listing: Listing;
  onClose: () => void;
  onSave: (updated: Partial<Listing>) => void;
  showFeedback: (
    type: "success" | "error" | "info",
    title: string,
    message: string
  ) => void;
}) {
  const [form, setForm] = useState({
    name: listing.name || "",
    price: String(listing.price ?? ""),
    description: listing.description || "",
    category: listing.category || "",
    subcategory: listing.subcategory || "",
    item_type: listing.item_type || "",
    spec_values: listing.spec_values || {},
    university: listing.university || "",
    condition: listing.condition || "used",
    whatsapp_number: listing.whatsapp_number || "",
    quantity: String(listing.quantity ?? 1),
    sold_quantity: String(listing.sold_quantity ?? 0),
    photos: listing.photos || [],
    video_url: listing.video_url || "",
  });
  const [showAdvancedSpecs, setShowAdvancedSpecs] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string>>({});
  const editSpecFieldRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    setForm({
      name: listing.name || "",
      price: String(listing.price ?? ""),
      description: listing.description || "",
      category: listing.category || "",
      subcategory: listing.subcategory || "",
      item_type: listing.item_type || "",
      spec_values: listing.spec_values || {},
      university: listing.university || "",
      condition: listing.condition || "used",
      whatsapp_number: listing.whatsapp_number || "",
      quantity: String(listing.quantity ?? 1),
      sold_quantity: String(listing.sold_quantity ?? 0),
      photos: listing.photos || [],
      video_url: listing.video_url || "",
    });
    setShowAdvancedSpecs(false);
    setEditFieldErrors({});
  }, [listing]);

  const setEditFieldError = (key: string, message: string) => {
    setEditFieldErrors((prev) => ({
      ...prev,
      [key]: message,
    }));
  };

  const clearEditFieldError = (key: string) => {
    setEditFieldErrors((prev) => {
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
    setEditFieldErrors((prev) => {
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
    clearEditFieldError("subcategory");
    clearEditFieldError("item_type");

    setForm((prev) => ({
      ...prev,
      subcategory,
      item_type: "",
      spec_values: {},
    }));
    setShowAdvancedSpecs(false);
  };

  const handleItemTypeChange = (itemType: string) => {
    clearEditFieldError("item_type");
    setEditFieldErrors((prev) => {
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
    clearEditFieldError(key);
    setForm((prev) => ({
      ...prev,
      spec_values: {
        ...prev.spec_values,
        [key]: value,
      },
    }));
  };

  const scrollToEditSpecField = (fieldKey: string) => {
    const target = editSpecFieldRefs.current[fieldKey];
    if (!target) return;

    target.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  const renderListingSpecField = (field: ListingSpecField) => {
    const rawValue = form.spec_values[field.key];
    const value = rawValue === null || rawValue === undefined ? "" : rawValue;
    const isRequired =
      !!field.required || !!selectedItemConfig?.requiredKeys.includes(field.key);
    const labelText = `${field.label}${isRequired ? " *" : ""}`;
    const fieldError = editFieldErrors[field.key];
    const inputClass = `w-full px-4 py-2 bg-zinc-50 border rounded-xl outline-none ${
      fieldError
        ? "border-red-500 focus:ring-2 focus:ring-red-200"
        : "border-zinc-200 focus:ring-2 focus:ring-primary/20"
    }`;

    if (field.type === "select") {
      return (
        <div
          key={field.key}
          ref={(el) => {
            editSpecFieldRefs.current[field.key] = el;
          }}
        >
          <div className={fieldError ? "rounded-xl ring-2 ring-red-200" : ""}>
            <FormDropdown
              label={labelText}
              value={value as string}
              options={field.options || []}
              onChange={(selected) => handleSpecValueChange(field.key, selected)}
              placeholder={`Select ${field.label}`}
            />
          </div>
          {fieldError ? (
            <p className="mt-1 text-xs text-red-600">{fieldError}</p>
          ) : null}
          {field.helpText ? (
            <p className="mt-1 text-xs text-zinc-500">{field.helpText}</p>
          ) : null}
        </div>
      );
    }

    if (field.type === "textarea") {
      return (
        <div
          key={field.key}
          ref={(el) => {
            editSpecFieldRefs.current[field.key] = el;
          }}
        >
          <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
            {labelText}
          </label>
          <textarea
            value={value as string}
            onChange={(e) => handleSpecValueChange(field.key, e.target.value)}
            className={`${inputClass} h-24 resize-none`}
            placeholder={field.placeholder || ""}
          />
          {fieldError ? (
            <p className="mt-1 text-xs text-red-600">{fieldError}</p>
          ) : null}
          {field.helpText ? (
            <p className="mt-1 text-xs text-zinc-500">{field.helpText}</p>
          ) : null}
        </div>
      );
    }

    if (field.type === "boolean") {
      const boolValue = typeof rawValue === "boolean" ? rawValue : null;

      return (
        <div
          key={field.key}
          ref={(el) => {
            editSpecFieldRefs.current[field.key] = el;
          }}
        >
          <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
            {labelText}
          </label>
          <div
            className={`grid grid-cols-3 gap-2 rounded-xl ${
              fieldError ? "ring-2 ring-red-200 p-1" : ""
            }`}
          >
            <button
              type="button"
              onClick={() => handleSpecValueChange(field.key, null)}
              className={`px-3 py-2 rounded-xl border text-sm font-bold transition ${
                boolValue === null
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100"
              }`}
            >
              Not set
            </button>
            <button
              type="button"
              onClick={() => handleSpecValueChange(field.key, true)}
              className={`px-3 py-2 rounded-xl border text-sm font-bold transition ${
                boolValue === true
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100"
              }`}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => handleSpecValueChange(field.key, false)}
              className={`px-3 py-2 rounded-xl border text-sm font-bold transition ${
                boolValue === false
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100"
              }`}
            >
              No
            </button>
          </div>
          {fieldError ? (
            <p className="mt-1 text-xs text-red-600">{fieldError}</p>
          ) : null}
          {field.helpText ? (
            <p className="mt-1 text-xs text-zinc-500">{field.helpText}</p>
          ) : null}
        </div>
      );
    }

    if (field.type === "multiselect") {
      const selectedValues = Array.isArray(rawValue) ? rawValue : [];

      return (
        <div
          key={field.key}
          ref={(el) => {
            editSpecFieldRefs.current[field.key] = el;
          }}
        >
          <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">
            {labelText}
          </label>
          <div
            className={`grid grid-cols-2 gap-2 rounded-xl border bg-zinc-50 p-3 ${
              fieldError ? "border-red-500 ring-2 ring-red-200" : "border-zinc-200"
            }`}
          >
            {(field.options || []).map((option: string) => {
              const isChecked = selectedValues.includes(option);

              return (
                <label
                  key={option}
                  className="flex items-center gap-2 text-sm text-zinc-700"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        handleSpecValueChange(field.key, [
                          ...selectedValues,
                          option,
                        ]);
                        return;
                      }

                      handleSpecValueChange(
                        field.key,
                        selectedValues.filter((item: string) => item !== option)
                      );
                    }}
                  />
                  <span>{option}</span>
                </label>
              );
            })}
          </div>
          {fieldError ? (
            <p className="mt-1 text-xs text-red-600">{fieldError}</p>
          ) : null}
          {field.helpText ? (
            <p className="mt-1 text-xs text-zinc-500">{field.helpText}</p>
          ) : null}
        </div>
      );
    }

    if (field.type === "number") {
      return (
        <div
          key={field.key}
          ref={(el) => {
            editSpecFieldRefs.current[field.key] = el;
          }}
        >
          <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
            {labelText}
          </label>
          <input
            type="number"
            value={value === "" ? "" : String(value)}
            onChange={(e) =>
              handleSpecValueChange(
                field.key,
                e.target.value === "" ? null : Number(e.target.value)
              )
            }
            className={inputClass}
            placeholder={field.placeholder || ""}
          />
          {fieldError ? (
            <p className="mt-1 text-xs text-red-600">{fieldError}</p>
          ) : null}
          {field.helpText ? (
            <p className="mt-1 text-xs text-zinc-500">{field.helpText}</p>
          ) : null}
        </div>
      );
    }

    return (
      <div
        key={field.key}
        ref={(el) => {
          editSpecFieldRefs.current[field.key] = el;
        }}
      >
        <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
          {labelText}
        </label>
        <input
          type="text"
          value={value as string}
          onChange={(e) => handleSpecValueChange(field.key, e.target.value)}
          className={inputClass}
          placeholder={field.placeholder || ""}
        />
        {fieldError ? (
          <p className="mt-1 text-xs text-red-600">{fieldError}</p>
        ) : null}
        {field.helpText ? (
          <p className="mt-1 text-xs text-zinc-500">{field.helpText}</p>
        ) : null}
      </div>
    );
  };

  const uploadMediaFile = async (file: File) => {
    const formData = new FormData();
    formData.append("image", file);

    const res = await fetch("/api/upload/", {
      method: "POST",
      body: formData,
    });

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
      showFeedback(
        "info",
        "Photo limit reached",
        "You can upload a maximum of 5 photos per listing."
      );
    }

    setUploadingMedia(true);
    try {
      const uploadedUrls: string[] = [];

      for (const file of selectedFiles) {
        const url = await uploadMediaFile(file);
        uploadedUrls.push(url);
      }

      setForm((prev) => ({
        ...prev,
        photos: [...prev.photos, ...uploadedUrls].slice(0, 5),
      }));
      clearEditFieldError("photos");
    } catch (err: any) {
      showFeedback(
        "error",
        "Image upload failed",
        err?.message || "We could not upload the images."
      );
    } finally {
      setUploadingMedia(false);
      e.target.value = "";
    }
  };

  const handleRemoveImage = (index: number) => {
    clearEditFieldError("photos");
    setForm((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

  const handleReplaceVideo = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingMedia(true);
    try {
      const url = await uploadMediaFile(file);
      setForm((prev) => ({
        ...prev,
        video_url: url,
      }));
    } catch (err: any) {
      showFeedback(
        "error",
        "Video upload failed",
        err?.message || "We could not upload the video."
      );
    } finally {
      setUploadingMedia(false);
      e.target.value = "";
    }
  };

  const handleRemoveVideo = () => {
    setForm((prev) => ({
      ...prev,
      video_url: "",
    }));
  };

  const handleSave = () => {
    setEditFieldErrors({});

    const priceNum = Number(form.price);
    const quantityNum = Number(form.quantity);
    const soldQuantityNum = Number(form.sold_quantity);

    if (!hasMeaningfulTitle(form.name)) {
      const message =
        "Please enter a clear listing title with at least 3 letters or numbers.";
      setEditFieldError("name", message);
      showFeedback("error", "Title needed", message);
      return;
    }

    const trimmedDescription = form.description.trim();
    if (trimmedDescription.length < 10) {
      const message = "Please enter a product description of at least 10 characters.";
      setEditFieldError("description", message);
      showFeedback("error", "Description needed", message);
      return;
    }

    if (!form.whatsapp_number.trim()) {
      const message = "WhatsApp number is required.";
      setEditFieldError("whatsapp_number", message);
      showFeedback("error", "WhatsApp number required", message);
      return;
    }

    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      const message = "Please enter a valid price greater than 0.";
      setEditFieldError("price", message);
      showFeedback("error", "Invalid price", message);
      return;
    }

    if (form.photos.length < 1) {
      const message = "Add at least 1 photo.";
      setEditFieldError("photos", message);
      showFeedback(
        "error",
        "Photo required",
        "Add at least 1 photo so buyers can trust what is being sold."
      );
      return;
    }

    if (!Number.isInteger(quantityNum) || quantityNum < 1) {
      const message = "Total quantity must be a whole number of at least 1.";
      setEditFieldError("quantity", message);
      showFeedback("error", "Invalid quantity", message);
      return;
    }

    if (!Number.isInteger(soldQuantityNum) || soldQuantityNum < 0) {
      const message = "Sold quantity cannot be negative.";
      setEditFieldError("sold_quantity", message);
      showFeedback("error", "Invalid sold quantity", message);
      return;
    }

    if (soldQuantityNum > quantityNum) {
      const message = "Sold quantity cannot be greater than total quantity.";
      setEditFieldError("sold_quantity", message);
      showFeedback("error", "Invalid stock values", message);
      return;
    }

    if (isSchemaDrivenCategory) {
      if (!form.subcategory || !form.item_type) {
        if (!form.subcategory) {
          setEditFieldError("subcategory", "Please choose a subcategory.");
        }
        if (!form.item_type) {
          setEditFieldError("item_type", "Please choose an item type.");
        }
        showFeedback(
          "info",
          "Item details needed",
          "Please choose a subcategory and item type first."
        );
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
        const nextErrors = validation.errors.reduce<Record<string, string>>(
          (acc, error) => {
            if (error.key) {
              acc[error.key] = error.message;
            }
            return acc;
          },
          {}
        );
        setEditFieldErrors(nextErrors);

        if (errorKey) {
          const erroredField = selectedItemConfig?.schema.fields.find(
            (field) => field.key === errorKey
          );

          if (erroredField?.advanced) {
            setShowAdvancedSpecs(true);
            setTimeout(() => {
              scrollToEditSpecField(errorKey);
            }, 150);
          } else {
            setTimeout(() => {
              scrollToEditSpecField(errorKey);
            }, 0);
          }
        }

        showFeedback(
          "error",
          "Missing or invalid details",
          firstError?.message || "Please complete the required item details."
        );
        return;
      }
    }

    onSave({
      name: form.name,
      price: priceNum,
      description: form.description,
      category: form.category as Category,
      subcategory: form.subcategory || null,
      item_type: form.item_type || null,
      spec_values: isSchemaDrivenCategory ? form.spec_values : {},
      university: form.university as University,
      whatsapp_number: form.whatsapp_number,
      condition: form.condition as "new" | "used" | "refurbished",
      quantity: quantityNum,
      sold_quantity: soldQuantityNum,
      photos: form.photos,
      video_url: form.video_url || null,
    });
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div
        className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-3xl bg-white rounded-3xl overflow-hidden shadow-2xl h-[92vh] flex flex-col">
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/60 flex-shrink-0">
          <div>
            <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">
              Edit Listing
            </h2>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">
              Update your listing details
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 hover:bg-white hover:shadow-md rounded-2xl transition-all border border-transparent hover:border-zinc-100"
            aria-label="Close edit listing modal"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <div className="p-6 flex-1 min-h-0 flex flex-col gap-4">
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
            <div className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                Basic Info
              </p>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => {
                    clearEditFieldError("name");
                    setForm({ ...form, name: e.target.value });
                  }}
                  placeholder="Product name"
                  className={`w-full px-4 py-3 bg-white border rounded-xl outline-none ${
                    editFieldErrors.name
                      ? "border-red-500 focus:ring-2 focus:ring-red-200"
                      : "border-zinc-200 focus:ring-2 focus:ring-primary/20"
                  }`}
                />
                {editFieldErrors.name ? (
                  <p className="mt-1 text-xs text-red-600">{editFieldErrors.name}</p>
                ) : null}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                    Price (MK)
                  </label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => {
                      clearEditFieldError("price");
                      setForm({ ...form, price: e.target.value });
                    }}
                    placeholder="Price"
                    className={`w-full px-4 py-3 bg-white border rounded-xl outline-none ${
                      editFieldErrors.price
                        ? "border-red-500 focus:ring-2 focus:ring-red-200"
                        : "border-zinc-200 focus:ring-2 focus:ring-primary/20"
                    }`}
                  />
                  {editFieldErrors.price ? (
                    <p className="mt-1 text-xs text-red-600">{editFieldErrors.price}</p>
                  ) : null}
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                    WhatsApp Number
                  </label>
                  <input
                    type="text"
                    value={form.whatsapp_number}
                    onChange={(e) => {
                      clearEditFieldError("whatsapp_number");
                      setForm({ ...form, whatsapp_number: e.target.value });
                    }}
                    placeholder="265..."
                    className={`w-full px-4 py-3 bg-white border rounded-xl outline-none ${
                      editFieldErrors.whatsapp_number
                        ? "border-red-500 focus:ring-2 focus:ring-red-200"
                        : "border-zinc-200 focus:ring-2 focus:ring-primary/20"
                    }`}
                  />
                  {editFieldErrors.whatsapp_number ? (
                    <p className="mt-1 text-xs text-red-600">
                      {editFieldErrors.whatsapp_number}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                Listing Setup
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                    Total Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.quantity}
                    onChange={(e) => {
                      clearEditFieldError("quantity");
                      setForm({ ...form, quantity: e.target.value });
                    }}
                    className={`w-full px-4 py-3 bg-white border rounded-xl outline-none ${
                      editFieldErrors.quantity
                        ? "border-red-500 focus:ring-2 focus:ring-red-200"
                        : "border-zinc-200 focus:ring-2 focus:ring-primary/20"
                    }`}
                  />
                  {editFieldErrors.quantity ? (
                    <p className="mt-1 text-xs text-red-600">{editFieldErrors.quantity}</p>
                  ) : null}
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                    Sold Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.sold_quantity}
                    onChange={(e) => {
                      clearEditFieldError("sold_quantity");
                      setForm({ ...form, sold_quantity: e.target.value });
                    }}
                    className={`w-full px-4 py-3 bg-white border rounded-xl outline-none ${
                      editFieldErrors.sold_quantity
                        ? "border-red-500 focus:ring-2 focus:ring-red-200"
                        : "border-zinc-200 focus:ring-2 focus:ring-primary/20"
                    }`}
                  />
                  {editFieldErrors.sold_quantity ? (
                    <p className="mt-1 text-xs text-red-600">{editFieldErrors.sold_quantity}</p>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormDropdown
                  label="Category"
                  value={form.category}
                  options={CATEGORIES}
                  searchPlaceholder="Search category..."
                  onChange={(value) => handleCategoryChange(value as Category)}
                />

                <FormDropdown
                  label="University"
                  value={form.university}
                  options={UNIVERSITIES}
                  searchPlaceholder="Search university..."
                  onChange={(value) =>
                    setForm({ ...form, university: value as University })
                  }
                />
              </div>

              <FormDropdown
                label="Condition"
                value={form.condition}
                options={["new", "used", "refurbished"]}
                onChange={(value) =>
                  setForm({
                    ...form,
                    condition: value as "new" | "used" | "refurbished",
                  })
                }
              />
            </div>

            <div className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                Description
              </p>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => {
                    clearEditFieldError("description");
                    setForm({ ...form, description: e.target.value });
                  }}
                  placeholder="Describe your item"
                  rows={4}
                  className={`w-full px-4 py-3 bg-white border rounded-xl focus:ring-2 outline-none resize-none ${
                    editFieldErrors.description
                      ? "border-red-400 ring-2 ring-red-200"
                      : "border-zinc-200 focus:ring-primary/20"
                  }`}
                />
                {editFieldErrors.description ? (
                  <p className="mt-1 text-xs text-red-600">{editFieldErrors.description}</p>
                ) : null}
              </div>
            </div>

            {isSchemaDrivenCategory && (
              <div className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                  Item Details
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div
                      className={
                        editFieldErrors.subcategory ? "rounded-xl ring-2 ring-red-200" : ""
                      }
                    >
                      <FormDropdown
                        label="Subcategory"
                        value={form.subcategory}
                        options={availableSubcategories}
                        onChange={handleSubcategoryChange}
                      />
                    </div>
                    {editFieldErrors.subcategory ? (
                      <p className="mt-1 text-xs text-red-600">{editFieldErrors.subcategory}</p>
                    ) : null}
                  </div>

                  <div>
                    <div
                      className={
                        editFieldErrors.item_type ? "rounded-xl ring-2 ring-red-200" : ""
                      }
                    >
                      <FormDropdown
                        label="Item Type"
                        value={form.item_type}
                        options={availableItemTypes}
                        onChange={handleItemTypeChange}
                      />
                    </div>
                    {editFieldErrors.item_type ? (
                      <p className="mt-1 text-xs text-red-600">{editFieldErrors.item_type}</p>
                    ) : null}
                  </div>
                </div>

                {form.subcategory && form.item_type && selectedItemConfig && (
                  <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4">
                    <div>
                      <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                        Item details
                      </p>
                      <p className="text-xs text-zinc-400 mt-1">
                        {requiredSpecCount > 0
                          ? `${completedRequiredSpecCount}/${requiredSpecCount} required fields completed. Fill required fields marked with *.`
                          : "Fill required fields marked with *."}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {basicSpecFields.map(renderListingSpecField)}
                    </div>

                    {advancedSpecFields.length > 0 && (
                      <div>
                        <button
                          type="button"
                          onClick={() => setShowAdvancedSpecs((prev) => !prev)}
                          className="text-sm font-bold text-primary hover:underline"
                        >
                          {showAdvancedSpecs
                            ? "Hide optional advanced details"
                            : `Add optional advanced details (${advancedSpecCount})`}
                        </button>
                      </div>
                    )}

                    {showAdvancedSpecs && advancedSpecFields.length > 0 && (
                      <div className="grid grid-cols-1 gap-4 border-t border-zinc-200 pt-4">
                        {advancedSpecFields.map(renderListingSpecField)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                Media
              </p>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                  Photos (max 5)
                </label>

                {form.photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    {form.photos.map((url, idx) => (
                      <div
                        key={`${url}-${idx}`}
                        className="relative aspect-square rounded-xl overflow-hidden border bg-zinc-100"
                      >
                        <img
                          src={url}
                          alt={`Photo ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleAddImages}
                  disabled={uploadingMedia || form.photos.length >= 5}
                  className={`w-full rounded-xl border p-2 ${
                    editFieldErrors.photos
                      ? "border-red-500 ring-2 ring-red-200"
                      : "border-zinc-200"
                  }`}
                />
                {editFieldErrors.photos ? (
                  <p className="mt-1 text-xs text-red-600">{editFieldErrors.photos}</p>
                ) : null}
              </div>

              <div className="mt-4">
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                  Video (optional, 1)
                </label>

                {form.video_url ? (
                  <div className="relative rounded-xl overflow-hidden border bg-zinc-100 mb-3">
                    <video src={form.video_url} controls className="w-full" />
                    <button
                      type="button"
                      onClick={handleRemoveVideo}
                      className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : null}

                <input
                  type="file"
                  accept="video/*"
                  onChange={handleReplaceVideo}
                  disabled={uploadingMedia}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          <div className="hidden sm:block rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">
              Note
            </p>
            <p className="text-sm text-zinc-600">
              You can upload up to 5 photos and 1 video. Changes are saved when
              you click Save Changes.
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-zinc-100 bg-white flex gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 py-3 rounded-xl font-bold transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white py-3 rounded-xl font-bold transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
