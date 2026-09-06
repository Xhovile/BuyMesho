import type { Dispatch, SetStateAction } from "react";
import FormDropdown from "../components/FormDropdown";
import type { Category, ListingCondition, ListingDraft, University } from "../types";
import { CATEGORIES, UNIVERSITIES } from "../constants";
import { getConditionConfig } from "./listingStudio.constants";

type Props = {
  form: ListingDraft;
  setForm: Dispatch<SetStateAction<ListingDraft>>;
  fieldErrors: Record<string, string>;
  clearError: (key: string) => void;
  subcategories: string[];
  itemTypes: string[];
};

export default function ListingStudioFields({
  form,
  setForm,
  fieldErrors,
  clearError,
  subcategories,
  itemTypes,
}: Props) {
  const conditionConfig = getConditionConfig(form.category);

  return (
    <section className="space-y-5 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-400">Listing details</p>
        <h2 className="mt-1 text-lg font-black text-zinc-900">Give buyers the essentials</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-400">Listing title *</label>
          <input
            type="text"
            value={form.name}
            onChange={(event) => {
              clearError("name");
              setForm((prev) => ({ ...prev, name: event.target.value }));
            }}
            className={`w-full rounded-2xl border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 ${fieldErrors.name ? "border-red-500" : "border-zinc-200"}`}
            placeholder="What are you selling?"
          />
          {fieldErrors.name ? <p className="mt-1 text-xs font-semibold text-red-600">{fieldErrors.name}</p> : null}
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-400">Description *</label>
          <textarea
            value={form.description}
            onChange={(event) => {
              clearError("description");
              setForm((prev) => ({ ...prev, description: event.target.value }));
            }}
            className={`h-32 w-full resize-none rounded-2xl border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 ${fieldErrors.description ? "border-red-500" : "border-zinc-200"}`}
            placeholder="Explain what the buyer should know about this listing."
          />
          {fieldErrors.description ? <p className="mt-1 text-xs font-semibold text-red-600">{fieldErrors.description}</p> : null}
        </div>

        <FormDropdown
          label="Category"
          value={form.category}
          options={CATEGORIES as unknown as string[]}
          onChange={(value) => {
            clearError("category");
            const category = value as Category;
            setForm((prev) => ({
              ...prev,
              category,
              subcategory: "",
              item_type: "",
              spec_values: {},
              condition: (getConditionConfig(category).options[0] as ListingCondition) || prev.condition,
            }));
          }}
          placeholder="Select category"
        />

        <FormDropdown
          label="University"
          value={form.university}
          options={UNIVERSITIES as unknown as string[]}
          onChange={(value) => setForm((prev) => ({ ...prev, university: value as University }))}
          placeholder="Select university"
        />

        {subcategories.length ? (
          <div>
            <FormDropdown
              label="Subcategory"
              value={form.subcategory}
              options={subcategories}
              onChange={(value) => {
                clearError("subcategory");
                setForm((prev) => ({ ...prev, subcategory: value, item_type: "", spec_values: {} }));
              }}
              placeholder="Select subcategory"
            />
            {fieldErrors.subcategory ? <p className="mt-1 text-xs font-semibold text-red-600">{fieldErrors.subcategory}</p> : null}
          </div>
        ) : null}

        {itemTypes.length ? (
          <div>
            <FormDropdown
              label="Item type"
              value={form.item_type}
              options={itemTypes}
              onChange={(value) => {
                clearError("item_type");
                setForm((prev) => ({ ...prev, item_type: value, spec_values: {} }));
              }}
              placeholder="Select item type"
            />
            {fieldErrors.item_type ? <p className="mt-1 text-xs font-semibold text-red-600">{fieldErrors.item_type}</p> : null}
          </div>
        ) : null}

        <FormDropdown
          label={`${conditionConfig.label} *`}
          value={String(form.condition)}
          options={conditionConfig.options}
          onChange={(value) => setForm((prev) => ({ ...prev, condition: value as ListingCondition }))}
          placeholder={`Select ${conditionConfig.label.toLowerCase()}`}
        />

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-400">Quantity *</label>
          <input
            type="number"
            min="1"
            value={form.quantity}
            onChange={(event) => {
              clearError("quantity");
              setForm((prev) => ({ ...prev, quantity: event.target.value }));
            }}
            className={`w-full rounded-2xl border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 ${fieldErrors.quantity ? "border-red-500" : "border-zinc-200"}`}
          />
          {fieldErrors.quantity ? <p className="mt-1 text-xs font-semibold text-red-600">{fieldErrors.quantity}</p> : null}
        </div>
      </div>
    </section>
  );
}
