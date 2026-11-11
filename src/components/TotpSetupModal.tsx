import { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, Copy, ShieldCheck, X } from "lucide-react";

export type TotpSetupModalProps = {
  open: boolean;
  title: string;
  message: string;
  qrCodeUrl: string;
  otpauthUri?: string;
  secret: string;
  accountName: string;
  code: string;
  busy?: boolean;
  onCodeChange: (value: string) => void;
  onConfirm: () => void;
  onDisable?: () => void;
  onBack?: () => void;
  onClose: () => void;
};

export default function TotpSetupModal({
  open,
  title,
  message,
  qrCodeUrl,
  secret,
  accountName,
  code,
  busy,
  onCodeChange,
  onConfirm,
  onDisable,
  onBack,
  onClose,
}: TotpSetupModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [secretCopied, setSecretCopied] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setSecretCopied(false);
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (open && step === 2) {
      window.setTimeout(() => codeInputRef.current?.focus(), 120);
    }
  }, [open, step]);

  const handleCopySecret = async () => {
    if (!secret || !navigator.clipboard?.writeText) return;

    await navigator.clipboard
      .writeText(secret)
      .then(() => {
        setSecretCopied(true);
        window.setTimeout(() => setSecretCopied(false), 1600);
      })
      .catch(() => undefined);
  };

  const handleClose = () => {
    setStep(1);
    setSecretCopied(false);
    onClose();
  };

  const handleTopBack = () => {
    if (step === 2) {
      setStep(1);
      return;
    }

    if (onBack) {
      onBack();
      return;
    }

    handleClose();
  };

  const goToManualSetup = () => setStep(2);
  const goToQrSetup = () => setStep(1);

  if (!open) return null;

  const progressLabel = step === 1 ? "1 of 2" : "2 of 2";
  const confirmDisabled = Boolean(busy) || code.length !== 6;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-0 backdrop-blur-sm sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="totp-setup-title"
        className="flex h-dvh w-full flex-col overflow-hidden bg-bm-surface shadow-2xl sm:h-auto sm:max-h-[min(90dvh,760px)] sm:max-w-2xl sm:rounded-3xl sm:border sm:border-bm-border"
      >
        <div className="shrink-0 border-b border-bm-border-subtle dark:border-bm-border-subtle bg-bm-surface px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-bm-brand text-bm-on-brand sm:h-10 sm:w-10">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-bm-text-subtle dark:text-bm-text-subtle">
                  Two-factor authentication
                </p>
                <h2 id="totp-setup-title" className="mt-2 text-xl font-black tracking-tight text-bm-text dark:text-bm-text sm:text-2xl">
                  {step === 1 ? title : "Finish setup"}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-bm-text-muted dark:text-bm-text-muted">
                  {step === 1
                    ? message
                    : "Enter the current 6-digit code from your authenticator app to finish setup."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTopBack}
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface px-3 py-2 text-sm font-bold text-bm-text dark:text-bm-text transition-colors hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted"
              aria-label={step === 2 ? "Go back to QR setup" : onBack ? "Go back" : "Close TOTP setup"}
            >
              {step === 2 ? <ChevronLeft className="h-4 w-4" /> : onBack ? <ChevronLeft className="h-4 w-4" /> : <X className="h-4 w-4" />}
              <span>{step === 2 || onBack ? "Back" : "Close"}</span>
            </button>
          </div>

          <div className="mt-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5" aria-label={`Step ${progressLabel}`}>
              <span className={`h-1.5 w-10 rounded-full ${step === 1 ? "bg-bm-brand" : "bg-bm-surface-raised dark:bg-bm-skeleton"}`} />
              <span className={`h-1.5 w-10 rounded-full ${step === 2 ? "bg-bm-brand" : "bg-bm-surface-raised dark:bg-bm-skeleton"}`} />
            </div>
            <span className="text-xs font-bold text-bm-text-subtle dark:text-bm-text-subtle">{progressLabel}</span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          <div
            className="flex h-full w-[200%] transition-transform duration-300 ease-out motion-reduce:transition-none"
            style={{ transform: `translateX(-${step === 1 ? 0 : 50}%)` }}
          >
            <section
              className="flex w-1/2 shrink-0 flex-col overflow-y-auto px-5 py-6 sm:px-6 sm:py-7"
              aria-label="QR code setup"
            >
              <div className="mx-auto w-full max-w-md">
                <div className="rounded-3xl border border-bm-border dark:border-bm-border bg-bm-surface-muted dark:bg-bm-surface-subtle p-4 sm:p-5">
                  <div className="flex justify-center">
                    {qrCodeUrl ? (
                      <div className="rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface p-3 shadow-sm">
                        <img
                          src={qrCodeUrl}
                          alt="Scan this QR code with your authenticator app"
                          className="h-52 w-52 rounded-xl object-contain sm:h-64 sm:w-64"
                        />
                      </div>
                    ) : (
                      <div className="flex h-52 w-52 items-center justify-center rounded-2xl border border-dashed border-bm-border dark:border-bm-border bg-bm-surface text-center text-sm text-bm-text-subtle dark:text-bm-text-subtle sm:h-64 sm:w-64">
                        QR code not available
                      </div>
                    )}
                  </div>
                  <p className="mt-4 text-center text-sm font-semibold leading-relaxed text-bm-text-muted dark:text-bm-text-muted">
                    Scan this QR code with Google Authenticator, Microsoft Authenticator, Authy, or another TOTP-compatible app.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={goToManualSetup}
                  className="mt-5 flex w-full items-center justify-between gap-4 rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface px-4 py-3.5 text-left transition-colors hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-bm-text dark:text-bm-text">Can't scan? Use setup key</span>
                    <span className="mt-1 block text-xs leading-relaxed text-bm-text-subtle dark:text-bm-text-subtle">
                      Enter the key manually in your authenticator app.
                    </span>
                  </span>
                  <ChevronLeft className="h-4 w-4 shrink-0 rotate-180 text-bm-text-subtle dark:text-bm-text-subtle" aria-hidden="true" />
                </button>
              </div>
            </section>

            <section
              className="flex w-1/2 shrink-0 flex-col overflow-y-auto px-5 py-6 sm:px-6 sm:py-7"
              aria-label="Manual authenticator setup"
            >
              <div className="mx-auto w-full max-w-md space-y-5">
                <div className="rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface-muted dark:bg-bm-surface-subtle px-4 py-3">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-bm-text-subtle dark:text-bm-text-subtle">Account</p>
                  <p className="mt-1 break-words text-sm font-semibold text-bm-text dark:text-bm-text">{accountName}</p>
                </div>

                <div className="rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface px-4 py-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-bm-text-subtle dark:text-bm-text-subtle">Setup key</p>
                    <button
                      type="button"
                      onClick={() => void handleCopySecret()}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-bm-border dark:border-bm-border bg-bm-surface-muted dark:bg-bm-surface-subtle px-2.5 py-1.5 text-xs font-bold text-bm-text-muted dark:text-bm-text-muted transition-colors hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted"
                    >
                      {secretCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {secretCopied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="mt-3 break-all font-mono text-sm font-semibold tracking-[0.08em] text-bm-text dark:text-bm-text">
                    {secret}
                  </p>
                  <p className="mt-3 text-xs leading-relaxed text-bm-text-subtle dark:text-bm-text-subtle">
                    Keep this setup key private. Anyone with it can generate your authentication codes.
                  </p>
                </div>

                <div>
                  <label htmlFor="totp-verification-code" className="mb-2 block text-sm font-bold text-bm-text dark:text-bm-text-muted">
                    6-digit code
                  </label>
                  <input
                    ref={codeInputRef}
                    id="totp-verification-code"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={code}
                    onChange={(e) => onCodeChange(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="w-full rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface px-4 py-3.5 text-lg font-semibold tracking-[0.3em] outline-none transition-colors focus:border-bm-brand"
                  />
                  <p className="mt-2 text-xs text-bm-text-subtle dark:text-bm-text-subtle">
                    Enter the current code shown for this account in your authenticator app.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="shrink-0 border-t border-bm-border-subtle dark:border-bm-border-subtle bg-bm-surface px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-3">
            {onDisable ? (
              <button
                type="button"
                onClick={onDisable}
                disabled={busy}
                className="hidden rounded-2xl border border-red-200 bg-red-50 px-4 py-3 font-bold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 sm:inline-flex"
              >
                Disable 2FA
              </button>
            ) : null}

            <button
              type="button"
              onClick={handleClose}
              className="rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface px-4 py-3 font-bold text-bm-text-muted dark:text-bm-text-muted transition-colors hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted"
            >
              Close
            </button>

            {step === 1 ? (
              <button
                type="button"
                onClick={goToManualSetup}
                className="ml-auto inline-flex items-center gap-2 rounded-2xl bg-bm-brand px-4 py-3 font-bold text-bm-on-brand transition-colors hover:bg-bm-brand-hover"
              >
                Next
                <ChevronLeft className="h-4 w-4 rotate-180" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                disabled={confirmDisabled}
                onClick={onConfirm}
                className="ml-auto rounded-2xl bg-bm-brand px-4 py-3 font-bold text-bm-on-brand transition-colors hover:bg-bm-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Verifying..." : "Confirm setup"}
              </button>
            )}
          </div>

          {step === 2 ? (
            <button
              type="button"
              onClick={goToQrSetup}
              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-bm-text-subtle dark:text-bm-text-subtle hover:text-bm-text"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Back to QR code
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
