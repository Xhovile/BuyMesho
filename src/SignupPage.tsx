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
  const passwordsMatch = form.password && form.confirmPassword && form.password === form.confirmPassword;

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

      navigateToPath("/profile");
    } catch (err: any) {
      showFeedback("error", "Signup failed", err?.message || "Try again.");
    } finally {
      setLoading(false);
    }
  };

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
            className="w-full bg-transparent px-0 py-3 border-b border-zinc-300 focus:border-zinc-900 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-600 mb-2">Password</label>
          <input
            required
            type="password"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            className="w-full bg-transparent px-0 py-3 border-b border-zinc-300 focus:border-zinc-900 outline-none"
          />

          {/* Strength meter */}
          <div className="mt-2 h-1 bg-zinc-200 rounded">
            <div
              className={`h-1 rounded transition-all ${
                strength <= 1 ? "bg-red-500 w-1/4" :
                strength === 2 ? "bg-yellow-500 w-2/4" :
                strength === 3 ? "bg-blue-500 w-3/4" :
                "bg-green-500 w-full"
              }`}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-600 mb-2">Confirm Password</label>
          <input
            required
            type="password"
            value={form.confirmPassword}
            onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
            className="w-full bg-transparent px-0 py-3 border-b border-zinc-300 focus:border-zinc-900 outline-none"
          />

          {form.confirmPassword && (
            <p className={`text-sm mt-2 ${passwordsMatch ? "text-green-600" : "text-red-600"}`}>
              {passwordsMatch ? "Passwords match" : "Passwords do not match"}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto min-w-[200px] bg-zinc-900 text-white py-3 px-6 rounded-2xl font-bold hover:bg-zinc-800"
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
