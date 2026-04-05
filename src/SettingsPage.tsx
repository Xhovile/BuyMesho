import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  HelpCircle,
  House,
  Search,
  Settings,
  ShieldCheck,
  User,
  UserCheck,
} from "lucide-react";
import PrivacyPolicyPage from "./components/PrivacyPolicyPage";
import TermsPage from "./components/TermsPage";
import SafetyTipsPage from "./components/SafetyTipsPage";
import ReportProblemPage from "./components/ReportProblemPage";
import FormDropdown from "./components/FormDropdown";
import ConfirmModal from "./components/ConfirmModal";
import FeedbackModal from "./components/FeedbackModal";
import PasswordPromptModal from "./components/PasswordPromptModal";
import {
  ADMIN_REPORTS_PATH,
  ADMIN_SELLER_APPLICATIONS_PATH,
  BECOME_SELLER_PATH,
  EDIT_ACCOUNT_PATH,
  EDIT_PROFILE_PATH,
  EXPLORE_PATH,
  HOME_PATH,
  LOGIN_PATH,
  SETTINGS_PATH,
  CHANGE_PASSWORD_PATH,
  navigateToPath,
} from "./lib/appNavigation";
import { useAccountProfile } from "./hooks/useAccountProfile";
import { useIsAdmin } from "./hooks/useIsAdmin";
import type { VisibilitySetting } from "./types";
import {
  EmailAuthProvider,
  deleteUser,
  reauthenticateWithCredential,
  signOut,
} from "firebase/auth";
import { auth } from "./firebase";
import { apiFetch } from "./lib/api";

type SettingsView = "menu" | "privacy" | "terms" | "safety" | "report";

const SETTINGS_VIEW_QUERY_KEY = "section";

const getSettingsViewFromSearch = (search: string): SettingsView => {
  const section = new URLSearchParams(search).get(SETTINGS_VIEW_QUERY_KEY);
  if (
    section === "privacy" ||
    section === "terms" ||
    section === "safety" ||
    section === "report"
  ) {
    return section;
  }

  return "menu";
};

