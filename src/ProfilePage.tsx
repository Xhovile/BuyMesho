import { useState } from "react";
import {
  AlertTriangle,
  Bookmark,
  Loader2,
  LogOut,
  Package,
  Settings,
  ShieldCheck,
  User,
  Lock,
  Pencil,
  ClipboardList,
  Flag,
} from "lucide-react";
import { signOut, sendEmailVerification } from "firebase/auth";
import FeedbackModal from "./components/FeedbackModal";
import AccountPageShell from "./components/AccountPageShell";
import { auth } from "./firebase";
import {
  ADMIN_REPORTS_PATH,
  ADMIN_SELLER_APPLICATIONS_PATH,
  navigateToPath,
} from "./lib/appNavigation";
import { useAccountProfile } from "./hooks/useAccountProfile";
import { useIsAdmin } from "./hooks/useIsAdmin";

type FeedbackState = {
  open: boolean;
  type: "success" | "error" | "info";
  title: string;
  message: string;
} | null;

export default function ProfilePage() {
  const { firebaseUser, authLoading, profile, profileLoading, emailVerified } =
    useAccountProfile();
  const { isAdmin } = useIsAdmin(firebaseUser);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

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
      backLabel="Back to Explore"
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
        <div className="p-8 space-y-6">
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
                          await sendEmailVerification(firebaseUser);
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

          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-zinc-100 overflow-hidden border border-zinc-200 flex items-center justify-center">
              <User className="w-8 h-8 text-zinc-400" />
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



          {isAdmin && (
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-500">Admin tools</p>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => navigateToPath(ADMIN_REPORTS_PATH)}
                  className="rounded-2xl border border-indigo-200 bg-white px-4 py-3 text-left hover:bg-indigo-100"
                >
                  <div className="flex items-center gap-2">
                    <Flag className="w-5 h-5 text-indigo-700" />
                    <p className="font-bold text-zinc-900">Reports</p>
                  </div>
                  <p className="text-sm text-zinc-500 mt-1">Review and resolve listing/user reports.</p>
                </button>

                <button
                  type="button"
                  onClick={() => navigateToPath(ADMIN_SELLER_APPLICATIONS_PATH)}
                  className="rounded-2xl border border-indigo-200 bg-white px-4 py-3 text-left hover:bg-indigo-100"
                >
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-indigo-700" />
                    <p className="font-bold text-zinc-900">Seller Approvals</p>
                  </div>
                  <p className="text-sm text-zinc-500 mt-1">Approve or reject seller applications.</p>
                </button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs font-bold text-zinc-400 uppercase mb-1">Member Since</p>
              <p className="text-sm font-semibold text-zinc-900">
                {new Date(profile.join_date).toLocaleDateString()}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs font-bold text-zinc-400 uppercase mb-1">Account Type</p>
              <p className="text-sm font-semibold text-zinc-900">
                {profile.is_seller ? "Seller" : "General"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => navigateToPath("/saved")}
              className="rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-left hover:bg-zinc-50"
            >
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-zinc-700" />
                <p className="font-bold text-zinc-900">Saved Items</p>
              </div>
              <p className="text-sm text-zinc-500 mt-1">Open the saved page.</p>
            </button>

            <button
              type="button"
              onClick={() => navigateToPath("/settings")}
              className="rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-left hover:bg-zinc-50"
            >
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-zinc-700" />
                <p className="font-bold text-zinc-900">Settings</p>
              </div>
              <p className="text-sm text-zinc-500 mt-1">Open account settings.</p>
            </button>

            <button
              type="button"
              onClick={() => navigateToPath(profile.is_seller ? "/my-listings" : "/become-seller")}
              className="rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-left hover:bg-zinc-50"
            >
              <div className="flex items-center gap-2">
                {profile.is_seller ? (
                  <Package className="w-5 h-5 text-zinc-700" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-zinc-700" />
                )}
                <p className="font-bold text-zinc-900">
                  {profile.is_seller ? "My Listings" : "Become a Seller"}
                </p>
              </div>
              <p className="text-sm text-zinc-500 mt-1">
                {profile.is_seller ? "Manage what you posted." : "Apply for seller status."}
              </p>
            </button>

            <button
              type="button"
              onClick={() => navigateToPath("/edit-account")}
              className="rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-left hover:bg-zinc-50"
            >
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-zinc-700" />
                <p className="font-bold text-zinc-900">Edit Account</p>
              </div>
              <p className="text-sm text-zinc-500 mt-1">Update your university and account details.</p>
            </button>

            {profile.is_seller && (
              <button
                type="button"
                onClick={() => navigateToPath("/edit-profile")}
                className="rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-left hover:bg-zinc-50"
              >
                <div className="flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-zinc-700" />
                  <p className="font-bold text-zinc-900">Edit Seller Profile</p>
                </div>
                <p className="text-sm text-zinc-500 mt-1">Update your public seller details.</p>
              </button>
            )}

            <button
              type="button"
              onClick={() => navigateToPath("/change-password")}
              className="rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-left hover:bg-zinc-50"
            >
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-zinc-700" />
                <p className="font-bold text-zinc-900">Change Password</p>
              </div>
              <p className="text-sm text-zinc-500 mt-1">Update your account password securely.</p>
            </button>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </button>
          </div>
        </div>
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
