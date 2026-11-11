import React, { useState } from "react";
import { motion } from "motion/react";
import { X, Lock, Loader2 } from "lucide-react";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, User as FirebaseUser } from "firebase/auth";

type Props = {
  user: FirebaseUser;
  onClose: () => void;
};

export default function ChangePasswordModal({ user, onClose }: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user.email) {
      alert("No email found for this account.");
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      alert("Please fill in all password fields.");
      return;
    }

    if (newPassword.length < 6) {
      alert("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("New passwords do not match.");
      return;
    }

    setSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      alert("Password changed successfully.");
      onClose();
    } catch (err: any) {
      let message = err?.message || "Failed to change password.";

      if (err?.code === "auth/wrong-password" || err?.code === "auth/invalid-credential") {
        message = "Current password is incorrect.";
      }

      if (err?.code === "auth/weak-password") {
        message = "New password is too weak.";
      }

      alert(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-bm-overlay backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-bm-surface rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-bm-border-subtle dark:border-bm-border-subtle flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-bm-text dark:text-bm-text">Change Password</h2>
            <p className="text-xs font-bold text-bm-text-subtle dark:text-bm-text-subtle uppercase tracking-widest mt-1">
              Update your account password
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleChangePassword} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-bm-text-subtle dark:text-bm-text-subtle uppercase mb-1">
              Current Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bm-text-subtle dark:text-bm-text-subtle" />
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-bm-surface-muted dark:bg-bm-surface-subtle border border-bm-border dark:border-bm-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-bm-text-subtle dark:text-bm-text-subtle uppercase mb-1">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bm-text-subtle dark:text-bm-text-subtle" />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-bm-surface-muted dark:bg-bm-surface-subtle border border-bm-border dark:border-bm-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-bm-text-subtle dark:text-bm-text-subtle uppercase mb-1">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bm-text-subtle dark:text-bm-text-subtle" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-bm-surface-muted dark:bg-bm-surface-subtle border border-bm-border dark:border-bm-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-bm-brand text-bm-on-brand py-3 rounded-xl font-bold hover:bg-bm-brand-hover transition-colors flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save New Password"}
          </button>
        </form>
      </motion.div>
    </div>
  );
  }
