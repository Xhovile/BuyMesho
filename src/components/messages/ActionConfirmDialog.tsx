import type { ReactNode } from "react";
import { X } from "lucide-react";

export interface ActionConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
  tone?: "danger" | "neutral";
  busy?: boolean;
  children?: ReactNode;
}

export default function ActionConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
  tone = "danger",
  busy = false,
  children,
}: ActionConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bm-overlay px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-bm-border dark:border-bm-border bg-bm-surface p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-bm-text dark:text-bm-text">{title}</h2>
            <p className="mt-2 text-sm text-bm-text-muted dark:text-bm-text-muted">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface-muted dark:bg-bm-surface-subtle p-2 text-bm-text-muted dark:text-bm-text-muted hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {children ? <div className="mt-5">{children}</div> : null}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface px-4 py-3 text-sm font-bold text-bm-text-muted dark:text-bm-text-muted hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={busy}
            className={`rounded-2xl px-4 py-3 text-sm font-bold text-bm-on-brand disabled:opacity-60 ${
              tone === "danger" ? "bg-bm-danger text-bm-bg hover:brightness-95" : "bg-bm-brand hover:bg-bm-brand-hover"
            }`}
          >
            {busy ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
