import { useState } from "react";
import {
  AlertTriangle,
  Loader2,
  LogOut,
  Settings,
  ShieldCheck,
  User,
  Lock,
  ChevronRight,
} from "lucide-react";
import { signOut } from "firebase/auth";
import FeedbackModal from "./components/FeedbackModal";
import AccountPageShell from "./components/AccountPageShell";
import { auth } from "./firebase";
import { apiFetch } from "./lib/api";
import { navigateToPath } from "./lib/appNavigation";
import { getAvatarUrl } from "./lib/avatar";
import { useAccountProfile } from "./hooks/useAccountProfile";

type FeedbackState = {
  open: boolean;
  type: "success" | "error" | "info";
  title: string;
  message: string;
} | null;

export default function ProfilePage() {
  const { firebaseUser, authLoading, profile, profileLoading, emailVerified } =
    useAccountProfile();
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const avatarUrl = getAvatarUrl(profile, firebaseUser);
  const profileActionsDisabled = !emailVerified;

  const showFeedback = (
    type: "success" | "error" | "info",
    title: string,
    message: string
  ) => setFeedback({ open: true, type, title, message });

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigateToPath("/login");
    } catch (err: any) {
      showFeedback("error", "Logout failed", err?.message || "We could not log you out.");
    }
  };

  return (
    <AccountPageShell
      eyebrow="Account"
      title="My profile"
      description="Manage your account, see your current status, and move into the rest of the BuyMesho account tools."
      backLabel="Back to Market"
    >
      {authLoading || profileLoading ? (
        <div className="p-10 flex items-center justify-center gap-3 text-zinc-500 font-medium">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading your profile...
        </div>
      ) : !firebaseUser ? (
        <div className="p-10 text-center">
          <h2 className="text-2xl font-black tracking-tight text-zinc-900">Login required</h2>
          <p className="mt-3 text-sm text-zinc-500">
            You need to log in before opening your profile page.
          </p>
          <button
            type="button"
            onClick={() => navigateToPath("/login")}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"
          >
            Go to Login
          </button>
        </div>
      ) : !profile ? (
        <div className="p-10 text-center">
          <h2 className="text-2xl font-black tracking-tight text-zinc-900">Complete profile setup</h2>
          <p className="mt-3 text-sm text-zinc-500">
            Your account exists but we could not find your profile details. Create your account details to continue.
          </p>
          <button
            type="button"
            onClick={() => navigateToPath("/edit-account")}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"
          >
            Create account details
          </button>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-4 bg-zinc-50 border-b border-zinc-100 px-6 py-5">
            <div className="w-20 h-20 rounded-full bg-white overflow-hidden border border-zinc-200 shadow-sm flex items-center justify-center flex-shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-8 h-8 text-zinc-400" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black tracking-tight text-zinc-900">
                  {profile.is_seller ? profile.business_name || "Seller Profile" : "My Account"}
                </h2>
                {profile.is_verified && <ShieldCheck className="w-5 h-5 text-blue-500" />}
              </div>
              <p className="text-sm text-zinc-500">{profile.email}</p>
              <p className="text-sm text-zinc-500">{profile.university || "University not set"}</p>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {!emailVerified && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 mt-0.5" />
                  <div>
                    <p className="font-bold">Verify your email to unlock full selling access.</p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={async () => {
                          if (!firebaseUser) return;
                          try {
                            await apiFetch("/api/auth/resend-verification-email", {
                              method: "POST",
                              body: JSON.stringify({
                                display_name:
                                  profile?.business_name || firebaseUser.email?.split("@")[0] || null,
                              }),
                            });
                            showFeedback(
                              "success",
                              "Verification email resent",
                              "Check your inbox for the new verification email."
                            );
                          } catch (err: any) {
                            showFeedback(
                              "error",
                              "Resend failed",
                              err?.message || "We could not resend the verification email."
                            );
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-white border border-amber-200 text-sm font-bold hover:bg-amber-100"
                      >
                        Resend verification email
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-100 px-5 py-3 bg-zinc-50/80">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
                  Account
                </p>
              </div>

              <div className="divide-y divide-zinc-100">
                <button
                  type="button"
                  onClick={() => navigateToPath("/settings")}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-zinc-50 transition-colors"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center shrink-0">
                      <Settings className="w-5 h-5 text-zinc-700" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-bold text-zinc-900">Settings</span>
                      <span className="hidden md:block text-sm text-zinc-500">Open account settings.</span>
                    </span>
                  </span>
                  <ChevronRight className="w-5 h-5 text-zinc-400 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => navigateToPath("/change-password")}
                  disabled={profileActionsDisabled}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-zinc-50 transition-colors disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:opacity-50"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center shrink-0">
                      <Lock className="w-5 h-5 text-zinc-700" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-bold text-zinc-900">Change Password</span>
                      <span className="hidden md:block text-sm text-zinc-500">
                        Update your account password securely.
                      </span>
                    </span>
                  </span>
                  <ChevronRight className="w-5 h-5 text-zinc-400 shrink-0" />
                </button>
              </div>
            </section>

            <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-100 px-5 py-3 bg-zinc-50/80">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
                  Selling
                </p>
              </div>

              <div className="divide-y divide-zinc-100">
                <button
                  type="button"
                  onClick={() => navigateToPath(profile.is_seller ? "/edit-profile" : "/edit-account")}
                  disabled={profileActionsDisabled}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-zinc-50 transition-colors disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:opacity-50"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-zinc-700" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-bold text-zinc-900">
                        {profile.is_seller ? "Edit Profile" : "Edit Account"}
                      </span>
                      <span className="hidden md:block text-sm text-zinc-500">
                        {profile.is_seller
                          ? "Update your seller profile."
                          : "Update your account details."}
                      </span>
                    </span>
                  </span>
                  <ChevronRight className="w-5 h-5 text-zinc-400 shrink-0" />
                </button>
              </div>
            </section>

            <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-100 px-5 py-3 bg-zinc-50/80">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
                  Security
                </p>
              </div>

              <div className="divide-y divide-zinc-100">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-zinc-50 transition-colors"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center shrink-0">
                      <LogOut className="w-5 h-5 text-zinc-700" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-bold text-zinc-900">Log Out</span>
                      <span className="hidden md:block text-sm text-zinc-500">
                        Sign out of this device.
                      </span>
                    </span>
                  </span>
                  <ChevronRight className="w-5 h-5 text-zinc-400 shrink-0" />
                </button>
              </div>
            </section>
          </div>

          {feedback && (
            <FeedbackModal
              open={feedback.open}
              type={feedback.type}
              title={feedback.title}
              message={feedback.message}
              onClose={() => setFeedback(null)}
            />
          )}
        </div>
      )}
    </AccountPageShell>
  );
}
