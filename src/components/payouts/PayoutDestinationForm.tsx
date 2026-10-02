import { useMemo } from "react";
import { Loader2, Save, ShieldCheck, X } from "lucide-react";
import FormDropdown from "../FormDropdown";
import type { PayoutProviderOption } from "../../modules/payouts/types";

export type PayoutDestinationType = "mobile_money" | "bank";

export type PayoutDestinationFormValue = {
  destinationType: PayoutDestinationType;
  providerName: string;
  providerRefId: string;
  currency: string;
  accountName: string;
  accountNumber: string;
  mobile: string;
  isDefault: boolean;
};

type PayoutDestinationFormProps = {
  value: PayoutDestinationFormValue;
  onChange: (value: PayoutDestinationFormValue) => void;
  onSave: () => void | Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  error?: string | null;
  disabled?: boolean;
  isEditing?: boolean;
  providerOptions?: PayoutProviderOption[];
};

export default function PayoutDestinationForm({
  value,
  onChange,
  onSave,
  onCancel,
  loading = false,
  error = null,
  disabled = false,
  isEditing = false,
  providerOptions = [],
}: PayoutDestinationFormProps) {
  const updateValue = <Key extends keyof PayoutDestinationFormValue>(key: Key, nextValue: PayoutDestinationFormValue[Key]) => {
    onChange({ ...value, [key]: nextValue });
  };

  const availableProviders = useMemo(() => {
    const filtered = providerOptions.filter((option) => option.destinationType === value.destinationType);
    return filtered;
  }, [providerOptions, value.destinationType]);

  const dropdownValue = value.providerRefId || value.providerName;
  const mobilePlaceholder = useMemo(() => {
    const provider = `${value.providerName} ${value.providerRefId}`.toLowerCase();
    if (provider.includes("airtel")) return "09********";
    if (provider.includes("tnm") || provider.includes("mpamba")) return "08********";
    return "Mobile wallet number";
  }, [value.providerName, value.providerRefId]);

  return (
    <div>
      {error ? (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4">
        <label className="space-y-2">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-zinc-400">Destination type</span>
          <select
            value={value.destinationType}
            onChange={(event) => onChange({ ...value, destinationType: event.target.value as PayoutDestinationType, providerName: "", providerRefId: "" })}
            className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 text-sm font-semibold outline-none transition focus:border-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-500"
            disabled={loading || disabled}
            required
          >
            <option value="mobile_money">Mobile money</option>
            <option value="bank">Bank</option>
          </select>
        </label>

        <FormDropdown
          label={value.destinationType === "bank" ? "Bank" : "Mobile operator"}
          value={dropdownValue}
          onChange={(selectedProviderId) => {
            const selected = availableProviders.find((option) => option.id === selectedProviderId);
            if (!selected) return;
            onChange({ ...value, providerName: selected.name, providerRefId: selected.providerRefId || selected.id });
          }}
          options={availableProviders.map((option) => ({ value: option.id, label: option.name }))}
          placeholder={value.destinationType === "bank" ? "Select bank" : "Select mobile operator"}
          searchPlaceholder="Search provider..."
          searchable
          disabled={loading || disabled}
        />

        <label className="space-y-2">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-zinc-400">Account holder name</span>
          <input
            value={value.accountName}
            onChange={(event) => updateValue("accountName", event.target.value)}
            className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 text-sm font-semibold outline-none transition focus:border-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-500"
            placeholder="Name on the receiving account"
            disabled={loading || disabled}
            required
            autoComplete="name"
          />
        </label>

        {value.destinationType === "bank" ? (
          <label className="space-y-2">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-zinc-400">Bank account number</span>
            <input
              value={value.accountNumber}
              onChange={(event) => updateValue("accountNumber", event.target.value)}
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 text-sm font-semibold outline-none transition focus:border-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-500"
              placeholder="Bank account number"
              inputMode="numeric"
              autoComplete="off"
              disabled={loading || disabled}
              required
            />
          </label>
        ) : (
          <label className="space-y-2">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-zinc-400">Mobile number</span>
            <input
              value={value.mobile}
              onChange={(event) => updateValue("mobile", event.target.value)}
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 text-sm font-semibold outline-none transition focus:border-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-500"
              placeholder={mobilePlaceholder}
              inputMode="tel"
              autoComplete="tel"
              disabled={loading || disabled}
              required
            />
          </label>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => updateValue("isDefault", !value.isDefault)}
          disabled={loading || disabled}
          className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold transition disabled:opacity-60 ${
            value.isDefault
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          {value.isDefault ? "Default payout account" : "Make default"}
        </button>

        <div className="flex w-full gap-2 sm:w-auto">
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 sm:flex-none"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={loading || disabled}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-60 sm:flex-none"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEditing ? "Replace account" : "Save account"}
          </button>
        </div>
      </div>
    </div>
  );
}
