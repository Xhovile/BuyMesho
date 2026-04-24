import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import {
  fetchSignInMethodsForEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import FeedbackModal from "./components/FeedbackModal";
import TotpChallengeModal from "./components/TotpChallengeModal";
import AccountPageShell from "./components/AccountPageShell";
import { auth } from "./firebase";
import { navigateToPath } from "./lib/appNavigation";
import { clearTotpVerifiedSessionToken } from "./lib/totpSession";
import { getTotpStatus, verifyTotpChallenge } from "./lib/security";

type FeedbackState = {
  open: boolean;
  type: "success" | "error" | "info";
  title: string;
  message: string;
} | null;

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [totpChallengeOpen, setTotpChallengeOpen] = useState(false);
  const [totpChallengeCode, setTotpChallengeCode] = useState("");
  const [totpChallengeBusy, setTotpChallengeBusy] = useState(false);

  const showFeedback = (
    type: "success" | "error" | "info",
    title: string,
    message: string
  ) => setFeedback({ open: true, type, title, message });

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearTotpVerifiedSessionToken();

    const email = form.email.trim();
    const password = form.password;

    try {
      const signInMethods = await fetchSignInMethodsForEmail(auth, email);
      if (signInMethods.length === 0) {
        showFeedback("error", "Login failed", "You do not have an account.");
        return;
      }

      await signInWithEmailAndPassword(auth, email, password);

      const totpStatusResult = await getTotpStatus();
      if (totpStatusResult.ok && totpStatusResult.data?.status === "enabled") {
        setTotpChallengeCode("");
        setTotpChallengeOpen(true);
        return;
      }

      navigateToPath("/profile");
    } catch (err: any) {
      let message = "Incorrect password. Please try again.";
      if (err?.code === "auth/user-not-found") {
        message = "You do not have an account.";
      } else if (err?.code === "auth/wrong-password" || err?.code === "auth/invalid-credential") {
        message = "Incorrect password. Please try again.";
      } else if (err?.code === "auth/too-many-requests") {
        message = "Too many failed attempts. Please try again later.";
      }
      showFeedback("error", "Login failed", message);
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
      navigateToPath("/profile");
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
      navigateToPath("/login");
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
          <input
            required
            type="password"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            className="w-full px-0 py-3 bg-transparent border-b border-zinc-300 focus:border-zinc-900 outline-none text-base"
          />
        </div>

        <div className="flex flex-wrap gap-4 text-sm font-bold">
          <button
            type="button"
            onClick={() => navigateToPath("/forgot-password")}
            className="text-primary hover:underline"
          >
            Forgot Password?
          </button>
          <button
            type="button"
            onClick={() => navigateToPath("/signup")}
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
          onClose={() => setFeedback(null)}
        />
      )}
    </AccountPageShell>
  );
}