export default function SettingsPage() {
  const [view, setView] = useState<SettingsView>(() =>
    getSettingsViewFromSearch(window.location.search)
  );
  const { firebaseUser, profile, profileLoading, updateProfile } = useAccountProfile();
  const { isAdmin } = useIsAdmin(firebaseUser);
  const [savingPrivacyField, setSavingPrivacyField] = useState<
    "profile_visibility" | "seller_visibility" | "saved_visibility" | null
  >(null);
  const [passwordPromptOpen, setPasswordPromptOpen] = useState(false);
  const [reauthPassword, setReauthPassword] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    type: "success" | "error" | "info";
    title: string;
    message: string;
  } | null>(null);

  const visibilityLabel: Record<VisibilitySetting, string> = {
    everyone: "Everyone",
    students_only: "Students only",
    only_me: "Only me",
  };
  const visibilityOptions = useMemo(
    () => Object.values(visibilityLabel),
    [visibilityLabel]
  );
  const labelToVisibility = useMemo(
    () =>
      Object.entries(visibilityLabel).reduce<Record<string, VisibilitySetting>>(
        (acc, [key, label]) => {
          acc[label] = key as VisibilitySetting;
          return acc;
        },
        {}
      ),
    [visibilityLabel]
  );

  useEffect(() => {
    const handlePopState = () => {
      setView(getSettingsViewFromSearch(window.location.search));
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const openView = (nextView: SettingsView) => {
    if (nextView === "menu") {
      if (window.history.length > 1) {
        window.history.back();
        return;
      }

      const url = new URL(window.location.href);
      url.pathname = SETTINGS_PATH;
      url.searchParams.delete(SETTINGS_VIEW_QUERY_KEY);

      window.history.pushState({}, "", url.toString());
      window.dispatchEvent(new PopStateEvent("popstate"));
      return;
    }

    const url = new URL(window.location.href);
    url.pathname = SETTINGS_PATH;
    url.searchParams.set(SETTINGS_VIEW_QUERY_KEY, nextView);

    window.history.pushState({}, "", url.toString());
    window.dispatchEvent(new PopStateEvent("popstate"));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const headerSubtitle = useMemo(() => {
    switch (view) {
      case "privacy":
        return "Privacy policy";
      case "terms":
        return "Terms of use";
      case "safety":
        return "Safety tips";
      case "report":
        return "Report a problem";
      default:
        return "Settings";
    }
  }, [view]);

  const updateVisibility = async (
    field: "profile_visibility" | "seller_visibility" | "saved_visibility",
    nextValue: VisibilitySetting
  ) => {
    if (!firebaseUser) return;

    setSavingPrivacyField(field);
    try {
      await updateProfile({ [field]: nextValue });
    } finally {
      setSavingPrivacyField(null);
    }
  };

  const handleLogout = async () => {
    if (!firebaseUser) return;

    try {
      await signOut(auth);
      navigateToPath(LOGIN_PATH);
    } catch (error) {
      console.error("Logout failed:", error);
      setFeedback({
        open: true,
        type: "error",
        title: "Logout failed",
        message: "Please try again.",
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (!firebaseUser) return;
    setDeleteConfirmOpen(false);

    try {
      await apiFetch("/api/profile", { method: "DELETE" });
      await deleteUser(firebaseUser);
      navigateToPath(LOGIN_PATH);
    } catch (error: any) {
      console.error("Delete account failed:", error);
      if (error?.code === "auth/requires-recent-login") {
        setPasswordPromptOpen(true);
        return;
      }
      setFeedback({
        open: true,
        type: "error",
        title: "Delete account failed",
        message: error?.message || "Please try again.",
      });
    }
  };

  const handlePasswordPromptSubmit = async () => {
    if (!firebaseUser?.email) {
      setFeedback({
        open: true,
        type: "error",
        title: "Missing email",
        message: "No email found for this account.",
      });
      return;
    }

    if (!reauthPassword.trim()) {
      setFeedback({
        open: true,
        type: "info",
        title: "Password required",
        message: "Please enter your password to continue.",
      });
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(
        firebaseUser.email,
        reauthPassword
      );

      await reauthenticateWithCredential(firebaseUser, credential);
      setPasswordPromptOpen(false);
      setReauthPassword("");
      await handleDeleteAccount();
    } catch (error: any) {
      setFeedback({
        open: true,
        type: "error",
        title: "Verification failed",
        message: error?.message || "We could not verify your password. Please try again.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigateToPath(HOME_PATH)}
            className="flex items-center gap-2.5 min-w-0"
          >
            <div className="w-10 h-10 bg-red-900 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-red-900/20">
              B
            </div>
            <div className="text-left">
              <p className="text-lg font-extrabold tracking-tight">
                <span className="text-red-900">Buy</span>
                <span className="text-zinc-700">Mesho</span>
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                {headerSubtitle}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigateToPath(HOME_PATH)}
              className="hidden sm:inline-flex px-4 py-2.5 rounded-2xl border border-zinc-200 bg-white text-sm font-bold hover:bg-zinc-50 items-center gap-2"
            >
              <House className="w-4 h-4" />
              Home
            </button>
            <button
              type="button"
              onClick={() => navigateToPath(EXPLORE_PATH)}
              className="px-4 py-2.5 rounded-2xl border border-zinc-200 bg-white text-sm font-bold hover:bg-zinc-50 items-center gap-2 inline-flex"
            >
              <Search className="w-4 h-4" />
              Explore
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">
                Settings
              </p>
              <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-zinc-900">
                Your account control center.
              </h1>
              <p className="mt-3 max-w-2xl text-sm sm:text-base text-zinc-600 leading-relaxed font-medium">
                Manage your account details, security posture, visibility controls,
                and legal/help resources from one page.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-4 min-w-[220px]">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-400">
                Current section
              </p>
              <p className="mt-2 text-2xl font-black tracking-tight text-zinc-900 capitalize">
                {view === "menu" ? "Settings" : view}
              </p>
            </div>
          </div>
        </section>

        {view === "menu" ? (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <User className="w-5 h-5 text-zinc-700" />
                <h2 className="text-xl font-extrabold text-zinc-900">Account</h2>
              </div>

              <div className="space-y-3 text-sm">
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-zinc-400">Email</p>
                  <p className="mt-1 font-semibold text-zinc-900">{profile?.email || firebaseUser?.email || "Not available"}</p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-zinc-400">University</p>
                  <p className="mt-1 font-semibold text-zinc-900">{profile?.university || "Not set"}</p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-zinc-400">Account type</p>
                  <p className="mt-1 font-semibold text-zinc-900">
                    {profileLoading
                      ? "Loading..."
                      : !firebaseUser
                      ? "Login required"
                      : profile
                      ? profile.is_seller
                        ? "Seller"
                        : "General"
                      : "Not available"}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {[
                  { label: "Edit Account", path: EDIT_ACCOUNT_PATH },
                  ...(profile?.is_seller
                    ? [{ label: "Edit Seller Profile", path: EDIT_PROFILE_PATH }]
                    : []),
                  ...(!profile?.is_seller
                    ? [{ label: "Become Seller", path: BECOME_SELLER_PATH }]
                    : []),
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => navigateToPath(item.path)}
                    className="w-full flex items-center justify-between rounded-2xl border border-zinc-200 bg-white hover:bg-zinc-50 px-4 py-3 text-left"
                  >
                    <span className="font-bold text-zinc-900">{item.label}</span>
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </button>
                ))}

                {isAdmin && (
                  <>
                    <button
                      type="button"
                      onClick={() => navigateToPath(ADMIN_REPORTS_PATH)}
                      className="w-full flex items-center justify-between rounded-2xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-4 py-3 text-left"
                    >
                      <span className="font-bold text-indigo-900 inline-flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Admin Reports
                      </span>
                      <ChevronRight className="w-4 h-4 text-indigo-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateToPath(ADMIN_SELLER_APPLICATIONS_PATH)}
                      className="w-full flex items-center justify-between rounded-2xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-4 py-3 text-left"
                    >
                      <span className="font-bold text-indigo-900 inline-flex items-center gap-2">
                        <UserCheck className="w-4 h-4" />
                        Seller Approvals
                      </span>
                      <ChevronRight className="w-4 h-4 text-indigo-400" />
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  disabled={!firebaseUser}
                  className="w-full flex items-center justify-between rounded-2xl border border-zinc-200 bg-white hover:bg-zinc-50 px-4 py-3 text-left disabled:cursor-not-allowed disabled:bg-zinc-100"
                >
                  <span className="font-bold text-zinc-900">Logout</span>
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                </button>

                <button
                  type="button"
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={!firebaseUser}
                  className="w-full flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 hover:bg-red-100 px-4 py-3 text-left disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-100"
                >
                  <span className="font-bold text-red-700">Delete Account</span>
                  <ChevronRight className="w-4 h-4 text-red-300" />
                </button>
              </div>
            </section>

            <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <ShieldCheck className="w-5 h-5 text-zinc-700" />
                <h2 className="text-xl font-extrabold text-zinc-900">Security</h2>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => navigateToPath(CHANGE_PASSWORD_PATH)}
                  className="w-full flex items-center justify-between rounded-2xl border border-zinc-200 bg-white hover:bg-zinc-50 px-4 py-3 text-left"
                >
                  <span className="font-bold text-zinc-900">Change Password</span>
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                </button>

                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-zinc-400">Email verification</p>
                  <p className="mt-1 font-semibold text-zinc-900">
                    {profileLoading
                      ? "Checking..."
                      : !firebaseUser
                        ? "Login required"
                        : firebaseUser.emailVerified
                          ? "Verified"
                          : "Not verified"}
                  </p>
                </div>

                <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                  Later: login controls and authentication settings.
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <UserCheck className="w-5 h-5 text-zinc-700" />
                <h2 className="text-xl font-extrabold text-zinc-900">Privacy</h2>
              </div>

              <div className="space-y-3 text-sm">
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-zinc-400">Profile visibility</p>
                  <div className="mt-2">
                    <FormDropdown
                      label="Profile visibility"
                      value={visibilityLabel[profile?.profile_visibility || "everyone"]}
                      options={visibilityOptions}
                      disabled={!firebaseUser || savingPrivacyField === "profile_visibility"}
                      onChange={(value) =>
                        void updateVisibility(
                          "profile_visibility",
                          labelToVisibility[value] ?? "everyone"
                        )
                      }
                    />
                  </div>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-zinc-400">Seller visibility</p>
                  <div className="mt-2">
                    <FormDropdown
                      label="Seller visibility"
                      value={visibilityLabel[profile?.seller_visibility || "everyone"]}
                      options={visibilityOptions}
                      disabled={!firebaseUser || savingPrivacyField === "seller_visibility" || !profile?.is_seller}
                      onChange={(value) =>
                        void updateVisibility(
                          "seller_visibility",
                          labelToVisibility[value] ?? "everyone"
                        )
                      }
                    />
                  </div>
                  {!firebaseUser
                    ? <p className="mt-2 text-xs text-zinc-500">Sign in to view seller status.</p>
                    : profileLoading
                    ? <p className="mt-2 text-xs text-zinc-500">Loading seller status...</p>
                    : !profile?.is_seller && (
                      <p className="mt-2 text-xs text-zinc-500">Available after becoming a seller.</p>
                    )}
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-zinc-400">Saved items visibility</p>
                  <div className="mt-2">
                    <FormDropdown
                      label="Saved items visibility"
                      value={visibilityLabel[profile?.saved_visibility || "only_me"]}
                      options={visibilityOptions}
                      disabled={!firebaseUser || savingPrivacyField === "saved_visibility"}
                      onChange={(value) =>
                        void updateVisibility(
                          "saved_visibility",
                          labelToVisibility[value] ?? "only_me"
                        )
                      }
                    />
                  </div>
                </div>
                {!firebaseUser && (
                  <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3 text-zinc-600">
                    Sign in to save privacy preferences.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <Settings className="w-5 h-5 text-zinc-700" />
                <h2 className="text-xl font-extrabold text-zinc-900">Help & Legal</h2>
              </div>

              <div className="space-y-3">
                {[
                  { key: "privacy", label: "Privacy Policy", icon: FileText },
                  { key: "terms", label: "Terms of Use", icon: FileText },
                  { key: "safety", label: "Safety Tips", icon: ShieldCheck },
                  { key: "report", label: "Report a Problem", icon: HelpCircle },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => openView(item.key as SettingsView)}
                      className="w-full flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 px-4 py-4 text-left transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-10 h-10 rounded-2xl bg-white border border-zinc-200 flex items-center justify-center">
                          <Icon className="w-4 h-4 text-zinc-700" />
                        </span>
                        <span className="font-bold text-zinc-900">{item.label}</span>
                      </div>
                      <span className="text-sm font-bold text-zinc-400">Open</span>
                    </button>
                  );
                })}
              </div>
            </section>
          </section>
        ) : (
          <section className="rounded-[2rem] border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <div className="p-4 border-b border-zinc-100 bg-zinc-50 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => openView("menu")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-zinc-200 text-sm font-bold hover:bg-zinc-50"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Settings
              </button>
              <div className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-400">
                {headerSubtitle}
              </div>
            </div>

            {view === "privacy" && (
              <PrivacyPolicyPage
                onBack={() => openView("menu")}
                onClose={() => navigateToPath(HOME_PATH)}
                showBackButton={false}
              />
            )}

            {view === "terms" && (
              <TermsPage
                onBack={() => openView("menu")}
                onClose={() => navigateToPath(HOME_PATH)}
                showBackButton={false}
              />
            )}

            {view === "safety" && (
              <SafetyTipsPage
                onBack={() => openView("menu")}
                onClose={() => navigateToPath(HOME_PATH)}
                showBackButton={false}
              />
            )}

            {view === "report" && (
              <ReportProblemPage
                onBack={() => openView("menu")}
                onClose={() => navigateToPath(HOME_PATH)}
                showBackButton={false}
                isLoggedIn={!!firebaseUser}
              />
            )}
          </section>
        )}
      </main>

      <PasswordPromptModal
        open={passwordPromptOpen}
        title="Verify your identity"
        message="For security, please re-enter your password before deleting your account."
        password={reauthPassword}
        onPasswordChange={setReauthPassword}
        onSubmit={() => void handlePasswordPromptSubmit()}
        onCancel={() => {
          setPasswordPromptOpen(false);
          setReauthPassword("");
        }}
      />
      <ConfirmModal
        open={deleteConfirmOpen}
        title="Delete account"
        message="Are you sure you want to delete your account? This action cannot be undone."
        confirmText="Delete"
        danger
        onConfirm={() => void handleDeleteAccount()}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
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
  );
}
