import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useEffect } from "react";

type QuantityActionModalProps = {
  open: boolean;
  title: string;
  message: string;
  quantityLabel: string;
  quantity: string;
  onQuantityChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
};

export default function QuantityActionModal({
  open,
  title,
  message,
  quantityLabel,
  quantity,
  onQuantityChange,
  onClose,
  onConfirm,
  confirmLabel = "Confirm",
}: QuantityActionModalProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Enter") onConfirm();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, onConfirm]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[96] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-bm-overlay backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 18 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-bm-surface shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-bm-border-subtle dark:border-bm-border-subtle p-6">
              <div>
                <h3 className="text-lg font-extrabold text-bm-text dark:text-bm-text">{title}</h3>
                <p className="mt-1 text-sm text-bm-text-subtle dark:text-bm-text-subtle">{message}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 transition-colors hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted"
                aria-label="Close modal"
              >
                <X className="h-5 w-5 text-bm-text-subtle dark:text-bm-text-subtle" />
              </button>
            </div>

            <div className="space-y-3 px-6 py-5">
              <label className="block text-sm font-semibold text-bm-text-muted dark:text-bm-text-muted">
                {quantityLabel}
              </label>
              <input
                type="number"
                min="1"
                inputMode="numeric"
                value={quantity}
                onChange={(event) => onQuantityChange(event.target.value)}
                className="w-full rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface-muted dark:bg-bm-surface-subtle px-4 py-3 text-base font-medium text-bm-text dark:text-bm-text outline-none transition focus:border-bm-brand focus:bg-bm-surface"
                placeholder="1"
              />
            </div>

            <div className="flex gap-3 border-t border-bm-border-subtle dark:border-bm-border-subtle px-6 py-5">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface px-4 py-3 font-bold text-bm-text-muted dark:text-bm-text-muted transition-colors hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="flex-1 rounded-2xl bg-bm-brand px-4 py-3 font-bold text-bm-on-brand transition-colors hover:bg-bm-brand-hover"
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
