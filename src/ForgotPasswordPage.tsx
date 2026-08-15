import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import FeedbackModal from "./components/FeedbackModal";
import AccountPageShell from "./components/AccountPageShell";
import { navigateToPath } from "./lib/appNavigation";
import { apiFetch } from "./lib/api";

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

const RESET_COOLDOWN_SECONDS = 45;

function getFriendlyResetError(error: any): string {
  const status = Number(error?.status);
  const raw = String(error?.message || "").toLowerCase();

  if (status === 429 || raw.includes("too many attempts")) {
    return "Too many reset attempts. Please wait a few minutes before trying again.";
  }

  if (
    raw.includes("unrecognised ip") ||
    raw.includes("unrecognized ip") ||
    raw.includes("authorised_ips") ||
    raw.includes("unauthorized")
  ) {
    return "Password reset email delivery is temporarily unavailable. Please try again later.";
  }

  if (status >= 500) {
    return "We could not send the reset email right now. Please try again later.";
  }

  return "We could not send the reset email. Please try again.";
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [sending, setSending] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setCooldownSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownSeconds]);

  const showFeedback = (
    type: "success" | "error" | "info",
    title: string,
    message: string,
    actions?: FeedbackAction[]
  ) => setFeedback({ open: true, type, title, message, actions });

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();

    if (sending || cooldownSeconds > 0) return;

    if (!email.trim()) {
      showFeedback("info", "Email required", "Please enter your email address first.");
      return;
    }

    setSending(true);
    try {
      await apiFetch("/api/auth/send-password-reset-email", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      showFeedback(
        "success",
        "Reset email sent",
        "Check your inbox for the password reset link."
      );
      setCooldownSeconds(RESET_COOLDOWN_SECONDS);
    } catch (err: any) {
      if (err?.status === 404) {
        showFeedback(
          "error",
          "No account found",
          "We could not find a BuyMesho account with that email address.",
          [
            {
              label: "Back to login",
              variant: "secondary",
              onClick: () => {
                setFeedback(null);
                navigateToPath("/login");
              },
            },
            {
              label: "Create account",
              onClick: () => {
                setFeedback(null);
                navigateToPath("/signup");
              },
            },
          ]
        );
        return;
      }

      showFeedback("error", "Reset unavailable", getFriendlyResetError(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <AccountPageShell
      eyebrow="Account"
      title="Reset password"
      description="Enter your email address and BuyMesho will send you a secure password reset link."
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
            className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={sending || cooldownSeconds > 0}
          aria-label={
            sending
              ? "Sending reset link"
              : cooldownSeconds > 0
                ? `Send reset link disabled. Try again in ${cooldownSeconds} seconds`
                : "Send reset link"
          }
          className={`w-full sm:w-auto min-w-[200px] py-3 px-6 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
            sending || cooldownSeconds > 0
              ? "bg-zinc-500 text-white cursor-not-allowed"
              : "bg-zinc-900 text-white hover:bg-zinc-800 active:scale-[0.98]"
          }`}
        >
          {sending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Sending...
            </>
          ) : cooldownSeconds > 0 ? (
            `Try again in ${cooldownSeconds}s`
          ) : (
            "Send Reset Link"
          )}
        </button>
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
