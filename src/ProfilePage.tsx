import { useState } from "react";
import {
  AlertTriangle,
  ChevronRight,
  Loader2,
  Lock,
  LogOut,
  Settings,
  ShieldCheck,
  User,
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
  const displayName =
    profile?.full_name ||
    [profile?.first_name, profile?.other_names, profile?.surname].filter(Boolean).join(" ") ||
    (profile?.is_seller ? profile.business_name || "Seller Profile" : "My Account");

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
        <div className="p-10 flex items-center justify-center gap-3 text-bm-text-subtle dark:text-bm-text-subtle font-medium">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading your profile...
        </div>
      ) : !firebaseUser ? (
        <div className="p-10 text-center">
          <h2 className="text-2xl font-black tracking-tight text-bm-text dark:text-bm-text">Login required</h2>
          <p className="mt-3 text-sm text-bm-text-subtle dark:text-bm-text-subtle">
            You need to log in before opening your profile page.
          </p>
          <button
            type="button"
            onClick={() => navigateToPath("/login")}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-bm-brand px-5 py-3 text-sm font-extrabold text-bm-on-brand hover:bg-bm-brand-hover"
          >
            Go to Login
          </button>
        </div>
      ) : !profile ? (
        <div className="p-10 text-center">
          <h2 className="text-2xl font-black tracking-tight text-bm-text dark:text-bm-text">Complete profile setup</h2>
          <p className="mt-3 text-sm text-bm-text-subtle dark:text-bm-text-subtle">
            Your account exists but we could not find your profile details. Create your BuyMesho
            profile to continue.
          </p>
          <button
            type="button"
            onClick={() => navigateToPath("/account/setup")}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-bm-brand px-5 py-3 text-sm font-extrabold text-bm-on-brand hover:bg-bm-brand-hover"
          >
            Complete profile
          </button>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-4 bg-bm-surface-muted dark:bg-bm-surface-subtle border-b border-bm-border-subtle dark:border-bm-border-subtle px-6 py-5">
            <div className="w-20 h-20 rounded-full bg-bm-surface overflow-hidden border border-bm-border dark:border-bm-border shadow-sm flex items-center justify-center flex-shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-bm-text-subtle dark:text-bm-text-subtle" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black tracking-tight text-bm-text dark:text-bm-text truncate">
                  {displayName}
                </h2>
                {profile.is_verified && <ShieldCheck className="w-5 h-5 text-bm-success shrink-0" />}
              </div>
              <p className="text-sm text-bm-text-subtle dark:text-bm-text-subtle truncate">{profile.email}</p>
              <p className="text-sm text-bm-text-subtle dark:text-bm-text-subtle">
                {profile.user_type === "student"
                  ? `Student • ${profile.university || "Institution not set"}`
                  : "Public / Non-Student user"}
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {!emailVerified && (
              <div className="rounded-2xl border border-bm-warning/25 bg-bm-warning-bg p-4 text-bm-warning text-sm">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 mt-0.5" />
                  <div>
                    <p className="font-bold">Verify your email to unlock full account access.</p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={async () => {
                          if (!firebaseUser) return;
                          try {
                            await apiFetch("/api/auth/resend-verification-email", {
                              method: "POST",
                              body: JSON.stringify({ display_name: displayName }),
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
                        className="px-4 py-2 rounded-xl bg-bm-surface border border-bm-warning/25 text-sm font-bold hover:bg-bm-warning-bg"
                      >
                        Resend verification email
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!profile.profile_setup_complete && (
              <section className="rounded-3xl border border-bm-border dark:border-bm-border bg-bm-surface shadow-sm p-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-bm-text-subtle dark:text-bm-text-subtle">
                  Profile setup
                </p>
                <h3 className="mt-2 text-lg font-black text-bm-text dark:text-bm-text">
                  Complete your BuyMesho profile
                </h3>
                <p className="mt-1 text-sm text-bm-text-subtle dark:text-bm-text-subtle">
                  Choose Student or Public / Non-Student and add the information you want BuyMesho
                  to use for your marketplace experience.
                </p>
                <button
                  type="button"
                  onClick={() => navigateToPath("/account/setup")}
                  disabled={!emailVerified}
                  className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-bm-brand px-5 py-3 text-sm font-extrabold text-bm-on-brand hover:bg-bm-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Complete profile
                </button>
              </section>
            )}

            <section className="overflow-hidden rounded-3xl border border-bm-border dark:border-bm-border bg-bm-surface shadow-sm">
              <div className="border-b border-bm-border-subtle dark:border-bm-border-subtle px-5 py-3 bg-bm-surface-muted/80 dark:bg-bm-surface-subtle/80">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-bm-text-subtle dark:text-bm-text-subtle">Account</p>
              </div>
              <div className="divide-y divide-bm-border-subtle dark:divide-bm-border-subtle">
                <button
                  type="button"
                  onClick={() => navigateToPath("/account/setup")}
                  disabled={profileActionsDisabled}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted transition-colors disabled:cursor-not-allowed disabled:bg-bm-surface-muted dark:disabled:bg-bm-surface-muted disabled:opacity-50"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-2xl bg-bm-surface-muted dark:bg-bm-surface-muted flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-bm-text-muted dark:text-bm-text-muted" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-bold text-bm-text dark:text-bm-text">Edit Account</span>
                      <span className="hidden md:block text-sm text-bm-text-subtle dark:text-bm-text-subtle">
                        Update identity, user type, student details, and delivery information.
                      </span>
                    </span>
                  </span>
                  <ChevronRight className="w-5 h-5 text-bm-text-subtle dark:text-bm-text-subtle shrink-0" />
                </button>

                {profile.is_seller ? (
                  <button
                    type="button"
                    onClick={() => navigateToPath("/edit-profile")}
                    disabled={profileActionsDisabled}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted transition-colors disabled:cursor-not-allowed disabled:bg-bm-surface-muted dark:disabled:bg-bm-surface-muted disabled:opacity-50"
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <span className="w-10 h-10 rounded-2xl bg-bm-surface-muted dark:bg-bm-surface-muted flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-bm-text-muted dark:text-bm-text-muted" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-bold text-bm-text dark:text-bm-text">Edit Seller Profile</span>
                        <span className="hidden md:block text-sm text-bm-text-subtle dark:text-bm-text-subtle">
                          Update your seller profile.
                        </span>
                      </span>
                    </span>
                    <ChevronRight className="w-5 h-5 text-bm-text-subtle dark:text-bm-text-subtle shrink-0" />
                  </button>
                ) : null}
              </div>
            </section>

            <section className="overflow-hidden rounded-3xl border border-bm-border dark:border-bm-border bg-bm-surface shadow-sm">
              <div className="border-b border-bm-border-subtle dark:border-bm-border-subtle px-5 py-3 bg-bm-surface-muted/80 dark:bg-bm-surface-subtle/80">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-bm-text-subtle dark:text-bm-text-subtle">Set Up</p>
              </div>
              <div className="divide-y divide-bm-border-subtle dark:divide-bm-border-subtle">
                <button
                  type="button"
                  onClick={() => navigateToPath("/settings")}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted transition-colors"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-2xl bg-bm-surface-muted dark:bg-bm-surface-muted flex items-center justify-center shrink-0">
                      <Settings className="w-5 h-5 text-bm-text-muted dark:text-bm-text-muted" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-bold text-bm-text dark:text-bm-text">Settings</span>
                      <span className="hidden md:block text-sm text-bm-text-subtle dark:text-bm-text-subtle">Open account settings.</span>
                    </span>
                  </span>
                  <ChevronRight className="w-5 h-5 text-bm-text-subtle dark:text-bm-text-subtle shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => navigateToPath("/change-password")}
                  disabled={profileActionsDisabled}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted transition-colors disabled:cursor-not-allowed disabled:bg-bm-surface-muted dark:disabled:bg-bm-surface-muted disabled:opacity-50"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-2xl bg-bm-surface-muted dark:bg-bm-surface-muted flex items-center justify-center shrink-0">
                      <Lock className="w-5 h-5 text-bm-text-muted dark:text-bm-text-muted" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-bold text-bm-text dark:text-bm-text">Change Password</span>
                      <span className="hidden md:block text-sm text-bm-text-subtle dark:text-bm-text-subtle">
                        Update your account password securely.
                      </span>
                    </span>
                  </span>
                  <ChevronRight className="w-5 h-5 text-bm-text-subtle dark:text-bm-text-subtle shrink-0" />
                </button>
              </div>
            </section>

            <section className="overflow-hidden rounded-3xl border border-bm-border dark:border-bm-border bg-bm-surface shadow-sm">
              <div className="border-b border-bm-border-subtle dark:border-bm-border-subtle px-5 py-3 bg-bm-surface-muted/80 dark:bg-bm-surface-subtle/80">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-bm-text-subtle dark:text-bm-text-subtle">Security</p>
              </div>
              <div className="divide-y divide-bm-border-subtle dark:divide-bm-border-subtle">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted transition-colors"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-2xl bg-bm-surface-muted dark:bg-bm-surface-muted flex items-center justify-center shrink-0">
                      <LogOut className="w-5 h-5 text-bm-text-muted dark:text-bm-text-muted" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-bold text-bm-text dark:text-bm-text">Log Out</span>
                      <span className="hidden md:block text-sm text-bm-text-subtle dark:text-bm-text-subtle">Sign out of this device.</span>
                    </span>
                  </span>
                  <ChevronRight className="w-5 h-5 text-bm-text-subtle dark:text-bm-text-subtle shrink-0" />
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
