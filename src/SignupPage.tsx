import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import FeedbackModal from "./components/FeedbackModal";
import AccountPageShell from "./components/AccountPageShell";
import FormDropdown from "./components/FormDropdown";
import { auth, db as firestore } from "./firebase";
import { apiFetch } from "./lib/api";
import { UNIVERSITIES } from "./constants";
import { navigateToPath } from "./lib/appNavigation";
import { resolveUniversity } from "./lib/university";
import type { University, UserProfile } from "./types";

type FeedbackState = {
  open: boolean;
  type: "success" | "error" | "info";
  title: string;
  message: string;
} | null;

const PASSWORD_REQUIREMENTS_MESSAGE =
  "Use at least 8 characters with lowercase, uppercase, and a symbol (e.g. #, @, /).";

type PasswordChecks = {
  hasMinLength: boolean;
  hasLowercase: boolean;
  hasUppercase: boolean;
  hasSpecial: boolean;
};

const getPasswordChecks = (password: string): PasswordChecks => ({
  hasMinLength: password.length >= 8,
  hasLowercase: /[a-z]/.test(password),
  hasUppercase: /[A-Z]/.test(password),
  hasSpecial: /[^A-Za-z0-9]/.test(password),
});

const getPasswordStrength = (checks: PasswordChecks) => {
  let score = 0;
  if (checks.hasMinLength) score++;
  if (checks.hasLowercase) score++;
  if (checks.hasUppercase) score++;
  if (checks.hasSpecial) score++;
  return score;
};

const getPasswordStrengthLabel = (strength: number) => {
  if (strength <= 1) return "Weak";
  if (strength === 2) return "Fair";
  if (strength === 3) return "Strong";
  return "Very strong";
};

const getPasswordTip = (checks: PasswordChecks) => {
  const missing: string[] = [];

  if (!checks.hasMinLength) missing.push("8+ characters");
  if (!checks.hasLowercase) missing.push("lowercase letters");
  if (!checks.hasUppercase) missing.push("uppercase letters");
  if (!checks.hasSpecial) missing.push("a symbol");

  if (missing.length === 0) return "Looks good — strong password.";
  if (missing.length === 1) return `Add ${missing[0]}.`;
  if (missing.length === 2) return `Add ${missing[0]} and ${missing[1]}.`;
  return `Add ${missing.slice(0, -1).join(", ")}, and ${missing[missing.length - 1]}.`;
};

const isPermissionError = (err: any) => {
  const code = String(err?.code || "").toLowerCase();
  const message = String(err?.message || "").toLowerCase();
  return (
    code.includes("permission") ||
    message.includes("insufficient permissions") ||
    message.includes("permission denied")
  );
};

const bootstrapProfile = async (profile: UserProfile) => {
  try {
    await setDoc(doc(firestore, "users", profile.uid), profile, { merge: true });
    return;
  } catch (profileErr) {
    console.warn("Direct Firestore profile bootstrap failed; trying server bootstrap.", profileErr);
  }

  await apiFetch("/api/profile/bootstrap", {
    method: "POST",
    body: JSON.stringify({
      email: profile.email,
      university: profile.university,
    }),
  });
};

