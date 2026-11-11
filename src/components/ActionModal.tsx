import { AnimatePresence, motion } from "motion/react";
import { Loader2, X } from "lucide-react";

type ActionModalProps = {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  loading?: boolean;
  busy?: boolean;
  danger?: boolean;
  inputLabel?: string;
  inputValue?: string;
  inputPlaceholder?: string;
  inputType?: "number" | "text" | "textarea";
  onInputChange?: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onClose?: () => void;
};

export default function ActionModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  loading = false,
  busy = false,
  danger = false,
  inputLabel,
  inputValue,
  inputPlaceholder,
  inputType = "number",
  onInputChange,
  onConfirm,
  onCancel,
  onClose,
}: ActionModalProps) {
  const isLoading = loading || busy;
  const handleCancel = onClose ?? onCancel;

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
            onClick={handleCancel}
            className="absolute inset-0 bg-bm-overlay backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 18 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-bm-border dark:border-bm-border bg-bm-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-bm-border-subtle dark:border-bm-border-subtle px-6 py-5">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-bm-text-subtle dark:text-bm-text-subtle">
                  BuyMesho
                </p>
                <h3 className="mt-1 text-lg font-black tracking-tight text-bm-text dark:text-bm-text">{title}</h3>
              </div>

              <button
                type="button"
                onClick={handleCancel}
                className="rounded-full p-2 text-bm-text-subtle dark:text-bm-text-subtle transition-colors hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted hover:text-bm-text"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              {message ? <p className="text-sm leading-6 text-bm-text-muted dark:text-bm-text-muted">{message}</p> : null}

              {inputLabel ? (
                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-bm-text-subtle dark:text-bm-text-subtle">
                    {inputLabel}
                  </span>
                  {inputType === "textarea" ? (
                    <textarea
                      value={inputValue ?? ""}
                      onChange={(e) => onInputChange?.(e.target.value)}
                      placeholder={inputPlaceholder}
                      rows={4}
                      className="w-full rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface-muted dark:bg-bm-surface-subtle px-4 py-3 text-sm font-semibold text-bm-text dark:text-bm-text outline-none transition focus:border-bm-brand focus:bg-bm-surface"
                    />
                  ) : (
                    <input
                      type={inputType}
                      min={inputType === "number" ? "1" : undefined}
                      step={inputType === "number" ? "1" : undefined}
                      value={inputValue ?? ""}
                      onChange={(e) => onInputChange?.(e.target.value)}
                      placeholder={inputPlaceholder}
                      className="w-full rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface-muted dark:bg-bm-surface-subtle px-4 py-3 text-sm font-semibold text-bm-text dark:text-bm-text outline-none transition focus:border-bm-brand focus:bg-bm-surface"
                    />
                  )}
                </label>
              ) : null}
            </div>

            <div className="flex gap-3 border-t border-bm-border-subtle dark:border-bm-border-subtle px-6 py-5">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface px-4 py-3 text-sm font-extrabold text-bm-text-muted dark:text-bm-text-muted transition-colors hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isLoading}
                className={`flex-1 inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-extrabold transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
                  danger
                    ? "bg-red-600 text-bm-on-brand hover:bg-red-700"
                    : "bg-bm-brand text-bm-on-brand hover:bg-bm-brand-hover"
                }`}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
