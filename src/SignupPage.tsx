import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import FeedbackModal from "./components/FeedbackModal";
import AccountPageShell from "./components/AccountPageShell";
import AuthSessionCheckpoint from "./components/AuthSessionCheckpoint";
import FormDropdown from "./components/FormDropdown";
import { auth, db as firestore } from "./firebase";
import { apiFetch } from "./lib/api";
import { UNIVERSITIES } from "./constants";
import { navigateToLogin, navigateToPath } from "./lib/appNavigation";
import { resolveUniversity } from "./lib/university";
import type { University, UserProfile } from "./types";

type FeedbackAction = { label: string; onClick: () => void; variant?: "primary" | "secondary" };
type FeedbackState = { open: boolean; type: "success" | "error" | "info"; title: string; message: string; actions?: FeedbackAction[] } | null;

const PASSWORD_REQUIREMENTS_MESSAGE = "Use at least 8 characters with lowercase, uppercase, and a symbol (e.g. #, @, /).";
const SIGNUP_JUST_CREATED_KEY = "__buymesho_signup_just_created";
type PasswordChecks = { hasMinLength: boolean; hasLowercase: boolean; hasUppercase: boolean; hasSpecial: boolean };
const getPasswordChecks = (password: string): PasswordChecks => ({ hasMinLength: password.length >= 8, hasLowercase: /[a-z]/.test(password), hasUppercase: /[A-Z]/.test(password), hasSpecial: /[^A-Za-z0-9]/.test(password) });
const getPasswordStrength = (checks: PasswordChecks) => Number(checks.hasMinLength) + Number(checks.hasLowercase) + Number(checks.hasUppercase) + Number(checks.hasSpecial);
const getPasswordStrengthLabel = (strength: number) => strength <= 1 ? "Weak" : strength === 2 ? "Fair" : strength === 3 ? "Strong" : "Very strong";
const getPasswordTip = (checks: PasswordChecks) => { const missing: string[] = []; if (!checks.hasMinLength) missing.push("8+ characters"); if (!checks.hasLowercase) missing.push("lowercase letters"); if (!checks.hasUppercase) missing.push("uppercase letters"); if (!checks.hasSpecial) missing.push("a symbol"); if (!missing.length) return "Looks good — strong password."; if (missing.length === 1) return `Add ${missing[0]}.`; if (missing.length === 2) return `Add ${missing[0]} and ${missing[1]}.`; return `Add ${missing.slice(0, -1).join(", ")}, and ${missing[missing.length - 1]}.`; };
const isPermissionError = (err: any) => { const code = String(err?.code || "").toLowerCase(); const message = String(err?.message || "").toLowerCase(); return code.includes("permission") || message.includes("insufficient permissions") || message.includes("permission denied"); };

const bootstrapProfile = async (profile: UserProfile) => { try { await setDoc(doc(firestore, "users", profile.uid), profile, { merge: true }); return; } catch (profileErr) { console.warn("Direct Firestore profile bootstrap failed; trying server bootstrap.", profileErr); } await apiFetch("/api/profile/bootstrap", { method: "POST", body: JSON.stringify({ email: profile.email, university: profile.university }) }); };

