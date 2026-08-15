import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import FeedbackModal from "./components/FeedbackModal";
import TotpChallengeModal from "./components/TotpChallengeModal";
import AccountPageShell from "./components/AccountPageShell";
import AuthSessionCheckpoint from "./components/AuthSessionCheckpoint";
import { auth } from "./firebase";
import { consumeAuthReturnPath, HOME_PATH, navigateToLogin, navigateToPath, navigateToSignup } from "./lib/appNavigation";
import { clearTotpVerifiedSessionToken } from "./lib/totpSession";
import { getTotpStatus, verifyTotpChallenge } from "./lib/security";
import { apiFetch } from "./lib/api";

type FeedbackAction = { label: string; onClick: () => void; variant?: "primary" | "secondary" };
type FeedbackState = { open: boolean; type: "success" | "error" | "info"; title: string; message: string; actions?: FeedbackAction[] } | null;
type AuthTransitionState = { redirecting: boolean; destinationLabel?: string } | null;

function getTicketValidatorReturnUrl() {
  const params = new URLSearchParams(window.location.search);
  const client = params.get("client");
  const returnTo = params.get("returnTo");
  if (client !== "ticket-validator" || !returnTo) return null;
  try {
    const url = new URL(returnTo);
    const allowedOrigin = import.meta.env.VITE_TICKET_VALIDATOR_URL?.trim() || "https://ticketvalidator.vercel.app";
    if (url.origin !== new URL(allowedOrigin).origin) return null;
    return url;
  } catch {
    return null;
  }
}

