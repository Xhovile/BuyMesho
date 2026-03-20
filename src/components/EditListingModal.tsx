import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Listing, Category, University, ListingSpecValue } from "../types";
import { CATEGORIES, UNIVERSITIES } from "../constants";
import FormDropdown from "./FormDropdown";
import {
  createEmptyListingSpecValues,
  getListingSubcategories,
  getListingItemTypes,
  getListingItemConfig,
  type ListingSpecField,
} from "../listingSchemas";

export default function EditListingModal({
  listing,
  onClose,
  onSave,
}: {
  listing: Listing;
  onClose: () => void;
  onSave: (updated: Partial<Listing>) => void;
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
  });

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
    });
  }, [listing]);

  const isSchemaDrivenCategory = form.category === "Electronics & Gadgets";

  const availableSubcategories = useMemo(() => {
    if (!isSchemaDrivenCategory) return [];
    return getListingSubcategories(form.category);
  }, [form.category, isSchemaDrivenCategory]);

  const availableItemTypes = useMemo(() => {
    if (!isSchemaDrivenCategory || !form.subcategory) return [];
    return getListingItemTypes(form.category, form.subcategory);
  }, [form.category, form.subcategory, isSchemaDrivenCategory]);

  const selectedItemConfig = useMemo(() => {
    if (!isSchemaDrivenCategory || !form.subcategory || !form.item_type) {
      return null;
    }

    return getListingItemConfig(form.category, form.subcategory, form.item_type);
  }, [form.category, form.subcategory, form.item_type, isSchemaDrivenCategory]);

  const handleCategoryChange = (category: Category) => {
    setForm((prev) => ({
      ...prev,
      category,
      subcategory: "",
      item_type: "",
      spec_values: {},
    }));
  };

  const handleSubcategoryChange = (subcategory: string) => {
    setForm((prev) => ({
      ...prev,
      subcategory,
      item_type: "",
      spec_values: {},
    }));
  };

  const handleItemTypeChange = (itemType: string) => {
    setForm((prev) => ({
      ...prev,
      item_type: itemType,
      spec_values: createEmptyListingSpecValues(
        prev.category as Category,
        prev.subcategory,
        itemType
      ),
    }));
  };

  const handleSpecValueChange = (key: string, value: ListingSpecValue) => {
    setForm((prev) => ({
      ...prev,
      spec_values: {
        ...prev.spec_values,
        [key]: value,
      },
    }));
  };

  const renderSpecField = (field: ListingSpecField) => {
    const rawValue = form.spec_values[field.key];
    const value = rawValue === null || rawValue === undefined ? "" : rawValue;

    const isRequired =
      !!field.required || !!selectedItemConfig?.requiredKeys.includes(field.key);

    const labelText = `${field.label}${isRequired ? " *" : ""}`;

    if (field.type === "select") {
      return (
        <div key={field.key}>
          <FormDropdown
            label={labelText}
            value={typeof value === "string" ? value : ""}
            options={field.options || []}
            onChange={(option) => handleSpecValueChange(field.key, option)}
            placeholder={field.placeholder || "Select an option"}
            searchPlaceholder={`Search ${field.label.toLowerCase()}...`}
          />
          {field.helpText ? (
            <p className="mt-1 text-xs text-zinc-500">{field.helpText}</p>
          ) : null}
        </div>
      );
    }

    if (field.type === "textarea") {
      return (
        <div key={field.key}>
          <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
            {labelText}
          </label>
          <textarea
            value={value as string}
            onChange={(e) => handleSpecValueChange(field.key, e.target.value)}
            rows={3}
            className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none resize-y"
            placeholder={field.placeholder || ""}
          />
          {field.helpText ? (
            <p className="mt-1 text-xs text-zinc-500">{field.helpText}</p>
          ) : null}
        </div>
      );
    }

    if (field.type === "boolean") {
      const boolValue = typeof rawValue === "boolean" ? rawValue : null;

      return (
        <div key={field.key}>
          <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">
            {labelText}
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleSpecValueChange(field.key, true)}
              className={`px-3 py-2 rounded-xl border text-sm font-semibold transition-colors ${
                boolValue === true
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50"
              }`}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => handleSpecValueChange(field.key, false)}
              className={`px-3 py-2 rounded-xl border text-sm font-semibold transition-colors ${
                boolValue === false
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50"
              }`}
            >
              No
            </button>
          </div>
          {field.helpText ? (
            <p className="mt-1 text-xs text-zinc-500">{field.helpText}</p>
          ) : null}
        </div>
      );
    }

    if (field.type === "multiselect") {
      const selectedValues = Array.isArray(rawValue) ? rawValue : [];

      return (
        <div key={field.key}>
          <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">
            {labelText}
          </label>
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
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
          {field.helpText ? (
            <p className="mt-1 text-xs text-zinc-500">{field.helpText}</p>
          ) : null}
        </div>
      );
    }

    if (field.type === "number") {
      return (
        <div key={field.key}>
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
            className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
            placeholder={field.placeholder || ""}
          />
          {field.helpText ? (
            <p className="mt-1 text-xs text-zinc-500">{field.helpText}</p>
          ) : null}
        </div>
      );
    }

    return (
      <div key={field.key}>
        <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
          {labelText}
        </label>
        <input
          type="text"
          value={value as string}
          onChange={(e) => handleSpecValueChange(field.key, e.target.value)}
          className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
          placeholder={field.placeholder || ""}
        />
        {field.helpText ? (
          <p className="mt-1 text-xs text-zinc-500">{field.helpText}</p>
        ) : null}
      </div>
    );
  };

  const handleSave = () => {
    const priceNum = Number(form.price);
    const quantityNum = Number(form.quantity);
    const soldQuantityNum = Number(form.sold_quantity);

    if (Number.isNaN(priceNum)) {
      alert("Price must be a number.");
      return;
    }

    if (!Number.isInteger(quantityNum) || quantityNum < 1) {
      alert("Total quantity must be at least 1.");
      return;
    }

    if (!Number.isInteger(soldQuantityNum) || soldQuantityNum < 0) {
      alert("Sold quantity cannot be negative.");
      return;
    }

    if (soldQuantityNum > quantityNum) {
      alert("Sold quantity cannot be greater than total quantity.");
      return;
    }

    onSave({
      name: form.name,
      price: priceNum,
      description: form.description,
      category: form.category,
      subcategory: form.subcategory || null,
      item_type: form.item_type || null,
      spec_values: form.spec_values,
      university: form.university,
      whatsapp_number: form.whatsapp_number,
      condition: form.condition as "new" | "used" | "refurbished",
      quantity: quantityNum,
      sold_quantity: soldQuantityNum,
    });
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/60">
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

        <div className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
              Product Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Product name"
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                Price (MK)
              </label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="Price"
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                WhatsApp Number
              </label>
              <input
                type="text"
                value={form.whatsapp_number}
                onChange={(e) =>
                  setForm({ ...form, whatsapp_number: e.target.value })
                }
                placeholder="265..."
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                Total Quantity
              </label>
              <input
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                Sold Quantity
              </label>
              <input
                type="number"
                min="0"
                value={form.sold_quantity}
                onChange={(e) => setForm({ ...form, sold_quantity: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
              />
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

          {isSchemaDrivenCategory && (
            <div className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormDropdown
                  label="Subcategory"
                  value={form.subcategory}
                  options={availableSubcategories}
                  onChange={handleSubcategoryChange}
                />
                <FormDropdown
                  label="Item Type"
                  value={form.item_type}
                  options={availableItemTypes}
                  onChange={handleItemTypeChange}
                />
              </div>

              {form.subcategory && form.item_type && selectedItemConfig && (
                <div className="grid grid-cols-1 gap-4">
                  {selectedItemConfig.schema.fields.map(renderSpecField)}
                </div>
              )}
            </div>
          )}


          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Describe your item"
              rows={4}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none resize-none"
            />
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">
              Note
            </p>
            <p className="text-sm text-zinc-600">
              Media cannot be edited here yet. Create a new listing if you want
              to change photos or video.
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-zinc-100 bg-white flex gap-3">
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
