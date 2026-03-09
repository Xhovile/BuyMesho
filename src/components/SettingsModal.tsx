import React from "react";
import { motion } from "motion/react";
import {
  X,
  User,
  ChevronRight,
  Package,
  ShieldCheck,
  FileText,
  HelpCircle,
} from "lucide-react";
import { userProfile, University } from "../types";

type SettingsView = "menu" | "privacy" | "terms" | "safety" | "report";

type Props = {
  userProfile: userProfile;
  firebaseUser: any;
  isSellerAccount: boolean;
  onClose: () => void;
  onOpenEditProfile: () => void;
  onOpenChangePassword: () => void;
  onDeleteAccount: () => void;
  onRefreshVerification: () => void;
  onOpenView: (view: SettingsView) => void;
};
export default function SettingsModal({
  userProfile,
  firebaseUser,
  isSellerAccount,
  onClose,
  onOpenEditProfile,
  onOpenChangePassword,
  onDeleteAccount,
  onRefreshVerification,
  onOpenView,
}: Props) {
  return (
    <div className="fixed inset-0 z-[76] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-2xl font-extrabold text-zinc-900">Settings</h2>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">
              Manage your account and store
            </p>
          </div>

          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-8">

          {isSellerAccount && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-zinc-500" />
              <h3 className="text-lg font-bold text-zinc-900">Account</h3>
            </div>

            <div className="bg-zinc-50 rounded-2xl border border-zinc-100 overflow-hidden">
              {isSellerAccount && (
              <button
                 onClick={onOpenEditProfile}
                 className="w-full flex items-center justify-between px-4 py-4 hover:bg-white transition-colors text-left"
              >
                 <span className="font-medium text-zinc-900">Edit Profile</span>
                 <ChevronRight className="w-4 h-4 text-zinc-400" />
              </button>
            )}

              <button
                onClick={onOpenChangePassword}
                className="w-full flex items-center justify-between px-4 py-4 border-t border-zinc-100 hover:bg-white transition-colors text-left"
              >
                <span className="font-medium text-zinc-900">Change Password</span>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </button>

              <div className="w-full flex items-center justify-between px-4 py-4 border-t border-zinc-100">
                <div>
                  <p className="font-medium text-zinc-900">Email Verification Status</p>
                  <p className="text-sm text-zinc-500">
                    {firebaseUser?.emailVerified ? "Verified" : "Not verified"}
                  </p>
                </div>

                {!firebaseUser?.emailVerified && (
                  <button
                    onClick={onRefreshVerification}
                    className="text-sm font-bold text-primary hover:underline"
                  >
                    Refresh
                  </button>
                )}
              </div>

              <button
                onClick={onDeleteAccount}
                className="w-full flex items-center justify-between px-4 py-4 border-t border-zinc-100 hover:bg-red-50 transition-colors text-left"
              >
                <span className="font-medium text-red-600">Delete Account</span>
                <ChevronRight className="w-4 h-4 text-red-400" />
              </button>
            </div>
          </section>
         )} 

          <section>
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-4 h-4 text-zinc-500" />
              <h3 className="text-lg font-bold text-zinc-900">Store</h3>
            </div>

            <div className="bg-zinc-50 rounded-2xl border border-zinc-100 overflow-hidden">
              <button
                onClick={onOpenEditProfile}
                className="w-full flex items-center justify-between px-4 py-4 hover:bg-white transition-colors text-left"
              >
                <div>
                  <p className="font-medium text-zinc-900">Default WhatsApp Number</p>
                  <p className="text-sm text-zinc-500">
                    {userSeller.whatsapp_number || "Not added"}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </button>

              <button
                onClick={onOpenEditProfile}
                className="w-full flex items-center justify-between px-4 py-4 border-t border-zinc-100 hover:bg-white transition-colors text-left"
              >
                <div>
                  <p className="font-medium text-zinc-900">Default Campus</p>
                  <p className="text-sm text-zinc-500">
                    {userSeller.university || "Not set"}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </button>

              <div className="w-full flex items-center justify-between px-4 py-4 border-t border-zinc-100">
                <div>
                  <p className="font-medium text-zinc-900">Verification Status</p>
                  <p className="text-sm text-zinc-500">
                    {userSeller.is_verified ? "Verified" : "Not verified"}
                  </p>
                </div>
                {userSeller.is_verified ? (
                  <ShieldCheck className="w-5 h-5 text-blue-500" />
                ) : null}
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-zinc-500" />
              <h3 className="text-lg font-bold text-zinc-900">Legal & Safety</h3>
            </div>

            <div className="bg-zinc-50 rounded-2xl border border-zinc-100 overflow-hidden">
              <button
                onClick={() => onOpenView("privacy")}
                className="w-full flex items-center justify-between px-4 py-4 hover:bg-white transition-colors text-left"
              >
                <span className="font-medium text-zinc-900">Privacy Policy</span>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </button>

              <button
                onClick={() => onOpenView("terms")}
                className="w-full flex items-center justify-between px-4 py-4 border-t border-zinc-100 hover:bg-white transition-colors text-left"
              >
                <span className="font-medium text-zinc-900">Terms of Use</span>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </button>

              <button
                onClick={() => onOpenView("safety")}
                className="w-full flex items-center justify-between px-4 py-4 border-t border-zinc-100 hover:bg-white transition-colors text-left"
              >
                <span className="font-medium text-zinc-900">Safety Tips</span>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </button>

              <button
                onClick={() => onOpenView("report")}
                className="w-full flex items-center justify-between px-4 py-4 border-t border-zinc-100 hover:bg-white transition-colors text-left"
              >
                <span className="font-medium text-zinc-900">Report a Problem</span>
                <HelpCircle className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
          </section>
        </div>
      </motion.div>
    </div>
  );
}
