import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Loader2, ShieldCheck, X } from "lucide-react";

type TotpChallengeModalProps = {
  open: boolean;
  title: string;
  message: string;
  code: string;
  busy?: boolean;
  onCodeChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onResend?: () => void;
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
  onResend,
}: TotpChallengeModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[97] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 18 }}
            className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-zinc-700" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-zinc-900">{title}</h3>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
                    Authenticator code required
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onCancel}
                className="p-2 rounded-full hover:bg-zinc-100 transition-colors"
              >
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-zinc-600 leading-6">{message}</p>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-600">
                  6-digit code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => onCodeChange(e.target.value)}
                  placeholder="Enter 6-digit code"
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>

              <p className="text-xs text-zinc-500 leading-6">
                Open your authenticator app and enter the current code.
              </p>
            </div>

            <div className="px-6 pb-6 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-3 rounded-2xl font-bold bg-zinc-100 hover:bg-zinc-200 transition-colors"
              >
                Cancel
              </button>

              {onResend ? (
                <button
                  type="button"
                  onClick={onResend}
                  className="flex-1 py-3 rounded-2xl font-bold bg-white border border-zinc-200 hover:bg-zinc-50 transition-colors inline-flex items-center justify-center gap-2"
                >
                  Resend
                </button>
              ) : null}

              <button
                type="button"
                onClick={onSubmit}
                disabled={busy}
                className="flex-1 py-3 rounded-2xl font-bold text-white bg-zinc-900 hover:bg-zinc-800 transition-colors inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Verify
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
