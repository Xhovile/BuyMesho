import { useState, type ChangeEvent, type FormEvent } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import FeedbackModal from "./components/FeedbackModal";
import AccountPageShell from "./components/AccountPageShell";
import { auth } from "./firebase";
import { navigateToPath } from "./lib/appNavigation";

type FeedbackState = {
  open: boolean;
  type: "success" | "error" | "info";
  title: string;
  message: string;
} | null;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const showFeedback = (
    type: "success" | "error" | "info",
    title: string,
    message: string
  ) => setFeedback({ open: true, type, title, message });

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      showFeedback("info", "Email required", "Please enter your email address first.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      showFeedback(
        "success",
        "Reset email sent",
        "Check your email inbox for the password reset link."
      );
    } catch (err: any) {
      showFeedback(
        "error",
        "Reset failed",
        err?.message || "We could not send the reset email."
      );
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
      <form onSubmit={handleReset} className="p-8 space-y-5 max-w-xl">
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
          className="w-full sm:w-auto min-w-[200px] bg-zinc-900 text-white py-3 px-6 rounded-xl font-bold hover:bg-zinc-800 transition-colors"
        >
          Send Reset Link
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