export default function SignupPage() {
  const [form, setForm] = useState({
    university: resolveUniversity(),
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [redirectAfterFeedback, setRedirectAfterFeedback] = useState(false);

  const passwordChecks = getPasswordChecks(form.password);
  const strength = getPasswordStrength(passwordChecks);
  const passwordsMatch =
    form.password.length > 0 && form.confirmPassword.length > 0 && form.password === form.confirmPassword;

  const showFeedback = (
    type: "success" | "error" | "info",
    title: string,
    message: string
  ) => setFeedback({ open: true, type, title, message });

  const closeFeedback = () => {
    setFeedback(null);
    if (redirectAfterFeedback) {
      setRedirectAfterFeedback(false);
      navigateToPath("/verify-email");
    }
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();

    if (!passwordsMatch) {
      showFeedback("error", "Passwords do not match", "Ensure both passwords are identical.");
      return;
    }

    const passwordChecks = getPasswordChecks(form.password);
    if (
      !passwordChecks.hasMinLength ||
      !passwordChecks.hasLowercase ||
      !passwordChecks.hasUppercase ||
      !passwordChecks.hasSpecial
    ) {
      showFeedback("error", "Password requirements not met", PASSWORD_REQUIREMENTS_MESSAGE);
      return;
    }

    const email = form.email.trim();

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, form.password);
      const user = userCredential.user;

      const profile: UserProfile = {
        uid: user.uid,
        email,
        university: form.university,
        is_verified: false,
        is_seller: false,
        join_date: new Date().toISOString(),
      };

      try {
        await bootstrapProfile(profile);
      } catch (profileErr) {
        console.warn("Profile bootstrap failed after account creation.", profileErr);
      }

      let emailNotice = "A verification email was sent. Check your inbox and verify before you sell.";
      try {
        const displayName = email.split("@")[0] || null;
        await apiFetch("/api/auth/send-verification-email", {
          method: "POST",
          body: JSON.stringify({ display_name: displayName }),
        });
      } catch (emailErr: any) {
        console.error("Custom verification email failed", emailErr);
        emailNotice =
          "The account was created, but the verification email could not be sent yet. Open the verification page and resend it after SMTP is configured.";
      }

      setRedirectAfterFeedback(true);
      showFeedback("info", "Account created", emailNotice);
    } catch (err: any) {
      let message = "We could not create your account. Please try again.";

      if (err?.code === "auth/email-already-in-use") {
        message = "This email is already registered. Please log in instead.";
      } else if (err?.code === "auth/invalid-email") {
        message = "Please enter a valid email address.";
      } else if (err?.code === "auth/weak-password") {
        message = PASSWORD_REQUIREMENTS_MESSAGE;
      } else if (isPermissionError(err)) {
        message =
          "Account creation is temporarily unavailable due to a permissions issue. Please try again in a moment.";
      }

      showFeedback("error", "Signup failed", message);
    } finally {
      setLoading(false);
    }
  };

  const fieldClass =
    "w-full bg-transparent px-0 py-3 text-base text-zinc-900 border-0 border-b border-zinc-300 outline-none transition focus:border-zinc-900";

  return (
    <AccountPageShell
      eyebrow="Account"
      title="Create account"
      description="Join BuyMesho and start buying or selling easily."
      backLabel="Back"
    >
      <form onSubmit={handleSignUp} className="space-y-6 w-full">
        <FormDropdown
          label="University"
          value={form.university}
          options={UNIVERSITIES}
          onChange={(value) => setForm((prev) => ({ ...prev, university: value as University }))}
        />

        <div>
          <label className="block text-sm font-medium text-zinc-600 mb-2">Email Address</label>
          <input
            required
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            className={fieldClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-600 mb-2">
            Password (8+ chars, lowercase, uppercase, symbol)
          </label>
          <div className="relative">
            <input
              required
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              className={`${fieldClass} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-0 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-800 transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div className="mt-3 space-y-2">
            <div className="h-1.5 bg-zinc-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  strength <= 1
                    ? "bg-red-500 w-1/4"
                    : strength === 2
                      ? "bg-amber-500 w-2/4"
                      : strength === 3
                        ? "bg-blue-500 w-3/4"
                        : "bg-emerald-500 w-full"
                }`}
              />
            </div>
            <div className="flex items-center justify-between gap-3 text-xs font-medium text-zinc-500">
              <span>Password strength</span>
              <span
                className={
                  strength <= 1
                    ? "text-red-600"
                    : strength === 2
                      ? "text-amber-600"
                      : strength === 3
                        ? "text-blue-600"
                        : "text-emerald-600"
                }
              >
                {getPasswordStrengthLabel(strength)}
              </span>
            </div>
            <p className="text-xs text-zinc-500">{getPasswordTip(passwordChecks)}</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-600 mb-2">Confirm Password</label>
          <div className="relative">
            <input
              required
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              className={`${fieldClass} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute right-0 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-800 transition-colors"
              aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {form.confirmPassword.length > 0 && (
            <p className={`text-sm mt-2 ${passwordsMatch ? "text-emerald-600" : "text-red-600"}`}>
              {passwordsMatch ? "Passwords match" : "Passwords do not match"}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto min-w-[200px] bg-zinc-900 text-white py-3 px-6 rounded-2xl font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}
        </button>
      </form>

      {feedback && (
        <FeedbackModal
          open={feedback.open}
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
          onClose={closeFeedback}
        />
      )}
    </AccountPageShell>
  );
}
