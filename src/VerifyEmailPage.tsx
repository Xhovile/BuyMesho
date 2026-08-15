import { useEffect, useState } from "react";
import { Loader2, MailCheck, LogOut, RefreshCw, ShieldAlert } from "lucide-react";
import { signOut } from "firebase/auth";
import AccountPageShell from "./components/AccountPageShell";
import FeedbackModal from "./components/FeedbackModal";
import { auth } from "./firebase";
import { consumeAuthReturnPath, HOME_PATH, navigateToLogin, navigateToPath } from "./lib/appNavigation";
import { refreshEmailVerificationState, resendVerificationEmail } from "./lib/security";
import { useAuthUser } from "./hooks/useAuthUser";

type FeedbackAction = {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
};

type FeedbackState = {
  open: boolean;
  type: "success" | "error" | "info";
  title: string;
  message: string;
  actions?: FeedbackAction[];
} | null;

const RESEND_COOLDOWN_SECONDS = 45;
const VERIFICATION_POLL_INTERVAL_MS = 4000;
const SIGNUP_JUST_CREATED_KEY = "__buymesho_signup_just_created";

export default function VerifyEmailPage() {
  const { user: firebaseUser, loading: authLoading } = useAuthUser();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const emailVerified = firebaseUser?.emailVerified ?? false;

  const redirectAfterVerification = () => {
    sessionStorage.removeItem(SIGNUP_JUST_CREATED_KEY);
    navigateToPath(consumeAuthReturnPath(HOME_PATH), { replace: true });
  };

  useEffect(() => {
    if (authLoading) return;
    if (!firebaseUser) {
      navigateToLogin();
      return;
    }
    if (emailVerified) {
      redirectAfterVerification();
    }
  }, [authLoading, firebaseUser, emailVerified]);

  useEffect(() => {
    if (!firebaseUser || authLoading || emailVerified) return;

    let cancelled = false;

    const checkVerification = async () => {
      const verified = await refreshEmailVerificationState();
      if (cancelled) return;
      if (verified) {
        redirectAfterVerification();
      }
    };

    void checkVerification();
    const interval = window.setInterval(() => {
      void checkVerification();
    }, VERIFICATION_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [firebaseUser?.uid, authLoading, emailVerified]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const showFeedback = (
    type: "success" | "error" | "info",
    title: string,
    message: string,
    actions?: FeedbackAction[]
  ) => setFeedback({ open: true, type, title, message, actions });

  const handleResend = async () => {
    if (!firebaseUser || busy || resendCooldown > 0) return;
    setBusy(true);
    try {
      const result = await resendVerificationEmail();
      if (result.ok) {
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
        showFeedback("success", "Verification sent", result.message || "A verification email has been sent.");
        return;
      }
      showFeedback("error", "Could not resend", result.message);
      if (result.code === "auth/too-many-requests" || result.message.toLowerCase().includes("too many attempts")) {
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    setBusy(true);
    try {
      await signOut(auth);
      sessionStorage.removeItem(SIGNUP_JUST_CREATED_KEY);
      navigateToLogin();
    } finally {
      setBusy(false);
    }
  };

  return (
    <AccountPageShell
      eyebrow="Account"
      title="Verify your email"
      description="Your account is ready, but access stays locked until your email address is verified."
      backLabel="Back"
    >
      <div className="space-y-6 w-full">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold">Verification required</p>
              <p className="mt-2 text-sm leading-relaxed text-amber-800">
                Open the BuyMesho verification email and confirm your address. This page will continue automatically once verification is detected.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <MailCheck className="w-5 h-5 text-zinc-700" />
            <div className="min-w-0">
              <p className="font-bold text-zinc-900 truncate">{firebaseUser?.email || "Email not available"}</p>
              <p className="text-sm text-zinc-500">Check your inbox and spam folder if needed.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-700 shrink-0" />
            <div>
              <p className="text-sm font-bold text-zinc-900">Waiting for verification…</p>
              <p className="text-xs text-zinc-500">BuyMesho is checking automatically every few seconds.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleResend}
              disabled={busy || !firebaseUser || resendCooldown > 0}
              className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend verification email"}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-900 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogOut className="w-4 h-4" />
              Log out
            </button>
          </div>
        </div>
      </div>

      {feedback && (
        <FeedbackModal
          open={feedback.open}
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
          actions={feedback.actions}
          onClose={() => setFeedback(null)}
        />
      )}
    </AccountPageShell>
  );
}
