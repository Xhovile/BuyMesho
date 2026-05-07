import { useState, type FormEvent } from "react";
import { Loader2, Mail, Lock } from "lucide-react";
import AccountPageShell from "./components/AccountPageShell";
import FeedbackModal from "./components/FeedbackModal";
import { navigateToPath } from "./lib/appNavigation";
import { useAccountProfile } from "./hooks/useAccountProfile";
import { changeEmailWithVerification } from "./lib/security";

type FeedbackState =
  | {
      open: boolean;
      type: "success" | "error" | "info";
      title: string;
      message: string;
    }
  | null;

export default function ChangeEmailPage() {
  const { firebaseUser, authLoading } = useAccountProfile();

  const [currentPassword, setCurrentPassword] = useState("");
  const [nextEmail, setNextEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const showFeedback = (
    type: "success" | "error" | "info",
    title: string,
    message: string
  ) => {
    setFeedback({ open: true, type, title, message });
  };

  const handleChangeEmail = async (e: FormEvent) => {
    e.preventDefault();

    if (!firebaseUser?.email) {
      showFeedback("error", "No email found", "No email was found for this account.");
      return;
    }

    if (!currentPassword || !nextEmail || !confirmEmail) {
      showFeedback("info", "Missing fields", "Please fill in all email fields.");
      return;
    }

    if (nextEmail.trim() !== confirmEmail.trim()) {
      showFeedback("info", "Emails do not match", "The new email addresses do not match.");
      return;
    }

    if (nextEmail.trim() === firebaseUser.email.trim()) {
      showFeedback("info", "Same email", "The new email must be different from the current one.");
      return;
    }

    setSaving(true);
    try {
      const result = await changeEmailWithVerification(
        currentPassword,
        nextEmail.trim().toLowerCase()
      );

      if (!result.ok) {
        showFeedback("error", "Email change failed", result.message);
        return;
      }

      showFeedback(
        "success",
        "Verification sent",
        result.message ||
          "A verification email has been sent to your new address. Open that email to finish the change."
      );

      setCurrentPassword("");
      setNextEmail("");
      setConfirmEmail("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AccountPageShell
      eyebrow="Security"
      title="Change email"
      description="Update your login email securely by confirming your password first."
      backLabel="Back to Settings"
      onBack={() => navigateToPath("/settings?section=security")}
    >
      {authLoading ? (
        <div className="p-8 text-sm text-zinc-500">Loading account…</div>
      ) : !firebaseUser ? (
        <div className="p-8 text-sm text-zinc-500">Login required.</div>
      ) : (
        <form onSubmit={handleChangeEmail} className="w-full space-y-5 p-6 sm:p-8">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-zinc-400">
              Current email
            </p>
            <p className="mt-1 text-sm font-semibold text-zinc-900">
              {firebaseUser.email}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-zinc-400">
              Current Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 pl-10 pr-4 outline-none"
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-zinc-400">
              New Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="email"
                value={nextEmail}
                onChange={(e) => setNextEmail(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 pl-10 pr-4 outline-none"
                placeholder="Enter new email"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-zinc-400">
              Confirm New Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 pl-10 pr-4 outline-none"
                placeholder="Repeat new email"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-6 py-3 font-bold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? "Sending verification..." : "Send Verification Link"}
            </button>

            <button
              type="button"
              onClick={() => navigateToPath("/settings?section=security")}
              className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-6 py-3 font-bold text-zinc-900 hover:bg-zinc-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

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
