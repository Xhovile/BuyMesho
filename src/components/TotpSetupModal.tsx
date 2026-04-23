import { useEffect, useState } from "react";
import { Check, Copy, ShieldCheck, X } from "lucide-react";

export type TotpSetupModalProps = {
  open: boolean;
  title: string;
  message: string;
  qrCodeUrl: string;
  otpauthUri: string;
  secret: string;
  accountName: string;
  code: string;
  busy?: boolean;
  onCodeChange: (value: string) => void;
  onConfirm: () => void;
  onDisable?: () => void;
  onClose: () => void;
};

export default function TotpSetupModal({
  open,
  title,
  message,
  qrCodeUrl,
  otpauthUri,
  secret,
  accountName,
  code,
  busy,
  onCodeChange,
  onConfirm,
  onDisable,
  onClose,
}: TotpSetupModalProps) {
  const [secretCopied, setSecretCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      setSecretCopied(false);
    }
  }, [open]);

  const handleCopySecret = async () => {
    if (!secret) return;
    if (!navigator.clipboard?.writeText) return;
    await navigator.clipboard
      .writeText(secret)
      .then(() => {
        setSecretCopied(true);
        window.setTimeout(() => setSecretCopied(false), 1600);
      })
      .catch(() => undefined);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 bg-gradient-to-r from-zinc-50 to-white px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-900 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">Two-factor authentication</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-zinc-900">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">{message}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Close TOTP setup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid flex-1 gap-6 overflow-y-auto px-6 py-5 md:grid-cols-[220px_1fr]">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            {qrCodeUrl ? (
              <img src={qrCodeUrl} alt="Scan this QR code with your authenticator app" className="h-48 w-48 rounded-xl bg-white p-2" />
            ) : (
              <div className="flex h-48 w-48 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white text-sm text-zinc-500">
                QR code not available
              </div>
            )}
            <p className="mt-3 text-xs font-semibold text-zinc-500">Scan this in Google Authenticator, Microsoft Authenticator, or Authy.</p>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-zinc-400">Account</p>
              <p className="mt-1 text-sm font-semibold text-zinc-900">{accountName}</p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-zinc-400">Secret</p>
                <button
                  type="button"
                  onClick={() => void handleCopySecret()}
                  className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-100"
                >
                  {secretCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {secretCopied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="mt-2 break-all font-mono text-sm text-zinc-900">{secret}</p>
              <p className="mt-2 text-xs text-zinc-500">Keep this private. Anyone with it can generate codes.</p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-zinc-700">6-digit code</label>
              <input
                autoFocus
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => onCodeChange(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-lg font-semibold tracking-[0.3em] outline-none focus:border-zinc-900"
              />
            </div>

            <p className="text-xs text-zinc-500">
              otpauth URI: <span className="break-all font-mono">{otpauthUri}</span>
            </p>
          </div>
        </div>

        <div className="sticky bottom-0 flex flex-wrap gap-3 border-t border-zinc-100 bg-white/95 px-6 py-4 backdrop-blur">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 font-bold text-zinc-900 hover:bg-zinc-50"
          >
            Close
          </button>
          {onDisable ? (
            <button
              type="button"
              onClick={onDisable}
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 font-bold text-red-700 hover:bg-red-100"
            >
              Disable 2FA
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="ml-auto rounded-2xl bg-zinc-900 px-4 py-3 font-bold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Verifying..." : "Confirm setup"}
          </button>
        </div>
      </div>
    </div>
  );
}
