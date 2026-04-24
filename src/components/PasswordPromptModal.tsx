import { AnimatePresence, motion } from "motion/react";
import { Lock, X } from "lucide-react";
import React from "react";

type PasswordPromptModalProps = {
  open: boolean;
  title: string;
  message: string;
  password: string;
  busy?: boolean;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

export default function PasswordPromptModal({
  open,
  title,
  message,
  password,
  busy = false,
  onPasswordChange,
  onSubmit,
  onCancel,
}: PasswordPromptModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[97] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 18 }}
            className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-zinc-700" />
                </div>
                <h3 className="text-lg font-extrabold text-zinc-900">{title}</h3>
              </div>

              <button
                type="button"
                onClick={onCancel}
                className="p-2 rounded-full hover:bg-zinc-100 transition-colors"
              >
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-zinc-600 leading-6">{message}</p>

              <input
                type="password"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="Enter your password"
              />
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={busy}
                className="flex-1 py-3 rounded-2xl font-bold bg-zinc-100 hover:bg-zinc-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={onSubmit}
                disabled={busy}
                className="flex-1 py-3 rounded-2xl font-bold text-white bg-zinc-900 hover:bg-zinc-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {busy ? "Verifying..." : "Continue"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
