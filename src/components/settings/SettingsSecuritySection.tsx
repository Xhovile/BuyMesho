import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, KeyRound, Loader2, Lock, LogOut, Mail, ShieldCheck } from "lucide-react";
import type { TotpMfaStatus } from "../../lib/totp";
import { getPasskeyStatus, registerCurrentPasskey, removePasskey } from "../../lib/passkeys";
import ConfirmModal from "../ConfirmModal";

interface Props {
  expanded: boolean;
  onToggle: () => void;
  securityItems: { twoFactor: boolean; emailVerification: boolean };
  onToggleSecurityItem: (key: "twoFactor" | "emailVerification") => void;
  verifiedAccountRequiredDisabled: boolean;
  emailVerified: boolean;
  profileLoading: boolean;
  firebaseUser: unknown;
  securityActionBusy: "resend" | "logoutAll" | null;
  resendVerificationDisabled: boolean;
  totpStatus: TotpMfaStatus;
  totpLoading: boolean;
  onNavigate: (path: string) => void;
  changePasswordPath: string;
  changeEmailPath: string;
  on2FAEntry: () => void;
  onDisableTotp: () => void;
  onRefreshVerification: () => void;
  onResendVerification: () => void;
  onLogoutAllSessions: () => void;
  onVerifyIdentity: () => void;
}

