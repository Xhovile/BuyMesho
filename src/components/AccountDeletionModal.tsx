import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";

export type AccountDeletionResult = "deleted" | "reauth-required" | "failed";

type Props = {
  open: boolean;
  onCancel: () => void;
  onDelete: () => Promise<AccountDeletionResult>;
  onReauthRequired: () => void;
};

const INITIAL_COUNTDOWN_SECONDS = 5;
const FINAL_COUNTDOWN_SECONDS = 3;

export default function AccountDeletionModal({
  open,
  onCancel,
  onDelete,
  onReauthRequired,
}: Props) {
  const [initialCountdown, setInitialCountdown] = useState(INITIAL_COUNTDOWN_SECONDS);
  const [finalCountdown, setFinalCountdown] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setInitialCountdown(INITIAL_COUNTDOWN_SECONDS);
    setFinalCountdown(null);
    setBusy(false);
  }, [open]);

  useEffect(() => {
    if (!open || busy) return;

    if (finalCountdown !== null) {
      if (finalCountdown <= 1) {
        setFinalCountdown(0);
        setBusy(true);
        void onDelete().then((result) => {
          if (result === "reauth-required") {
            setBusy(false);
            setFinalCountdown(null);
            onCancel();
            onReauthRequired();
          } else if (result === "failed") {
            setBusy(false);
            setFinalCountdown(null);
            onCancel();
          }
        });
        return;
      }

      const timer = window.setTimeout(() => {
        setFinalCountdown((current) => (current === null ? null : current - 1));
      }, 1000);

      return () => window.clearTimeout(timer);
    }

    if (initialCountdown <= 0) return;

    const timer = window.setTimeout(() => {
      setInitialCountdown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [busy, finalCountdown, initialCountdown, onCancel, onDelete, onReauthRequired, open]);

  const handleCancel = () => {
    if (busy || finalCountdown !== null) return;
    onCancel();
  };

  const handleFinalConfirmation = () => {
    if (busy || finalCountdown !== null || initialCountdown > 0) return;
    setFinalCountdown(FINAL_COUNTDOWN_SECONDS);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCancel}
            className="absolute inset-0 bg-zinc-950/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 18 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-red-500">Danger zone</p>
                  <h3 className="mt-1 text-lg font-extrabold text-zinc-900">Delete account</h3>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCancel}
                disabled={busy || finalCountdown !== null}
                className="rounded-full p-2 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Close account deletion confirmation"
              >
                <X className="h-5 w-5 text-zinc-500" />
              </button>
            </div>

            <div className="px-6 py-5">
              {finalCountdown !== null ? (
                <>
                  <p className="text-sm font-semibold text-zinc-900">Final confirmation is being prepared.</p>
                  <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-center">
                    <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-red-500">Deleting in</p>
                    <p className="mt-1 text-4xl font-black tracking-tight text-red-700">{finalCountdown}</p>
                    <p className="mt-2 text-xs font-medium text-red-700/80">This cannot be undone.</p>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm leading-6 text-zinc-600">
                    Your account, seller data, listings, event creator data, and events owned by this account will be permanently deleted.
                  </p>
                  <p className="mt-4 text-sm font-semibold text-zinc-900">
                    {initialCountdown > 0
                      ? `For your protection, please wait ${initialCountdown} seconds before the final confirmation.`
                      : "The final confirmation is now available."}
                  </p>
                </>
              )}
            </div>

            <div className="flex gap-3 px-6 pb-6">
              <button
                type="button"
                onClick={handleCancel}
                disabled={busy || finalCountdown !== null}
                className="flex-1 rounded-2xl bg-zinc-100 py-3 font-bold transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleFinalConfirmation}
                disabled={busy || finalCountdown !== null || initialCountdown > 0}
                className="flex-1 rounded-2xl bg-red-600 py-3 font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {finalCountdown !== null
                  ? `Deleting in ${finalCountdown}s`
                  : initialCountdown > 0
                    ? `Confirm in ${initialCountdown}s`
                    : "Confirm deletion"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {open && busy && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-3xl bg-white px-8 py-7 shadow-2xl">
            <Loader2 className="h-10 w-10 animate-spin text-red-600" />
            <div className="text-center">
              <p className="text-base font-extrabold text-zinc-900">Deleting your account</p>
              <p className="mt-1 text-sm font-medium text-zinc-500">Removing your data securely. Please do not close the app.</p>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
