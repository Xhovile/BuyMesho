import { useState, type ChangeEvent, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";
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

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const showFeedback = (
    type: "success" | "error" | "info",
    title: string,
    message: string
  ) => setFeedback({ open: true, type, title, message });

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, form.email, form.password);
      navigateToPath("/profile");
    } catch (err: any) {
      let message = "Invalid email or password. Please try again.";
      if (err?.code === "auth/user-not-found") {
        message = "No account found with this email. Please sign up first.";
      } else if (err?.code === "auth/wrong-password") {
        message = "Incorrect password. Please try again.";
      } else if (err?.code === "auth/too-many-requests") {
        message = "Too many failed attempts. Please try again later.";
      }
      showFeedback("error", "Login failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AccountPageShell
      eyebrow="Account"
      title="Log in"
      description="Access your BuyMesho account, manage your profile, and continue buying or selling."
      backLabel="Back to Explore"
    >
      <form onSubmit={handleLogin} className="p-8 space-y-5 w-full">
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

        <div className="flex flex-wrap gap-4 text-sm font-bold">
          <button type="button" onClick={() => navigateToPath("/forgot-password")} className="text-primary hover:underline">
            Forgot Password?
          </button>
          <button type="button" onClick={() => navigateToPath("/signup")} className="text-zinc-500 hover:text-zinc-900 hover:underline">
            Create account
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto min-w-[180px] bg-zinc-900 text-white py-3 px-6 rounded-xl font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Log In"}
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
