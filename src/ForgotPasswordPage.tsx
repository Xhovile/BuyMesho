import { useEffect, useState, type FormEvent } from "react";
import { Loader2, CheckCircle2, Mail, RefreshCw } from "lucide-react";
import { sendPasswordResetEmail, onAuthStateChanged } from "firebase/auth";
import FeedbackModal from "./components/FeedbackModal";
import AccountPageShell from "./components/AccountPageShell";
import { auth } from "./firebase";
import { consumeAuthReturnPath, HOME_PATH, navigateToPath } from "./lib/appNavigation";

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

const RESET_COOLDOWN_SECONDS = 35;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [emailSentTo, setEmailSentTo] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [sending, setSending] = useState(false);
  const [waitingForReset, setWaitingForReset] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setCooldownSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownSeconds]);

  // Monitor auth state changes & reloads after sending reset link
  useEffect(() => {
    if (!waitingForReset) return;

    const handleSuccessRedirect = (userEmail?: string | null) => {
      showFeedback(
        "success",
        "Password Reset Verified",
        `Password reset completed for ${userEmail || emailSentTo || "your account"}! Redirecting...`,
        [
          {
            label: "Continue Now",
            onClick: () => {
              setFeedback(null);
              navigateToPath(consumeAuthReturnPath(HOME_PATH));
            },
          },
        ]
      );
      setTimeout(() => {
        navigateToPath(consumeAuthReturnPath(HOME_PATH));
      }, 1500);
    };

    // Listen for Firebase auth state changes (e.g. if logged in after reset)
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        handleSuccessRedirect(user.email);
      }
    });

    // Check if user tab focused or active after completing reset in email window
    const checkAuthStatus = async () => {
      if (auth.currentUser) {
        try {
          await auth.currentUser.reload();
          if (auth.currentUser) {
            handleSuccessRedirect(auth.currentUser.email);
          }
        } catch {
          // Ignore transient reload errors
        }
      }
    };

    window.addEventListener("focus", checkAuthStatus);
    const interval = setInterval(checkAuthStatus, 2500);

    return () => {
      unsub();
      window.removeEventListener("focus", checkAuthStatus);
      clearInterval(interval);
    };
  }, [waitingForReset, emailSentTo]);

  const showFeedback = (
    type: "success" | "error" | "info",
    title: string,
    message: string,
    actions?: FeedbackAction[]
  ) => setFeedback({ open: true, type, title, message, actions });

  const handleReset = async (e?: FormEvent) => {
    if (e) e.preventDefault();

    if (sending) return;

    const targetEmail = email.trim();
    if (!targetEmail) {
      showFeedback("info", "Email required", "Please enter your email address first.");
      return;
    }

    setSending(true);
    try {
      await sendPasswordResetEmail(auth, targetEmail);
      setEmailSentTo(targetEmail);
      setWaitingForReset(true);
      setCooldownSeconds(RESET_COOLDOWN_SECONDS);
      showFeedback(
        "success",
        "Reset email sent",
        `A password reset link has been sent to ${targetEmail}. Keep this tab open while you verify and reset your password in your email.`
      );
    } catch (err: any) {
      if (err?.code === "auth/user-not-found") {
        showFeedback(
          "error",
          "No account found",
          "You do not have an account with this email address.",
          [
            {
              label: "Cancel",
              variant: "secondary",
              onClick: () => {
                setFeedback(null);
                navigateToPath("/login");
              },
            },
            {
              label: "Sign Up",
              onClick: () => {
                setFeedback(null);
                navigateToPath("/signup");
              },
            },
          ]
        );
        return;
      }

      showFeedback(
        "error",
        "Reset failed",
        err?.message || "We could not send the reset email. Please try again."
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <AccountPageShell
      eyebrow="Account"
      title="Reset password"
      description="Enter your email address and BuyMesho will send you a password reset link."
      backLabel="Back to Login"
      onBack={() => navigateToPath("/login")}
    >
      <form onSubmit={handleReset} className="p-8 space-y-5 w-full">
        <div>
          <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Email Address</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={sending}
            placeholder="e.g. student@university.ac.mw"
            className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-60"
          />
        </div>

        {waitingForReset && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0 mt-0.5">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-amber-900 text-sm flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-amber-700" />
                  Reset link sent to {emailSentTo}
                </p>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Open your email inbox, click the password reset link, and update your password. This page is active and will automatically detect when you verify/log in and redirect you.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-amber-200/60 text-xs font-semibold">
              <button
                type="button"
                onClick={() => navigateToPath("/login")}
                className="text-amber-900 hover:underline"
              >
                Proceed to Login Page →
              </button>

              {cooldownSeconds === 0 ? (
                <button
                  type="button"
                  onClick={() => handleReset()}
                  className="text-amber-800 hover:text-amber-950 flex items-center gap-1 hover:underline"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Resend reset email
                </button>
              ) : (
                <span className="text-amber-700/80 text-[11px] font-medium">
                  Resend available in {cooldownSeconds}s
                </span>
              )}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={sending || (waitingForReset && cooldownSeconds > 0)}
          aria-label={
            sending
              ? "Sending reset link"
              : waitingForReset
                ? "Waiting for password reset"
                : "Send reset link"
          }
          className={`w-full sm:w-auto min-w-[220px] py-3 px-6 rounded-xl font-bold transition-all flex items-center justify-center gap-2.5 ${
            sending || waitingForReset
              ? "bg-amber-600 text-white shadow-sm"
              : "bg-zinc-900 text-white hover:bg-zinc-800 active:scale-[0.98]"
          }`}
        >
          {sending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Sending Reset Link...</span>
            </>
          ) : waitingForReset ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Waiting for Password Reset...</span>
            </>
          ) : (
            "Send Reset Link"
          )}
        </button>

        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {waitingForReset
            ? `Password reset link sent to ${emailSentTo}. Waiting for password reset completion.`
            : "Reset link button is active."}
        </p>
      </form>

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

