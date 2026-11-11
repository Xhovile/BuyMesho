import { X } from "lucide-react";

export type TotpChallengeModalProps = {
  open: boolean;
  title: string;
  message: string;
  code: string;
  busy?: boolean;
  onCodeChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

export default function TotpChallengeModal({
  open,
  title,
  message,
  code,
  busy,
  onCodeChange,
  onSubmit,
  onCancel,
}: TotpChallengeModalProps) {
  if (!open) return null;

  const displayTitle = title === "Two-factor verification" ? "Two-factor authentication" : title;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bm-overlay px-4">
      <div className="w-full max-w-md rounded-3xl bg-bm-surface p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-bm-text-subtle dark:text-bm-text-subtle">Security</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-bm-text dark:text-bm-text">{displayTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed text-bm-text-muted dark:text-bm-text-muted">{message}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full p-2 text-bm-text-subtle dark:text-bm-text-subtle hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted hover:text-bm-text"
            aria-label="Close two-factor authentication"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-bm-text-muted dark:text-bm-text-muted">Authenticator code</label>
            <input
              autoFocus
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => onCodeChange(e.target.value.replace(/\D/g, ""))}
              placeholder="••••••"
              aria-label="6-digit authenticator code"
              className="w-full rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface px-4 py-3 text-lg font-semibold tracking-[0.3em] outline-none focus:border-bm-brand"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface px-4 py-3 font-bold text-bm-text dark:text-bm-text hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onSubmit}
              className="flex-1 rounded-2xl bg-bm-brand px-4 py-3 font-bold text-bm-on-brand hover:bg-bm-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Verifying..." : "Verify"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
