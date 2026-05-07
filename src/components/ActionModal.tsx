import { AnimatePresence, motion } from "motion/react";
import { Loader2, X } from "lucide-react";

type ActionModalProps = {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  loading?: boolean;
  danger?: boolean;
  inputLabel?: string;
  inputValue?: string;
  inputPlaceholder?: string;
  onInputChange?: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ActionModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  loading = false,
  danger = false,
  inputLabel,
  inputValue,
  inputPlaceholder,
  onInputChange,
  onConfirm,
  onCancel,
}: ActionModalProps) {
  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <motion.button
            type="button"
            aria-label="Close dialog"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-zinc-950/65 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 18 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-6 py-5">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">
                  BuyMesho
                </p>
                <h3 className="mt-1 text-lg font-black tracking-tight text-zinc-900">{title}</h3>
              </div>

              <button
                type="button"
                onClick={onCancel}
                className="rounded-full p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              {message ? <p className="text-sm leading-6 text-zinc-600">{message}</p> : null}

              {inputLabel ? (
                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
                    {inputLabel}
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={inputValue ?? ""}
                    onChange={(e) => onInputChange?.(e.target.value)}
                    placeholder={inputPlaceholder}
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-zinc-900 focus:bg-white"
                  />
                </label>
              ) : null}
            </div>

            <div className="flex gap-3 border-t border-zinc-100 px-6 py-5">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-extrabold text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className={`flex-1 inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-extrabold transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
                  danger
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-zinc-900 text-white hover:bg-zinc-800"
                }`}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
