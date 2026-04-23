import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, Loader2, ShieldCheck, X } from "lucide-react";
import React from "react";
import { formatTotpSecret } from "../lib/totp";

type TotpSetupModalProps = {
  open: boolean;
  title: string;
  message: string;
  accountLabel: string;
  otpauthUri: string;
  secret: string;
  qrImageUrl: string;
  verificationCode: string;
  busy?: boolean;
  onVerificationCodeChange: (value: string) => void;
  onCopySecret: () => void;
  onCopyUri: () => void;
  onConfirm: () => void;
  onClose: () => void;
};

export default function TotpSetupModal({
  open,
  title,
  message,
  accountLabel,
  otpauthUri,
  secret,
  qrImageUrl,
  verificationCode,
  busy,
  onVerificationCodeChange,
  onCopySecret,
  onCopyUri,
  onConfirm,
  onClose,
}: TotpSetupModalProps) {
  const formattedSecret = formatTotpSecret(secret);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[97] flex items-center justify-center p-4">
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
            className="relative w-full max-w-3xl rounded-3xl bg-white shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-zinc-700" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-zinc-900">{title}</h3>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
                    Authenticator app setup
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full hover:bg-zinc-100 transition-colors"
              >
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            <div className="px-6 py-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="space-y-4">
                <p className="text-sm text-zinc-600 leading-6">{message}</p>

                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 space-y-2">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-zinc-400">
                    Account label
                  </p>
                  <p className="text-sm font-semibold text-zinc-900">{accountLabel}</p>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-zinc-400">
                        Secret key
                      </p>
                      <p className="mt-1 text-sm font-semibold text-zinc-900 break-all">
                        {formattedSecret}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onCopySecret}
                      className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-bold text-zinc-900 hover:bg-zinc-100"
                    >
                      <Copy className="w-4 h-4" />
                      Copy
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={onCopyUri}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-900 hover:bg-zinc-50"
                  >
                    <Copy className="w-4 h-4" />
                    Copy otpauth URI
                  </button>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-zinc-400">
                    Step 1
                  </p>
                  <p className="mt-1 text-sm text-zinc-700 leading-6">
                    Scan the QR code with Google Authenticator, Microsoft Authenticator, Authy, or any TOTP app.
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-zinc-400">
                    Step 2
                  </p>
                  <p className="mt-1 text-sm text-zinc-700 leading-6">
                    Enter the 6-digit code generated by the app to finish enrollment.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-600">
                    Verification code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={verificationCode}
                    onChange={(e) => onVerificationCodeChange(e.target.value)}
                    placeholder="Enter 6-digit code"
                    className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-900/10"
                  />
                </div>

                <p className="text-xs text-zinc-500 leading-6">
                  Keep the secret private. This code is only for your authenticator app setup.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-3 rounded-2xl font-bold bg-zinc-100 hover:bg-zinc-200 transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={onConfirm}
                    disabled={busy}
                    className="flex-1 py-3 rounded-2xl font-bold text-white bg-zinc-900 hover:bg-zinc-800 transition-colors inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Confirm setup
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-center justify-start gap-4">
                <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <img
                    src={qrImageUrl}
                    alt="TOTP QR code"
                    className="h-64 w-64 object-contain"
                  />
                </div>
                <p className="text-xs font-medium text-zinc-500 text-center leading-6">
                  The QR image is generated from the otpauth URI.
                </p>
                <code className="max-w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-[11px] text-zinc-600 break-all">
                  {otpauthUri}
                </code>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
