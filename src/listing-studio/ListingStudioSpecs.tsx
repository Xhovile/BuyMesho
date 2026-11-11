import type { Dispatch, SetStateAction } from "react";
import FormDropdown from "../components/FormDropdown";
import type { ListingDraft } from "../types";
import type { ListingSpecField } from "../listingSchemas";

type Props = {
  basicFields: ListingSpecField[];
  advancedFields: ListingSpecField[];
  selectedItemConfig?: { requiredKeys: string[] } | null;
  form: ListingDraft;
  setForm: Dispatch<SetStateAction<ListingDraft>>;
  fieldErrors: Record<string, string>;
  clearError: (key: string) => void;
  showAdvanced: boolean;
  setShowAdvanced: (value: boolean) => void;
};

export default function ListingStudioSpecs({
  basicFields,
  advancedFields,
  selectedItemConfig,
  form,
  setForm,
  fieldErrors,
  clearError,
  showAdvanced,
  setShowAdvanced,
}: Props) {
  const renderField = (field: ListingSpecField) => {
    const rawValue = form.spec_values[field.key];
    const value = rawValue ?? "";
    const error = fieldErrors[field.key];
    const required = !!field.required || !!selectedItemConfig?.requiredKeys.includes(field.key);
    const label = `${field.label}${required ? " *" : ""}`;
    const update = (nextValue: unknown) => {
      clearError(field.key);
      setForm((prev) => ({
        ...prev,
        spec_values: { ...prev.spec_values, [field.key]: nextValue as any },
      }));
    };

    const fieldShellClass = error ? "rounded-xl ring-2 ring-red-200" : "";
    const inputClass = `w-full rounded-2xl border bg-bm-surface px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 ${
      error ? "border-red-500" : "border-bm-border"
    }`;

    if (field.type === "select") {
      return (
        <div key={field.key} id={`listing-spec-${field.key}`} className={fieldShellClass}>
          <FormDropdown
            label={label}
            value={String(value)}
            options={field.options || []}
            onChange={update}
            placeholder={`Select ${field.label}`}
          />
          {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
        </div>
      );
    }

    if (field.type === "textarea") {
      return (
        <div key={field.key} id={`listing-spec-${field.key}`} className={fieldShellClass}>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-bm-text-subtle">{label}</label>
          <textarea
            value={String(value)}
            onChange={(event) => update(event.target.value)}
            className={`${inputClass} h-24 resize-none`}
          />
          {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
        </div>
      );
    }

    if (field.type === "boolean") {
      const boolValue = typeof rawValue === "boolean" ? rawValue : null;
      return (
        <div key={field.key} id={`listing-spec-${field.key}`} className={fieldShellClass}>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-bm-text-subtle">{label}</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Not set", value: null },
              { label: "Yes", value: true },
              { label: "No", value: false },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => update(item.value)}
                className={`rounded-2xl border px-3 py-2 text-sm font-bold ${
                  boolValue === item.value
                    ? "border-bm-brand bg-bm-brand text-bm-on-brand"
                    : "border-bm-border bg-bm-surface text-bm-text-muted"
                }`}
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
        <div key={field.key} id={`listing-spec-${field.key}`} className={fieldShellClass}>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-bm-text-subtle">{label}</label>
          <div className={`grid grid-cols-2 gap-2 rounded-2xl border bg-bm-surface p-3 ${error ? "border-red-500" : "border-bm-border"}`}>
            {(field.options || []).map((option) => {
              const checked = selectedValues.includes(option);
              return (
                <label key={option} className="flex items-center gap-2 text-sm text-bm-text-muted">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) =>
                      update(
                        event.target.checked
                          ? [...selectedValues, option]
                          : selectedValues.filter((item: string) => item !== option)
                      )
                    }
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
        <div key={field.key} id={`listing-spec-${field.key}`} className={fieldShellClass}>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-bm-text-subtle">{label}</label>
          <input
            type="number"
            value={value === "" ? "" : String(value)}
            onChange={(event) => update(event.target.value === "" ? null : Number(event.target.value))}
            className={inputClass}
          />
          {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
        </div>
      );
    }

    return (
      <div key={field.key} id={`listing-spec-${field.key}`} className={fieldShellClass}>
        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-bm-text-subtle">{label}</label>
        <input
          type="text"
          value={String(value)}
          onChange={(event) => update(event.target.value)}
          className={inputClass}
        />
        {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
      </div>
    );
  };

  if (!basicFields.length && !advancedFields.length) return null;

  return (
    <section className="space-y-5 rounded-3xl border border-bm-border bg-bm-surface p-5 shadow-sm sm:p-6">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-bm-text-subtle">Specifications</p>
        <h2 className="mt-1 text-lg font-black text-zinc-900">Describe the actual item</h2>
      </div>

      {basicFields.length ? <div className="grid gap-4 md:grid-cols-2">{basicFields.map(renderField)}</div> : null}

      {advancedFields.length ? (
        <div className="border-t border-bm-border-subtle pt-5">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-left text-sm font-extrabold text-bm-text"
          >
            {showAdvanced ? "Hide advanced specifications" : "Show advanced specifications"}
          </button>
          {showAdvanced ? <div className="mt-4 grid gap-4 md:grid-cols-2">{advancedFields.map(renderField)}</div> : null}
        </div>
      ) : null}
    </section>
  );
}
