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

export default function SignupPage() {
  const [form, setForm] = useState({
    university: resolveUniversity(),
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const showFeedback = (
    type: "success" | "error" | "info",
    title: string,
    message: string
  ) => setFeedback({ open: true, type, title, message });

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      showFeedback(
        "error",
        "Passwords do not match",
        "Make sure both password fields are the same before creating the account."
      );
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

        showFeedback(
          "success",
          "Account created",
          "A verification email was sent. Check your inbox and verify before you sell."
        );
      } catch (emailErr: any) {
        console.error("Custom verification email failed", emailErr);
        showFeedback(
          "info",
          "Account created",
          "The account was created, but the verification email could not be sent yet. Open your profile and resend it after SMTP is configured."
        );
      }

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

  return (
    <AccountPageShell
      eyebrow="Account"
      title="Create account"
      description="Join BuyMesho with a university-linked account so you can save items, build your profile, and apply to sell."
      backLabel="Back"
    >
      <form onSubmit={handleSignUp} className="p-8 space-y-5 w-full">
        <FormDropdown
          label="University"
          value={form.university}
          options={UNIVERSITIES}
          onChange={(value) => setForm((prev) => ({ ...prev, university: value as University }))}
        />

        <div>
          <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Email Address</label>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Password</label>
          <input
            required
            type="password"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Confirm Password</label>
          <input
            required
            type="password"
            value={form.confirmPassword}
            onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
            className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-4 text-sm font-bold">
          <button type="button" onClick={() => navigateToPath("/login")} className="text-primary hover:underline">
            Already have an account?
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto min-w-[200px] bg-zinc-900 text-white py-3 px-6 rounded-xl font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
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
