import { useEffect, useMemo, useState } from 'react';
import { Check, Landmark, Plus, Smartphone, WalletCards } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import PayoutDestinationForm, {
  type PayoutDestinationFormValue,
} from '../payouts/PayoutDestinationForm';

type Destination = {
  id: string;
  eventCreatorUid: string;
  destinationType: 'mobile_money' | 'bank';
  providerName: string;
  providerRefId: string | null;
  currency: string;
  accountName: string;
  accountDisplay: string;
  isDefault: boolean;
  verificationStatus: string;
  isActive: boolean;
};

type Props = {
  value: string | null;
  onChange: (destinationId: string | null) => void;
  required?: boolean;
  disabled?: boolean;
};

const EMPTY_FORM: PayoutDestinationFormValue = {
  destinationType: 'mobile_money',
  providerName: '',
  providerRefId: '',
  currency: 'MWK',
  accountName: '',
  accountNumber: '',
  mobile: '',
  isDefault: false,
};

export default function EventPayoutSetup({ value, onChange, required = false, disabled = false }: Props) {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState<PayoutDestinationFormValue>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeDestinations = useMemo(
    () => destinations.filter((destination) => destination.isActive && destination.verificationStatus.toLowerCase() === 'verified'),
    [destinations],
  );

  const loadDestinations = async () => {
    setLoading(true);
    try {
      const response = (await apiFetch('/api/event-creator/payout-destinations')) as { destinations?: Destination[] };
      setDestinations(Array.isArray(response.destinations) ? response.destinations : []);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Could not load payout destinations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDestinations();
  }, []);

  const handleSaveNew = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = (await apiFetch('/api/event-creator/payout-destinations', {
        method: 'POST',
        body: JSON.stringify(form),
      })) as { destination?: Destination };
      if (!response.destination?.id) throw new Error('Payout destination was not created.');
      setDestinations((current) => [response.destination!, ...current.filter((item) => item.id !== response.destination!.id)]);
      onChange(response.destination.id);
      setShowNew(false);
      setForm({ ...EMPTY_FORM });
    } catch (err: any) {
      setError(err?.message || 'Could not save payout destination.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-[1.75rem] border border-zinc-200 bg-zinc-50/70 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-zinc-500">Payout details</p>
          <h2 className="mt-1 text-lg font-black tracking-tight text-zinc-950">
            Where should ticket money be sent?
            {required ? <span className="ml-1 text-red-900">*</span> : null}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600">
            Choose the receiving account for this event. The event keeps this destination even if you later add another one.
          </p>
        </div>
        <WalletCards className="mt-1 hidden h-5 w-5 text-zinc-500 sm:block" />
      </div>

      {error ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div> : null}

      {loading ? (
        <div className="mt-4 rounded-2xl border border-zinc-200 bg-white px-4 py-4 text-sm text-zinc-500">Loading payout destinations…</div>
      ) : (
        <>
          <div className="mt-4 grid gap-3">
            {activeDestinations.map((destination) => {
              const selected = value === destination.id;
              return (
                <button
                  key={destination.id}
                  type="button"
                  onClick={() => onChange(destination.id)}
                  disabled={disabled || saving}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-4 text-left transition ${
                    selected ? 'border-zinc-950 bg-white shadow-sm' : 'border-zinc-200 bg-white hover:border-zinc-300'
                  }`}
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${selected ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-600'}`}>
                    {destination.destinationType === 'bank' ? <Landmark className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-extrabold text-zinc-950">{destination.providerName}</span>
                    <span className="mt-1 block truncate text-xs font-medium text-zinc-500">
                      {destination.accountName} · {destination.accountDisplay}
                    </span>
                  </span>
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${selected ? 'bg-zinc-950 text-white' : 'border border-zinc-200 text-transparent'}`}>
                    <Check className="h-4 w-4" />
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowNew((current) => !current)}
              disabled={disabled || saving}
              className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              {showNew ? 'Close new destination' : 'Add a new payout destination'}
            </button>
          </div>

          {showNew ? (
            <div className="mt-4 rounded-[1.5rem] border border-zinc-200 bg-white p-4 sm:p-5">
              <PayoutDestinationForm
                value={form}
                onChange={setForm}
                onSave={handleSaveNew}
                onCancel={() => setShowNew(false)}
                loading={saving}
                error={null}
                disabled={disabled}
                providerOptions={[]}
              />
            </div>
          ) : null}
        </>
      )}

      {!loading && required && !value ? (
        <p className="mt-4 text-xs font-semibold text-red-900">Select or add a verified payout destination before publishing this paid event.</p>
      ) : null}
    </section>
  );
}
