import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup, signOut } from "firebase/auth";
import FeedbackModal from "./components/FeedbackModal";
import TotpChallengeModal from "./components/TotpChallengeModal";
import AccountPageShell from "./components/AccountPageShell";
import { auth } from "./firebase";
import {
  consumeAuthReturnPath,
  HOME_PATH,
  navigateToLogin,
  navigateToPath,
  navigateToSignup,
} from "./lib/appNavigation";
import { clearTotpVerifiedSessionToken } from "./lib/totpSession";
import { getTotpStatus, verifyTotpChallenge } from "./lib/security";

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

function GoogleMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 48 48"
      className="w-5 h-5 shrink-0"
      focusable="false"
    >
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.658 32.962 29.315 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.042l5.657-5.657C34.051 6.053 29.291 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.651-.389-3.917Z" />
      <path fill="#FF3D00" d="M6.306 14.691 12.877 19.5C14.655 15.109 18.949 12 24 12c3.059 0 5.842 1.154 7.961 3.042l5.657-5.657C34.051 6.053 29.291 4 24 4c-7.727 0-14.438 4.348-17.694 10.691Z" />
      <path fill="#4CAF50" d="M24 44c5.194 0 9.91-1.984 13.48-5.219l-6.23-5.266C29.196 35.091 26.769 36 24 36c-5.294 0-9.623-3.024-11.28-7.454l-6.52 5.018C9.415 39.556 16.227 44 24 44Z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.06 12.06 0 0 1-4.053 5.515l.003-.002 6.23 5.266C36.042 38.262 44 32 44 24c0-1.341-.138-2.651-.389-3.917Z" />
    </svg>
  );
}

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [totpChallengeOpen, setTotpChallengeOpen] = useState(false);
  const [totpChallengeCode, setTotpChallengeCode] = useState("");
  const [totpChallengeBusy, setTotpChallengeBusy] = useState(false);

  const showFeedback = (
    type: "success" | "error" | "info",
    title: string,
    message: string,
    actions?: FeedbackAction[]
  ) => setFeedback({ open: true, type, title, message, actions });

  const closeFeedback = () => setFeedback(null);

  const getPostAuthPath = () => consumeAuthReturnPath(HOME_PATH);

  const completeSuccessfulLogin = async (user: { reload: () => Promise<void>; emailVerified: boolean }) => {
    await user.reload();

    const totpStatusResult = await getTotpStatus();
    if (totpStatusResult.ok && totpStatusResult.data?.status === "enabled") {
      setTotpChallengeCode("");
      setTotpChallengeOpen(true);
      return;
    }

    if (!user.emailVerified) {
      navigateToPath("/verify-email");
      return;
    }

    navigateToPath(getPostAuthPath());
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearTotpVerifiedSessionToken();

    const email = form.email.trim();
    const password = form.password;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await completeSuccessfulLogin(userCredential.user);
    } catch (err: any) {
      if (err?.code === "auth/user-not-found") {
        showFeedback("error", "Login failed", "You do not have an account.", [
          {
            label: "Cancel",
            variant: "secondary",
            onClick: closeFeedback,
          },
          {
            label: "Sign Up",
            onClick: () => {
              closeFeedback();
              navigateToSignup();
            },
          },
        ]);
        return;
      }

      if (err?.code === "auth/wrong-password") {
        showFeedback("error", "Login failed", "Incorrect password. Please try again.", [
          {
            label: "Cancel",
            variant: "secondary",
            onClick: closeFeedback,
          },
          {
            label: "Retry",
            onClick: () => {
              setForm((prev) => ({ ...prev, password: "" }));
              closeFeedback();
            },
          },
        ]);
        return;
      }

      if (err?.code === "auth/invalid-credential") {
        showFeedback("error", "Login failed", "Incorrect email or password. Please try again.", [
          {
            label: "Cancel",
            variant: "secondary",
            onClick: closeFeedback,
          },
          {
            label: "Retry",
            onClick: () => {
              setForm((prev) => ({ ...prev, password: "" }));
              closeFeedback();
            },
          },
        ]);
        return;
      }

      let message = "Login failed. Please try again.";
      if (err?.code === "auth/too-many-requests") {
        message = "Too many failed attempts. Please try again later.";
      }
      showFeedback("error", "Login failed", message, [
        {
          label: "Cancel",
          variant: "secondary",
          onClick: closeFeedback,
        },
        {
          label: "Retry",
          onClick: () => {
            closeFeedback();
          },
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    clearTotpVerifiedSessionToken();

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      const result = await signInWithPopup(auth, provider);
      await completeSuccessfulLogin(result.user);
    } catch (err: any) {
      if (err?.code === "auth/popup-closed-by-user" || err?.code === "auth/cancelled-popup-request") {
        return;
      }

      if (err?.code === "auth/account-exists-with-different-credential") {
        showFeedback(
          "error",
          "Google sign-in failed",
          "That email is already linked to another sign-in method. Use the original method to log in first."
        );
        return;
      }

      showFeedback("error", "Google sign-in failed", "Unable to continue with Google. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleTotpChallengeSubmit = async () => {
    if (!totpChallengeCode.trim()) {
      showFeedback("info", "Code required", "Enter the 6-digit authenticator code.");
      return;
    }

    setTotpChallengeBusy(true);
    try {
      const result = await verifyTotpChallenge(totpChallengeCode);

      if (!result.ok) {
        showFeedback("error", "Verification failed", result.message);
        return;
      }

      setTotpChallengeOpen(false);
      setTotpChallengeCode("");
      navigateToPath(getPostAuthPath());
    } finally {
      setTotpChallengeBusy(false);
    }
  };

  const handleTotpChallengeCancel = async () => {
    setTotpChallengeOpen(false);
    setTotpChallengeCode("");
    clearTotpVerifiedSessionToken();
    try {
      await signOut(auth);
    } finally {
      navigateToLogin();
    }
  };

  return (
    <AccountPageShell
      eyebrow="Account"
      title="Log in"
      description="Access your BuyMesho account, manage your profile, and continue buying or selling."
      backLabel="Back"
    >
      <form onSubmit={handleLogin} className="space-y-6 w-full">
        <div>
          <label className="block text-sm font-medium text-zinc-600 mb-2">Email Address</label>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            className="w-full px-0 py-3 bg-transparent border-b border-zinc-300 focus:border-zinc-900 outline-none text-base"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-600 mb-2">Password</label>
          <div className="relative">
            <input
              required
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              className="w-full px-0 pr-10 py-3 bg-transparent border-b border-zinc-300 focus:border-zinc-900 outline-none text-base"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-zinc-500 hover:text-zinc-800 transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 text-sm font-bold">
          <button
            type="button"
            onClick={() => navigateToPath("/forgot-password")}
            className="text-primary hover:underline"
          >
            Forgot Password?
          </button>
          <button
            type="button"
            onClick={() => navigateToSignup()}
            className="text-zinc-500 hover:text-zinc-900 hover:underline"
          >
            Create account
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto min-w-[180px] bg-zinc-900 text-white py-3 px-6 rounded-2xl font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Log In"}
        </button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-200" />
          <span className="text-xs font-bold uppercase tracking-[0.22em] text-zinc-400">Or</span>
          <div className="h-px flex-1 bg-zinc-200" />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full sm:w-auto min-w-[180px] border border-zinc-300 bg-white text-zinc-800 py-3 px-6 rounded-2xl font-bold hover:bg-zinc-50 transition-colors flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <GoogleMark />}
          <span>{loading ? "Connecting..." : "Google"}</span>
        </button>
      </form>

      <TotpChallengeModal
        open={totpChallengeOpen}
        title="Two-factor verification"
        message="Your account uses an authenticator app. Enter the current 6-digit code to continue."
        code={totpChallengeCode}
        busy={totpChallengeBusy}
        onCodeChange={setTotpChallengeCode}
        onSubmit={handleTotpChallengeSubmit}
        onCancel={handleTotpChallengeCancel}
      />

      {feedback && (
        <FeedbackModal
          open={feedback.open}
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
          actions={feedback.actions}
          onClose={closeFeedback}
        />
      )}
    </AccountPageShell>
  );
}
