import { useEffect, useMemo, useState } from "react";
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
  const [showAdvancedSpecs, setShowAdvancedSpecs] = useState(false);

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
    setShowAdvancedSpecs(false);
  }, [listing]);

  const isSchemaDrivenCategory = form.category === "Electronics & Gadgets";

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

  const handleCategoryChange = (category: Category) => {
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
    setForm((prev) => ({
      ...prev,
      subcategory,
      item_type: "",
      spec_values: {},
    }));
    setShowAdvancedSpecs(false);
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
    setShowAdvancedSpecs(false);
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

  const renderListingSpecField = (field: ListingSpecField) => {
    const rawValue = form.spec_values[field.key];
    const value = rawValue === null || rawValue === undefined ? "" : rawValue;
    const isRequired =
      !!field.required || !!selectedItemConfig?.requiredKeys.includes(field.key);
    const labelText = `${field.label}${isRequired ? " *" : ""}`;

    if (field.type === "select") {
      return (
        <div key={field.key}>
          <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
            {labelText}
          </label>
          <select
            value={value as string}
            onChange={(e) => handleSpecValueChange(field.key, e.target.value)}
            className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
          >
            <option value="">Select {field.label}</option>
            {(field.options || []).map((option: string) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
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
            className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none h-24 resize-none"
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
          <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
            {labelText}
          </label>
          <select
            value={boolValue === null ? "" : boolValue ? "true" : "false"}
            onChange={(e) => {
              if (e.target.value === "") {
                handleSpecValueChange(field.key, null);
                return;
              }

              handleSpecValueChange(field.key, e.target.value === "true");
            }}
            className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
          >
            <option value="">Select an option</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
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

    if (isSchemaDrivenCategory) {
      if (!form.subcategory || !form.item_type) {
        alert("Please choose a subcategory and item type.");
        return;
      }

      const validation = validateListingSpecValues(
        form.category as Category,
        form.subcategory,
        form.item_type,
        form.spec_values
      );

      if (!validation.isValid) {
        alert(
          validation.errors[0]?.message ||
            "Please complete the required item details."
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

          {isSchemaDrivenCategory && (
            <>
              <div className="grid grid-cols-2 gap-4">
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
                <div className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <div>
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                      Item details
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">
                      Fill required fields marked with *.
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
                          ? "Hide advanced details"
                          : "Add advanced details"}
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
            </>
          )}

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
