import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
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

const getPasswordStrength = (password: string) => {
  let score = 0;
  if (password.length >= 6) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
};

const getPasswordStrengthLabel = (strength: number) => {
  if (strength <= 1) return "Weak";
  if (strength === 2) return "Fair";
  if (strength === 3) return "Strong";
  return "Very strong";
};

const getPasswordTip = (strength: number) => {
  if (strength <= 1) return "Use at least 6 characters, with a number or symbol.";
  if (strength === 2) return "Add an uppercase letter to improve it.";
  if (strength === 3) return "Add a symbol to make it stronger.";
  return "This password is in good shape.";
};

export default function SignupPage() {
  const [form, setForm] = useState({
    university: resolveUniversity(),
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const strength = getPasswordStrength(form.password);
  const passwordsMatch =
    form.password.length > 0 && form.confirmPassword.length > 0 && form.password === form.confirmPassword;

  const showFeedback = (
    type: "success" | "error" | "info",
    title: string,
    message: string
  ) => setFeedback({ open: true, type, title, message });

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();

    if (!passwordsMatch) {
      showFeedback("error", "Passwords do not match", "Ensure both passwords are identical.");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const user = userCredential.user;

      const profile: UserProfile = {
        uid: user.uid,
        email: form.email,
        university: form.university,
        is_verified: false,
        is_seller: false,
        join_date: new Date().toISOString(),
      };

      await setDoc(doc(firestore, "users", user.uid), profile, { merge: true });

      try {
        const displayName = form.email.split("@")[0] || null;
        await apiFetch("/api/auth/send-verification-email", {
          method: "POST",
          body: JSON.stringify({ display_name: displayName }),
        });
      } catch (emailErr: any) {
        console.error("Custom verification email failed", emailErr);
      }

      showFeedback(
        "success",
        "Account created",
        "A verification email was sent. Check your inbox and verify before you sell."
      );
      navigateToPath("/profile");
    } catch (err: any) {
      let message = err?.message || "We could not create your account.";
      if (err?.code === "auth/email-already-in-use") {
        message = "This email is already registered. Please log in instead.";
      } else if (err?.code === "auth/invalid-email") {
        message = "Please enter a valid email address.";
      } else if (err?.code === "auth/weak-password") {
        message = "Password should be at least 6 characters.";
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
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            className={fieldClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-600 mb-2">Password</label>
          <input
            required
            type="password"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            className={fieldClass}
          />

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
              <span className={strength <= 1 ? "text-red-600" : strength === 2 ? "text-amber-600" : strength === 3 ? "text-blue-600" : "text-emerald-600"}>
                {getPasswordStrengthLabel(strength)}
              </span>
            </div>
            <p className="text-xs text-zinc-500">{getPasswordTip(strength)}</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-600 mb-2">Confirm Password</label>
          <input
            required
            type="password"
            value={form.confirmPassword}
            onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
            className={fieldClass}
          />

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
          onClose={() => setFeedback(null)}
        />
      )}
    </AccountPageShell>
  );
}