export default function SettingsSecuritySection({
  expanded,
  onToggle,
  securityItems,
  onToggleSecurityItem,
  verifiedAccountRequiredDisabled,
  firebaseUser,
  securityActionBusy,
  totpStatus,
  totpLoading,
  onNavigate,
  changePasswordPath,
  changeEmailPath,
  on2FAEntry,
  onDisableTotp,
  onLogoutAllSessions,
}: Props) {
  const [passkeyExpanded, setPasskeyExpanded] = useState(false);
  const [passkeyEnabled, setPasskeyEnabled] = useState(false);
  const [passkeyId, setPasskeyId] = useState<string | null>(null);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyMessage, setPasskeyMessage] = useState<string | null>(null);
  const [passkeyError, setPasskeyError] = useState(false);
  const [removePasskeyConfirmOpen, setRemovePasskeyConfirmOpen] = useState(false);

  const loadPasskeyStatus = async () => {
    if (!firebaseUser) {
      setPasskeyEnabled(false);
      setPasskeyId(null);
      return;
    }
    try {
      const status = await getPasskeyStatus();
      setPasskeyEnabled(Boolean(status.enabled));
      setPasskeyId(status.credentials?.[0]?.id ?? null);
    } catch {
      // Passkey availability must never block the rest of Security settings.
    }
  };

  useEffect(() => {
    void loadPasskeyStatus();
  }, [firebaseUser]);

  const handlePasskeySetup = async () => {
    if (!firebaseUser || verifiedAccountRequiredDisabled || passkeyLoading || passkeyEnabled) return;

    setPasskeyLoading(true);
    setPasskeyMessage(null);
    setPasskeyError(false);

    try {
      const result = await registerCurrentPasskey();
      setPasskeyEnabled(true);
      setPasskeyId(result.credentialId);
      setPasskeyMessage("Passkey added successfully. You can now sign in with your device security.");
    } catch (error: any) {
      setPasskeyError(true);
      if (error?.name === "NotAllowedError") {
        setPasskeyMessage("Passkey setup was cancelled. No changes were made.");
      } else if (error?.status === 409 || /already registered/i.test(String(error?.message || ""))) {
        await loadPasskeyStatus();
        setPasskeyMessage("A passkey is already registered for this account.");
      } else {
        setPasskeyMessage(error?.message || "We could not set up a passkey right now. Please try again.");
      }
    } finally {
      setPasskeyLoading(false);
    }
  };

  const handlePasskeyRemove = () => {
    if (!passkeyId || passkeyLoading) return;
    setRemovePasskeyConfirmOpen(true);
  };

  const handlePasskeyRemoveConfirmed = async () => {
    if (!passkeyId || passkeyLoading) return;

    setRemovePasskeyConfirmOpen(false);
    setPasskeyLoading(true);
    setPasskeyMessage(null);
    setPasskeyError(false);

    try {
      await removePasskey(passkeyId);
      setPasskeyEnabled(false);
      setPasskeyId(null);
      setPasskeyMessage("Passkey removed from BuyMesho. If it is still saved in your device password manager, you can remove it there separately.");
    } catch (error: any) {
      setPasskeyError(true);
      setPasskeyMessage(error?.message || "We could not remove the passkey right now. Please try again.");
    } finally {
      setPasskeyLoading(false);
    }
  };

  return (
    <>
      <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
        <button type="button" onClick={onToggle} className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-zinc-50 transition-colors" aria-expanded={expanded}>
          <span className="inline-flex items-center gap-3 min-w-0"><span className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center shrink-0"><ShieldCheck className="w-5 h-5 text-zinc-700" /></span><span className="min-w-0"><span className="block text-sm font-extrabold uppercase tracking-[0.14em] text-zinc-400">Security</span></span></span>
          <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-zinc-500">{expanded ? "Hide" : "Show"}<ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} /></span>
        </button>

        {expanded ? <div className="divide-y divide-zinc-100">
          <button type="button" onClick={() => onNavigate(changePasswordPath)} disabled={verifiedAccountRequiredDisabled} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-50 transition-colors disabled:cursor-not-allowed disabled:bg-zinc-100"><span className="font-bold text-zinc-900 inline-flex items-center gap-2"><Lock className="w-4 h-4" />Change Password</span><ChevronRight className="w-4 h-4 text-zinc-400" /></button>
          <button type="button" onClick={() => onNavigate(changeEmailPath)} disabled={verifiedAccountRequiredDisabled} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-50 transition-colors disabled:cursor-not-allowed disabled:bg-zinc-100"><span className="font-bold text-zinc-900 inline-flex items-center gap-2"><Mail className="w-4 h-4" />Change Email</span><ChevronRight className="w-4 h-4 text-zinc-400" /></button>

          <button type="button" onClick={() => onToggleSecurityItem("twoFactor")} disabled={verifiedAccountRequiredDisabled} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-50 transition-colors disabled:cursor-not-allowed disabled:bg-zinc-100" aria-expanded={securityItems.twoFactor}>
            <span className="font-bold text-zinc-900 inline-flex items-center gap-2"><span className="w-6 h-6 rounded-xl bg-fuchsia-50 text-fuchsia-700 inline-flex items-center justify-center"><ShieldCheck className="w-3.5 h-3.5" /></span>2-Factor Authentication</span>
            <ChevronDown className={`w-4 h-4 text-fuchsia-500 transition-transform ${securityItems.twoFactor ? "rotate-180" : ""}`} />
          </button>

          {securityItems.twoFactor ? <div className="px-5 py-4 bg-zinc-50/60 border-t border-zinc-100"><div className="flex flex-col gap-4"><div className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-zinc-400">Two-factor authentication</p><p className="mt-1 text-sm font-semibold text-zinc-900">{totpStatus === "enabled" ? "Enabled" : totpStatus === "pending" ? "Pending setup" : "Not enabled"}</p><p className="mt-1 text-xs text-zinc-500">Use an authenticator app for your second factor.</p></div><span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.16em] ${totpStatus === "enabled" ? "bg-emerald-50 text-emerald-700" : totpStatus === "pending" ? "bg-amber-50 text-amber-700" : "bg-zinc-100 text-zinc-500"}`}>{totpStatus === "enabled" ? "Active" : totpStatus === "pending" ? "Setup" : "Off"}</span></div><div className="flex flex-wrap gap-3">{totpStatus === "enabled" ? <><button type="button" onClick={onDisableTotp} disabled={verifiedAccountRequiredDisabled || totpLoading} className="inline-flex items-center justify-center rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-900 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60">Disable 2FA</button><button type="button" onClick={on2FAEntry} disabled={verifiedAccountRequiredDisabled || totpLoading} className="inline-flex items-center justify-center rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60">Re-enroll</button></> : <button type="button" onClick={on2FAEntry} disabled={verifiedAccountRequiredDisabled || totpLoading} className="inline-flex items-center justify-center rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60">Enable authenticator app</button>}</div></div></div> : null}

          <button type="button" onClick={() => setPasskeyExpanded((value) => !value)} disabled={verifiedAccountRequiredDisabled} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-50 transition-colors disabled:cursor-not-allowed disabled:bg-zinc-100" aria-expanded={passkeyExpanded}>
            <span className="font-bold text-zinc-900 inline-flex items-center gap-2"><span className="w-6 h-6 rounded-xl bg-zinc-100 text-zinc-700 inline-flex items-center justify-center"><KeyRound className="w-3.5 h-3.5" /></span>Passkeys</span>
            <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${passkeyExpanded ? "rotate-180" : ""}`} />
          </button>

          {passkeyExpanded ? <div className="px-5 py-4 bg-zinc-50/60 border-t border-zinc-100"><div className="flex flex-col gap-4"><div className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-zinc-400">Passkeys</p><p className="mt-1 text-sm font-semibold text-zinc-900">{passkeyEnabled ? "Enabled" : "Not enabled"}</p><p className="mt-1 text-xs text-zinc-500">Use your fingerprint, Face ID, device PIN, or security key to sign in.</p></div><span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.16em] ${passkeyEnabled ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>{passkeyEnabled ? "Active" : "Off"}</span></div>{passkeyMessage ? <div className={`rounded-2xl border px-4 py-3 text-xs font-semibold ${passkeyError ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{passkeyMessage}</div> : null}<div className="flex flex-wrap gap-3">{!passkeyEnabled ? <button type="button" onClick={() => void handlePasskeySetup()} disabled={passkeyLoading} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60">{passkeyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}{passkeyLoading ? "Setting up…" : "Set up passkey"}</button> : <button type="button" onClick={handlePasskeyRemove} disabled={passkeyLoading} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60">{passkeyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}{passkeyLoading ? "Removing…" : "Remove passkey"}</button>}</div></div></div> : null}

          <button type="button" onClick={() => void onLogoutAllSessions()} disabled={!firebaseUser || securityActionBusy === "logoutAll"} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-50 transition-colors disabled:cursor-not-allowed disabled:bg-zinc-100"><span className="font-bold text-zinc-900 inline-flex items-center gap-2"><LogOut className="w-4 h-4" />Logout all sessions</span>{securityActionBusy === "logoutAll" ? <Loader2 className="w-4 h-4 animate-spin text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}</button>
        </div> : null}
      </section>

      <ConfirmModal
        open={removePasskeyConfirmOpen}
        title="Remove passkey?"
        message="You will no longer be able to use this passkey to sign in to this BuyMesho account until you add a new passkey."
        confirmText="Remove passkey"
        cancelText="Cancel"
        danger
        confirmDisabled={passkeyLoading}
        onConfirm={() => void handlePasskeyRemoveConfirmed()}
        onCancel={() => {
          if (!passkeyLoading) setRemovePasskeyConfirmOpen(false);
        }}
      />
    </>
  );
}
