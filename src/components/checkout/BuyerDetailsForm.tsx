import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

export interface BuyerDeliveryDetails {
  fullName: string;
  phone: string;
  addressLine: string;
  area: string;
  townOrDistrict: string;
  landmark: string;
}

const EMPTY_DETAILS: BuyerDeliveryDetails = {
  fullName: "",
  phone: "",
  addressLine: "",
  area: "",
  townOrDistrict: "",
  landmark: "",
};

type BuyerDetailsFormProps = {
  value: BuyerDeliveryDetails;
  onChange: (value: BuyerDeliveryDetails) => void;
  saveForLater: boolean;
  onSaveForLaterChange: (value: boolean) => void;
  onLoadingChange?: (loading: boolean) => void;
};

function isComplete(details: BuyerDeliveryDetails): boolean {
  return Boolean(
    details.fullName.trim() &&
      details.phone.trim() &&
      details.addressLine.trim() &&
      details.area.trim() &&
      details.townOrDistrict.trim(),
  );
}

export default function BuyerDetailsForm({
  value,
  onChange,
  saveForLater,
  onSaveForLaterChange,
  onLoadingChange,
}: BuyerDetailsFormProps) {
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    onLoadingChange?.(true);

    void apiFetch("/api/profile/buyer-details")
      .then((data: any) => {
        if (!mounted) return;
        const saved = data?.buyerDetails;
        if (saved) {
          onChange({ ...EMPTY_DETAILS, ...saved });
          onSaveForLaterChange(true);
        }
        setLoaded(true);
      })
      .catch(() => {
        if (mounted) setLoaded(true);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
        onLoadingChange?.(false);
      });

    return () => {
      mounted = false;
    };
  }, [onChange, onLoadingChange, onSaveForLaterChange]);

  const setField = (field: keyof BuyerDeliveryDetails, next: string) => {
    onChange({ ...value, [field]: next });
  };

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Delivery details</p>
        <h3 className="mt-1 text-sm font-extrabold text-zinc-900">Where should we deliver this purchase?</h3>
        <p className="mt-1 text-xs text-zinc-500">These details are shared with the seller to complete your order.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="mb-1 block text-xs font-bold text-zinc-600">Full name</span>
          <input
            value={value.fullName}
            onChange={(event) => setField("fullName", event.target.value)}
            autoComplete="name"
            placeholder="Your full name"
            className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
          />
        </label>

        <label>
          <span className="mb-1 block text-xs font-bold text-zinc-600">Phone number</span>
          <input
            value={value.phone}
            onChange={(event) => setField("phone", event.target.value)}
            autoComplete="tel"
            placeholder="e.g. 0991 234 567"
            className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
          />
        </label>

        <label>
          <span className="mb-1 block text-xs font-bold text-zinc-600">Town / District</span>
          <input
            value={value.townOrDistrict}
            onChange={(event) => setField("townOrDistrict", event.target.value)}
            placeholder="e.g. Lilongwe"
            className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
          />
        </label>

        <label>
          <span className="mb-1 block text-xs font-bold text-zinc-600">Area / Location</span>
          <input
            value={value.area}
            onChange={(event) => setField("area", event.target.value)}
            placeholder="e.g. Area 3"
            className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
          />
        </label>

        <label>
          <span className="mb-1 block text-xs font-bold text-zinc-600">Nearest landmark</span>
          <input
            value={value.landmark}
            onChange={(event) => setField("landmark", event.target.value)}
            placeholder="Optional"
            className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
          />
        </label>

        <label className="sm:col-span-2">
          <span className="mb-1 block text-xs font-bold text-zinc-600">Delivery address</span>
          <textarea
            value={value.addressLine}
            onChange={(event) => setField("addressLine", event.target.value)}
            autoComplete="street-address"
            placeholder="House, hostel, building, room, or other delivery address"
            rows={3}
            className="w-full resize-none rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
          />
        </label>
      </div>

      <label className="flex items-start gap-3 rounded-xl bg-zinc-50 p-3">
        <input
          type="checkbox"
          checked={saveForLater}
          onChange={(event) => onSaveForLaterChange(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-zinc-300"
        />
        <span>
          <span className="block text-xs font-bold text-zinc-800">Save these details for future purchases</span>
          <span className="mt-0.5 block text-[11px] text-zinc-500">You can change them the next time you check out.</span>
        </span>
      </label>

      {!loading && loaded && !isComplete(value) ? (
        <p className="text-[11px] font-semibold text-red-600">Complete the required delivery details before continuing.</p>
      ) : null}
    </div>
  );
}
