import { useEffect, useMemo, useState } from 'react';
import { Check, Landmark, Plus, Smartphone, WalletCards } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import PayoutDestinationForm, {
  type PayoutDestinationFormValue,
} from '../payouts/PayoutDestinationForm';
import type { PayoutProviderOption } from '../../modules/payouts/types';

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
  eventId?: number | null;
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

export default function EventPayoutSetup({ value, onChange, required = false, disabled = false, eventId = null }: Props) {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState<PayoutDestinationFormValue>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
  const [eventPayoutLocked, setEventPayoutLocked] = useState(false);
  const [protectionLoading, setProtectionLoading] = useState(false);
  const [providerOptions, setProviderOptions] = useState<PayoutProviderOption[]>([]);
  const [providerMetadataLoading, setProviderMetadataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeDestinations = useMemo(
    () => destinations.filter((destination) => destination.isActive && destination.verificationStatus.toLowerCase() === 'verified'),
    [destinations],
  );

  const loadDestinations = async () => {
    setLoading(true);
    setProviderMetadataLoading(true);
    try {
      const [destinationsResult, metadataResult] = await Promise.allSettled([
        apiFetch('/api/event-creator/payout-destinations') as Promise<{ destinations?: Destination[] }>,
        apiFetch('/api/event-creator/payout-provider-metadata') as Promise<{
          mobileMoneyOperators?: PayoutProviderOption[];
          banks?: PayoutProviderOption[];
        }>,
      ]);

      if (destinationsResult.status === 'fulfilled') {
        const nextDestinations = Array.isArray(destinationsResult.value?.destinations)
          ? destinationsResult.value.destinations
          : [];
        setDestinations(nextDestinations);
        if (!eventId && !value) {
          const defaultDestination = nextDestinations.find(
            (destination) =>
              destination.isActive &&
              destination.verificationStatus.toLowerCase() === 'verified' &&
              destination.isDefault,
          );
          if (defaultDestination) onChange(defaultDestination.id);
        }
      } else {
        setDestinations([]);
        throw destinationsResult.reason;
      }

      if (metadataResult.status === 'fulfilled') {
        const mobileMoneyOperators = Array.isArray(metadataResult.value?.mobileMoneyOperators)
          ? metadataResult.value.mobileMoneyOperators
          : [];
        const banks = Array.isArray(metadataResult.value?.banks)
          ? metadataResult.value.banks
          : [];
        setProviderOptions([...mobileMoneyOperators, ...banks]);
        setError(null);
      } else {
        setProviderOptions([]);
        setError('Could not load current PayChangu payout providers. Refresh before adding a new destination.');
      }
    } catch (err: any) {
      setError(err?.message || 'Could not load payout destinations.');
      setProviderOptions([]);
    } finally {
      setProviderMetadataLoading(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDestinations();
  }, []);

  useEffect(() => {
    if (!eventId) {
      setEventPayoutLocked(false);
      setProtectionLoading(false);
      return;
    }

    let active = true;
    setProtectionLoading(true);

    void apiFetch(`/api/event-creator/events/${eventId}/payout-destination`)
      .then((response) => {
        if (!active) return;
        const data = response as { locked?: boolean };
        setEventPayoutLocked(data.locked === true);
      })
      .catch(() => {
        if (!active) return;
        setEventPayoutLocked(false);
      })
      .finally(() => {
        if (active) setProtectionLoading(false);
      });

    return () => {
      active = false;
    };
  }, [eventId]);

  const handleMakeDefault = async (destinationId: string) => {
    setSettingDefaultId(destinationId);
    setError(null);
    try {
      const response = (await apiFetch(`/api/event-creator/payout-destinations/${destinationId}/default`, {
        method: 'PATCH',
      })) as { destination?: Destination };

      if (!response.destination?.id) throw new Error('Payout destination default was not updated.');
      setDestinations((current) =>
        current.map((item) => ({
          ...item,
          isDefault: item.id === response.destination!.id,
        })),
      );
    } catch (err: any) {
      setError(err?.message || 'Could not change the default payout destination.');
    } finally {
      setSettingDefaultId(null);
    }
  };

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
      if (!eventPayoutLocked) {
        onChange(response.destination.id);
      }
      setShowNew(false);
      setForm({ ...EMPTY_FORM });
    } catch (err: any) {
      setError(err?.message || 'Could not save payout destination.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-[1.75rem] border border-bm-border bg-bm-surface-muted/70 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-bm-text-subtle">Payout details</p>
          <h2 className="mt-1 text-lg font-black tracking-tight text-bm-text">
            Where should ticket money be sent?
            {required ? <span className="ml-1 text-bm-danger">*</span> : null}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-bm-text-muted">
            Select the payout destination for this event. Your creator default is separate and can be changed at any time for future events.
          </p>
        </div>
        <WalletCards className="mt-1 hidden h-5 w-5 text-bm-text-subtle sm:block" />
      </div>

      {error ? <div className="mt-4 rounded-2xl border border-bm-danger/35 bg-bm-danger-bg px-4 py-3 text-sm text-bm-danger">{error}</div> : null}

      {loading ? (
        <div className="mt-4 rounded-2xl border border-bm-border bg-bm-surface px-4 py-4 text-sm text-bm-text-subtle">Loading payout destinations…</div>
      ) : (
        <>
          <div className="mt-4 grid gap-3">
            {activeDestinations.map((destination) => {
              const selected = value === destination.id;
              const makingDefault = settingDefaultId === destination.id;
              return (
                <div
                  key={destination.id}
                  className={`rounded-2xl border px-4 transition ${
                    selected ? "border-bm-border bg-bm-surface py-5 shadow-sm" : "border-bm-border bg-bm-surface py-4"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onChange(destination.id)}
                      disabled={disabled || saving || eventPayoutLocked}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                        selected ? "bg-bm-brand text-bm-on-brand" : "bg-bm-surface-muted text-bm-text-muted"
                      }`}
                      >
                        {destination.destinationType === "bank" ? <Landmark className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-extrabold text-bm-text">{destination.providerName}</span>
                          {destination.isDefault ? (
                            <span className="rounded-full bg-bm-surface-muted px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-bm-text-muted">
                              Default
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-1 block truncate text-xs font-medium text-bm-text-subtle">
                          {destination.accountName} · {destination.accountDisplay}
                        </span>
                      </span>
                      {selected ? (
                        <span className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-bm-brand px-3 py-2 text-[10px] font-extrabold leading-tight text-bm-on-brand sm:text-[11px]">
                          <Check className="h-4 w-4" />
                          <span>Selected for this event</span>
                        </span>
                      ) : (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-bm-border text-transparent">
                          <Check className="h-4 w-4" />
                        </span>
                      )}
                    </button>
                    {!destination.isDefault ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (!selected) return;
                          void handleMakeDefault(destination.id);
                        }}
                        disabled={disabled || saving || makingDefault || !selected}
                        className="shrink-0 rounded-xl border border-bm-border bg-bm-surface px-3 py-2 text-xs font-extrabold text-bm-text transition hover:bg-bm-surface-muted disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {makingDefault ? "Setting…" : "Make default"}
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
          {eventId && eventPayoutLocked ? (
            <div className="mt-3 rounded-2xl border border-bm-warning/35 bg-bm-warning-bg px-4 py-3 text-xs leading-relaxed text-bm-warning">
              This event's payout destination is locked after its first successful ticket sale. You can still change your creator default for future events.
            </div>
          ) : protectionLoading ? (
            <p className="mt-3 text-xs font-medium text-bm-text-subtle">Checking this event's payout binding…</p>
          ) : null}
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowNew((current) => !current)}
              disabled={disabled || saving || providerMetadataLoading || providerOptions.length === 0}
              className="inline-flex items-center gap-2 rounded-2xl border border-bm-border bg-bm-surface px-4 py-3 text-sm font-bold text-bm-text hover:bg-bm-surface-muted disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              {showNew ? 'Close new destination' : 'Add a new payout destination'}
            </button>
          </div>

          {showNew ? (
            <div className="mt-4 rounded-[1.5rem] border border-bm-border bg-bm-surface p-4 sm:p-5">
              <PayoutDestinationForm
                value={form}
                onChange={setForm}
                onSave={handleSaveNew}
                onCancel={() => setShowNew(false)}
                loading={saving}
                error={null}
                disabled={disabled}
                providerOptions={providerOptions}
                allowLegacyProviderFallback={false}
              />
            </div>
          ) : null}
        </>
      )}

      {!loading && required && !value ? (
        <p className="mt-4 text-xs font-semibold text-bm-danger">Select or add a verified payout destination before publishing this paid event.</p>
      ) : null}
    </section>
  );
}
