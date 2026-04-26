import { useEffect, useState } from "react";
import { Loader2, MailCheck, LogOut, RefreshCw, ShieldAlert } from "lucide-react";
import { signOut } from "firebase/auth";
import AccountPageShell from "./components/AccountPageShell";
import FeedbackModal from "./components/FeedbackModal";
import { auth } from "./firebase";
import { navigateToPath } from "./lib/appNavigation";
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

export default function VerifyEmailPage() {
  const { user: firebaseUser, loading: authLoading } = useAuthUser();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const emailVerified = firebaseUser?.emailVerified ?? false;

  useEffect(() => {
    if (authLoading) return;
    if (!firebaseUser) {
      navigateToPath("/login");
      return;
    }
    if (emailVerified) {
      navigateToPath("/profile");
    }
  }, [authLoading, firebaseUser, emailVerified]);

  const showFeedback = (
    type: "success" | "error" | "info",
    title: string,
    message: string,
    actions?: FeedbackAction[]
  ) => setFeedback({ open: true, type, title, message, actions });

  const handleRefresh = async () => {
    if (!firebaseUser) return;
    setBusy(true);
    try {
      const verified = await refreshEmailVerificationState();
      if (verified) {
        showFeedback(
          "success",
          "Email verified",
          "Your email is verified now. Go to Profile to continue.",
          [
            {
              label: "Go to Profile",
              onClick: () => navigateToPath("/profile"),
            },
          ]
        );
        return;
      }
      showFeedback(
        "info",
        "Still not verified",
        "Your email has not been verified yet. Check your inbox and spam folder, then try again."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    if (!firebaseUser) return;
    setBusy(true);
    try {
      const result = await resendVerificationEmail();
      if (result.ok) {
        showFeedback("success", "Verification sent", result.message || "A verification email has been sent.");
        return;
      }
      showFeedback("error", "Resend failed", result.message);
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    setBusy(true);
    try {
      await signOut(auth);
      navigateToPath("/login");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AccountPageShell
      eyebrow="Account"
      title="Verify your email"
      description="Your account is created, but access stays locked until your email address is verified."
      backLabel="Back"
    >
      <div className="space-y-6 w-full">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold">Verification required</p>
              <p className="mt-2 text-sm leading-relaxed text-amber-800">
                Please verify your email before using Profile, Settings, seller tools, or account editing.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-amber-800">
                This page is the only place unverified users should land after signup or login.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <MailCheck className="w-5 h-5 text-zinc-700" />
            <div>
              <p className="font-bold text-zinc-900">{firebaseUser?.email || "Email not available"}</p>
              <p className="text-sm text-zinc-500">Open the message we sent and click the verification link.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleResend}
              disabled={busy || !firebaseUser}
              className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Resend verification email
            </button>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={busy || !firebaseUser}
              className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-900 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MailCheck className="w-4 h-4" />}
              I have verified it
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
