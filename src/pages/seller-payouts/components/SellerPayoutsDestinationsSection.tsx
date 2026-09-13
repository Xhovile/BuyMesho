import { type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Building2, Plus, X } from "lucide-react";
import PayoutDestinationCard from "../../../components/payouts/PayoutDestinationCard";
import PayoutDestinationForm from "../../../components/payouts/PayoutDestinationForm";
import type {
  PayoutDestination,
  PayoutDestinationFormState,
  PayoutProviderOption,
} from "../../../modules/payouts/types";

type SellerPayoutsDestinationsSectionProps = {
  form: PayoutDestinationFormState;
  onFormChange: (value: PayoutDestinationFormState) => void;
  onSave: () => void | Promise<void>;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
  canEditSettings: boolean;
  isEditing: boolean;
  formOpen: boolean;
  activeDestinations: PayoutDestination[];
  providerOptions: PayoutProviderOption[];
  onAdd: () => void;
  onReplace: (destination: PayoutDestination) => void;
  onRemove: (destination: PayoutDestination) => void;
  onMakeDefault: (destination: PayoutDestination) => void;
};

function SectionTitle({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-zinc-400">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight">{title}</h2>
      </div>
      {action ? action : null}
    </div>
  );
}

function EmptyState({ onAdd, disabled }: { onAdd: () => void; disabled: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-5 py-6">
      <p className="text-sm font-semibold text-zinc-600">No payout account has been added yet.</p>
      <button
        type="button"
        onClick={onAdd}
        disabled={disabled}
        className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        <Plus className="h-4 w-4" />
        Add payout account
      </button>
    </div>
  );
}

export default function SellerPayoutsDestinationsSection({
  form,
  onFormChange,
  onSave,
  onCancel,
  saving,
  error,
  canEditSettings,
  isEditing,
  formOpen,
  activeDestinations,
  providerOptions,
  onAdd,
  onReplace,
  onRemove,
  onMakeDefault,
}: SellerPayoutsDestinationsSectionProps) {
  return (
    <>
      <section id="payout-destination-settings" className="min-w-0 rounded-[28px] border border-zinc-200/80 bg-white p-5 shadow-[0_12px_30px_rgba(0,0,0,0.04)] sm:p-6">
        <SectionTitle
          eyebrow="Receiving account"
          title="Your payout accounts."
          action={(
            <button
              type="button"
              onClick={onAdd}
              disabled={!canEditSettings}
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add payout account</span>
              <span className="sm:hidden">Add account</span>
            </button>
          )}
        />

        <div className="mt-5 grid min-w-0 gap-3">
          {activeDestinations.length === 0 ? (
            <EmptyState onAdd={onAdd} disabled={!canEditSettings} />
          ) : (
            activeDestinations.map((destination) => (
              <PayoutDestinationCard
                key={destination.id}
                destination={destination}
                onReplace={onReplace}
                onRemove={onRemove}
                onMakeDefault={onMakeDefault}
                actionsDisabled={!canEditSettings || saving}
              />
            ))
          )}
        </div>
      </section>

      <AnimatePresence>
        {formOpen ? (
          <div
            className="fixed inset-0 z-[96] flex items-center justify-center p-4 sm:p-6"
            role="presentation"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Escape" && !saving) onCancel();
            }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/55 backdrop-blur-sm"
              onClick={() => {
                if (!saving) onCancel();
              }}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 18 }}
              transition={{ duration: 0.18 }}
              className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-label={isEditing ? "Replace payout account" : "Add payout account"}
            >
              <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4 sm:px-6 sm:py-5">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">Payout account</p>
                  <h2 className="mt-1 text-xl font-black tracking-tight text-zinc-950">
                    {isEditing ? "Replace your payout account" : "Add payout account"}
                  </h2>
                  <p className="mt-1 text-sm font-medium text-zinc-500">
                    Choose where your earnings should be sent.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={saving}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
                  aria-label="Close payout account form"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-6">
                <PayoutDestinationForm
                  value={form}
                  onChange={onFormChange}
                  onSave={onSave}
                  onCancel={onCancel}
                  loading={saving}
                  error={error}
                  disabled={!canEditSettings}
                  isEditing={isEditing}
                  providerOptions={providerOptions}
                />
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