export default function SignupPage() {
  const [form, setForm] = useState({ university: resolveUniversity(), email: "", password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const passwordChecks = getPasswordChecks(form.password);
  const strength = getPasswordStrength(passwordChecks);
  const passwordsMatch = form.password.length > 0 && form.confirmPassword.length > 0 && form.password === form.confirmPassword;
  const showFeedback = (type: "success" | "error" | "info", title: string, message: string, actions?: FeedbackAction[]) => setFeedback({ open: true, type, title, message, actions });
  const closeFeedback = () => setFeedback(null);

  const continueToVerification = () => {
    setFeedback(null);
    navigateToPath("/verify-email", { replace: true });
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    if (!passwordsMatch) { showFeedback("error", "Passwords do not match", "Ensure both passwords are identical."); return; }
    if (!passwordChecks.hasMinLength || !passwordChecks.hasLowercase || !passwordChecks.hasUppercase || !passwordChecks.hasSpecial) { showFeedback("error", "Password requirements not met", PASSWORD_REQUIREMENTS_MESSAGE); return; }
    const email = form.email.trim();

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, form.password);
      const user = userCredential.user;
      const profile: UserProfile = { uid: user.uid, email, university: form.university, is_verified: false, is_seller: false, join_date: new Date().toISOString() };
      try { await bootstrapProfile(profile); } catch (profileErr) { console.warn("Profile bootstrap failed after account creation.", profileErr); }
      try { await apiFetch("/api/auth/send-verification-email", { method: "POST", body: JSON.stringify({ display_name: user.displayName || undefined }) }); } catch (emailErr) { console.error("Custom verification email failed", emailErr); }

      sessionStorage.setItem(SIGNUP_JUST_CREATED_KEY, "1");
      showFeedback(
        "success",
        "Success! Account created",
        "Your BuyMesho account is ready. Next, verify your email address to continue.",
        [{ label: "Continue to verification", onClick: continueToVerification }],
      );
    } catch (err: any) {
      if (err?.code === "auth/email-already-in-use") { showFeedback("error", "Signup failed", "This email is already registered. Use Log In to continue.", [{ label: "Cancel", variant: "secondary", onClick: closeFeedback }, { label: "Log In", onClick: () => { closeFeedback(); navigateToLogin(); } }]); return; }
      let message = "We could not create your account. Please try again."; if (err?.code === "auth/invalid-email") message = "Please enter a valid email address."; else if (err?.code === "auth/weak-password") message = PASSWORD_REQUIREMENTS_MESSAGE; else if (isPermissionError(err)) message = "Account creation is temporarily unavailable due to a permissions issue. Please try again in a moment.";
      showFeedback("error", "Signup failed", message);
    } finally { setLoading(false); }
  };

  const fieldClass = "w-full border-0 border-b border-zinc-300 bg-transparent px-0 py-3 text-base text-zinc-900 outline-none transition focus:border-zinc-900";
  return (
    <AuthSessionCheckpoint mode="signup">
      <AccountPageShell
        eyebrow="Account"
        title="Create account"
        description="Join BuyMesho and start buying or selling easily."
        backLabel="Sign in"
        onBack={() => navigateToLogin()}
        hideNavigation
        showBrandHero
      >
        <form onSubmit={handleSignUp} className="w-full space-y-6 pb-28">
          <FormDropdown label="University" value={form.university} options={UNIVERSITIES} onChange={(value) => setForm((prev) => ({ ...prev, university: value as University }))} />
          <div><label className="mb-2 block text-sm font-medium text-zinc-600">Email Address</label><input required type="email" autoComplete="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} className={fieldClass} /></div>
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-600">Password (8+ chars, lowercase, uppercase, symbol)</label>
            <div className="relative"><input required type={showPassword ? "text" : "password"} autoComplete="new-password" value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} className={`${fieldClass} pr-10`} /><button type="button" onClick={() => setShowPassword((prev) => !prev)} className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-zinc-500 transition-colors hover:text-zinc-800" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div>
            <div className="mt-3 space-y-2"><div className="h-1.5 overflow-hidden rounded-full bg-zinc-200"><div className={`h-full rounded-full transition-all ${strength <= 1 ? "w-1/4 bg-red-500" : strength === 2 ? "w-2/4 bg-amber-500" : strength === 3 ? "w-3/4 bg-blue-500" : "w-full bg-emerald-500"}`} /></div><div className="flex items-center justify-between gap-3 text-xs font-medium text-zinc-500"><span>Password strength</span><span>{getPasswordStrengthLabel(strength)}</span></div><p className="text-xs text-zinc-500">{getPasswordTip(passwordChecks)}</p></div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-600">Confirm Password</label>
            <div className="relative"><input required type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" value={form.confirmPassword} onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))} className={`${fieldClass} pr-10`} /><button type="button" onClick={() => setShowConfirmPassword((prev) => !prev)} className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-zinc-500 transition-colors hover:text-zinc-800" aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}>{showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div>
            {form.confirmPassword.length > 0 && <p className={`mt-2 text-sm ${passwordsMatch ? "text-emerald-600" : "text-red-600"}`}>{passwordsMatch ? "Passwords match" : "Passwords do not match"}</p>}
          </div>
          <div className="sticky bottom-4 z-20 pt-2"><div className="rounded-[1.5rem] border border-white/80 bg-white/95 p-3 shadow-[0_18px_50px_rgba(15,23,42,0.14)] backdrop-blur"><button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-6 py-3 font-bold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70">{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Create Account"}</button></div></div>
        </form>
        {feedback && <FeedbackModal open={feedback.open} type={feedback.type} title={feedback.title} message={feedback.message} actions={feedback.actions} onClose={closeFeedback} />}
      </AccountPageShell>
    </AuthSessionCheckpoint>
  );
}