function isValidEmailFormat(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [totpChallengeOpen, setTotpChallengeOpen] = useState(false);
  const [totpChallengeCode, setTotpChallengeCode] = useState("");
  const [totpChallengeBusy, setTotpChallengeBusy] = useState(false);
  const [authTransition, setAuthTransition] = useState<AuthTransitionState>(null);
  const isValidatorEntry = Boolean(getTicketValidatorReturnUrl());

  const showFeedback = (type: "success" | "error" | "info", title: string, message: string, actions?: FeedbackAction[]) => setFeedback({ open: true, type, title, message, actions });
  const closeFeedback = () => setFeedback(null);
  const getPostAuthPath = () => consumeAuthReturnPath(HOME_PATH);

  const finishAuthentication = async () => {
    const returnUrl = getTicketValidatorReturnUrl();
    if (returnUrl && auth.currentUser) {
      setAuthTransition({ redirecting: true, destinationLabel: "Ticket Validator" });
      window.setTimeout(async () => {
        const token = await auth.currentUser!.getIdToken(true);
        returnUrl.searchParams.set("buymesho_session", token);
        window.location.replace(returnUrl.toString());
      }, 700);
      return;
    }

    const targetPath = getPostAuthPath();
    const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (targetPath === currentPath) {
      setAuthTransition({ redirecting: false });
      return;
    }

    setAuthTransition({ redirecting: true, destinationLabel: targetPath === HOME_PATH ? "BuyMesho home" : "your requested page" });
    window.setTimeout(() => navigateToPath(targetPath, { replace: true }), 700);
  };

  const completeSuccessfulLogin = async (user: { reload: () => Promise<void>; emailVerified: boolean }) => {
    await user.reload();
    const totpStatusResult = await getTotpStatus();
    if (totpStatusResult.ok && totpStatusResult.data?.status === "enabled") {
      setTotpChallengeCode("");
      setTotpChallengeOpen(true);
      return;
    }
    if (!user.emailVerified) {
      navigateToPath("/verify-email", { replace: true });
      return;
    }
    await finishAuthentication();
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    const email = form.email.trim().toLowerCase();

    if (!isValidEmailFormat(email)) {
      showFeedback("error", "Invalid email address", "Please enter a valid email address.");
      return;
    }

    setLoading(true);
    clearTotpVerifiedSessionToken();

    try {
      await apiFetch("/api/auth/check-login-email", {
        method: "POST",
        body: JSON.stringify({ email }),
      });

      const userCredential = await signInWithEmailAndPassword(auth, email, form.password);
      await completeSuccessfulLogin(userCredential.user);
    } catch (err: any) {
      if (err?.status === 400 && /valid email address/i.test(String(err?.message || ""))) {
        showFeedback("error", "Invalid email address", "Please enter a valid email address.");
        return;
      }

      if (err?.status === 404 || /not registered with BuyMesho/i.test(String(err?.message || ""))) {
        showFeedback("error", "Email not registered", "This email address is not registered with BuyMesho.", [
          { label: "Cancel", variant: "secondary", onClick: closeFeedback },
          { label: "Create Account", onClick: () => { closeFeedback(); navigateToSignup(); } },
        ]);
        return;
      }

      if (err?.status === 429) {
        showFeedback("error", "Too many attempts", "Please wait a moment and try again.");
        return;
      }

      if (err?.code === "auth/user-not-found") {
        showFeedback("error", "Email not registered", "This email address is not registered with BuyMesho.", [
          { label: "Cancel", variant: "secondary", onClick: closeFeedback },
          { label: "Create Account", onClick: () => { closeFeedback(); navigateToSignup(); } },
        ]);
        return;
      }

      if (err?.code === "auth/wrong-password" || err?.code === "auth/invalid-credential") {
        showFeedback("error", "Incorrect password", "Incorrect password. Please try again.", [
          { label: "Cancel", variant: "secondary", onClick: closeFeedback },
          { label: "Retry", onClick: () => { setForm((prev) => ({ ...prev, password: "" })); closeFeedback(); } },
        ]);
        return;
      }

      const message = err?.code === "auth/too-many-requests" ? "Too many failed attempts. Please try again later." : "Login failed. Please try again.";
      showFeedback("error", "Login failed", message, [
        { label: "Cancel", variant: "secondary", onClick: closeFeedback },
        { label: "Retry", onClick: closeFeedback },
      ]);
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
      await finishAuthentication();
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

  if (authTransition) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(30,41,59,0.08),_transparent_35%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_48%,_#f8fafc_100%)] text-zinc-900">
        <main className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-4 py-10">
          <section className="w-full rounded-[2rem] border border-white/80 bg-white/90 p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur sm:p-10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <span className="text-2xl font-black">✓</span>
            </div>
            <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-600">Account</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">You’re signed in</h1>
            <p className="mt-3 text-sm font-medium leading-relaxed text-zinc-600 sm:text-base">
              {authTransition.redirecting
                ? `Your session is ready. Redirecting you to ${authTransition.destinationLabel ?? "your destination"}.`
                : "Your BuyMesho session is ready."}
            </p>
            {authTransition.redirecting ? (
              <div className="mt-8 flex items-center justify-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm font-bold text-zinc-700">
                <Loader2 className="h-5 w-5 animate-spin" />
                Redirecting…
              </div>
            ) : (
              <button type="button" onClick={() => setAuthTransition(null)} className="mt-8 inline-flex items-center justify-center rounded-2xl bg-zinc-900 px-5 py-3 font-bold text-white hover:bg-zinc-800">
                Continue
              </button>
            )}
          </section>
        </main>
      </div>
    );
  }

  return (
    <AuthSessionCheckpoint mode="login">
      <AccountPageShell
        eyebrow="Account"
        title="Log in"
        description={isValidatorEntry
          ? "Sign in with your approved BuyMesho event creator account to continue to Ticket Validator."
          : "Access your BuyMesho account, manage your profile, and continue buying or selling."
        }
        hideNavigation
        hideBackButton
        showBrandHero
      >
        <form onSubmit={handleLogin} className="w-full space-y-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-600">Email Address</label>
            <input required type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} className="w-full border-0 border-b border-zinc-300 bg-transparent px-0 py-3 text-base outline-none transition focus:border-zinc-900" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-600">Password</label>
            <div className="relative"><input required type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} className="w-full border-0 border-b border-zinc-300 bg-transparent px-0 py-3 pr-10 text-base outline-none transition focus:border-zinc-900" /><button type="button" onClick={() => setShowPassword((prev) => !prev)} className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-zinc-500 transition-colors hover:text-zinc-800" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div>
          </div>
          {!isValidatorEntry && <div className="flex items-center justify-between gap-4 text-sm font-bold"><button type="button" onClick={() => navigateToPath("/forgot-password")} className="text-primary hover:underline">Forgot Password?</button><button type="button" onClick={() => navigateToSignup()} className="text-zinc-500 hover:text-zinc-900 hover:underline">Create account</button></div>}
          <button type="submit" disabled={loading} className="flex min-w-[180px] items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-6 py-3 font-bold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto">{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Log In"}</button>
        </form>
        <TotpChallengeModal open={totpChallengeOpen} title="Two-factor verification" message="Your account uses an authenticator app. Enter the current 6-digit code to continue." code={totpChallengeCode} busy={totpChallengeBusy} onCodeChange={setTotpChallengeCode} onSubmit={handleTotpChallengeSubmit} onCancel={handleTotpChallengeCancel} />
        {feedback && <FeedbackModal open={feedback.open} type={feedback.type} title={feedback.title} message={feedback.message} actions={feedback.actions} onClose={closeFeedback} />}
      </AccountPageShell>
    </AuthSessionCheckpoint>
  );
}
