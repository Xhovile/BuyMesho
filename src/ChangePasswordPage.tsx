import { useState, type ChangeEvent, type FormEvent } from "react";
import { Loader2, Lock } from "lucide-react";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import AccountPageShell from "./components/AccountPageShell";
import FeedbackModal from "./components/FeedbackModal";
import { auth } from "./firebase";
import { navigateToPath } from "./lib/appNavigation";
import { useAccountProfile } from "./hooks/useAccountProfile";

type FeedbackState = {
  open: boolean;
  type: "success" | "error" | "info";
  title: string;
  message: string;
} | null;

export default function ChangePasswordPage() {
  const { firebaseUser, authLoading } = useAccountProfile();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const showFeedback = (type: "success" | "error" | "info", title: string, message: string) => {
    setFeedback({ open: true, type, title, message });
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();

    if (!firebaseUser?.email) {
      showFeedback("error", "No email found", "No email was found for this account.");
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      showFeedback("info", "Missing fields", "Please fill in all password fields.");
      return;
    }

    if (newPassword.length < 6) {
      showFeedback("info", "Weak password", "New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      showFeedback("info", "Passwords do not match", "New passwords do not match.");
      return;
    }

    setSaving(true);
    try {
      const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
      await reauthenticateWithCredential(firebaseUser, credential);
      await updatePassword(firebaseUser, newPassword);
      showFeedback("success", "Password changed", "Your password was changed successfully.");
      navigateToPath("/profile");
    } catch (err: any) {
      let message = err?.message || "Failed to change password.";
      if (err?.code === "auth/wrong-password" || err?.code === "auth/invalid-credential") {
        message = "Current password is incorrect.";
      }
      if (err?.code === "auth/weak-password") {
        message = "New password is too weak.";
      }
      showFeedback("error", "Password change failed", message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AccountPageShell
      eyebrow="Security"
      title="Change password"
      description="Update your password securely by confirming your current password first."
      backLabel="Back to Profile"
      onBack={() => navigateToPath("/profile")}
    >
      {authLoading ? (
        <div className="p-8 text-sm text-zinc-500">Loading account…</div>
      ) : !firebaseUser ? (
        <div className="p-8 text-sm text-zinc-500">Login required.</div>
      ) : (
        <form onSubmit={handleChangePassword} className="p-8 space-y-5 w-full">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Current Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none" required />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none" required />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Confirm New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none" required />
            </div>
          </div>
          <button type="submit" disabled={saving} className="bg-zinc-900 text-white py-3 px-6 rounded-xl font-bold hover:bg-zinc-800 inline-flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? "Saving..." : "Save New Password"}
          </button>
        </form>
      )}

      {feedback && <FeedbackModal open={feedback.open} type={feedback.type} title={feedback.title} message={feedback.message} onClose={() => setFeedback(null)} />}
    </AccountPageShell>
  );
}
