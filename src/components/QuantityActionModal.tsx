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
            className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 18 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-bm-border-subtle p-6">
              <div>
                <h3 className="text-lg font-extrabold text-zinc-900 dark:text-bm-text">{title}</h3>
                <p className="mt-1 text-sm text-zinc-500 dark:text-bm-text-subtle">{message}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 transition-colors hover:bg-zinc-100 dark:hover:bg-bm-surface-muted"
                aria-label="Close modal"
              >
                <X className="h-5 w-5 text-zinc-500 dark:text-bm-text-subtle" />
              </button>
            </div>

            <div className="space-y-3 px-6 py-5">
              <label className="block text-sm font-semibold text-zinc-700 dark:text-bm-text-muted">
                {quantityLabel}
              </label>
              <input
                type="number"
                min="1"
                inputMode="numeric"
                value={quantity}
                onChange={(event) => onQuantityChange(event.target.value)}
                className="w-full rounded-2xl border border-zinc-200 dark:border-bm-border bg-zinc-50 dark:bg-bm-surface-subtle px-4 py-3 text-base font-medium text-zinc-900 dark:text-bm-text outline-none transition focus:border-zinc-900 focus:bg-white"
                placeholder="1"
              />
            </div>

            <div className="flex gap-3 border-t border-zinc-100 dark:border-bm-border-subtle px-6 py-5">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-2xl border border-zinc-200 dark:border-bm-border bg-white px-4 py-3 font-bold text-zinc-700 dark:text-bm-text-muted transition-colors hover:bg-zinc-50 dark:hover:bg-bm-surface-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="flex-1 rounded-2xl bg-zinc-900 px-4 py-3 font-bold text-white transition-colors hover:bg-zinc-800"
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
