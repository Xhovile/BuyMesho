import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  HelpCircle,
  House,
  Settings,
  ShieldCheck,
  ShoppingBag,
  User,
  UserCheck,
  Mail,
  Lock,
  LogOut,
  KeyRound,
  ShieldAlert,
  ShieldEllipsis,
  Loader2,
} from "lucide-react";
import BrandMark from "./components/BrandMark";
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
  PRIVACY_PATH,
  REPORT_PATH,
  SAFETY_PATH,
  SETTINGS_PATH,
  TERMS_PATH,
  CHANGE_PASSWORD_PATH,
  navigateToPath,
} from "./lib/appNavigation";
import { useAccountProfile } from "./hooks/useAccountProfile";
import { useIsAdmin } from "./hooks/useIsAdmin";
import type { VisibilitySetting } from "./types";
import {
  deleteCurrentAccount,
  logoutOtherSessions,
  reauthenticateWithPassword,
  refreshEmailVerificationState,
  resendVerificationEmail,
} from "./lib/security";
import { auth } from "./firebase";
import { signOut } from "firebase/auth";

type SettingsView = "menu" | "privacy" | "terms" | "safety" | "report";

const SETTINGS_VIEW_QUERY_KEY = "section";
const VISIBILITY_LABEL: Record<VisibilitySetting, string> = {
  everyone: "Everyone",
  students_only: "Students only",
  only_me: "Only me",
};
const VISIBILITY_OPTIONS = Object.values(VISIBILITY_LABEL);
const LABEL_TO_VISIBILITY = Object.entries(VISIBILITY_LABEL).reduce<
  Record<string, VisibilitySetting>
>((acc, [key, label]) => {
  acc[label] = key as VisibilitySetting;
  return acc;
}, {});

const ACCORDION_STORAGE_KEY = "settings-accordion-state";
const defaultExpandedSections = {
  account: true,
  security: true,
  privacy: false,
  helpLegal: false,
};

const getSettingsViewFromLocation = (
  location: Pick<Location, "pathname" | "search">
): SettingsView => {
  if (location.pathname === PRIVACY_PATH) return "privacy";
  if (location.pathname === TERMS_PATH) return "terms";
  if (location.pathname === SAFETY_PATH) return "safety";
  if (location.pathname === REPORT_PATH) return "report";

  const section = new URLSearchParams(location.search).get(SETTINGS_VIEW_QUERY_KEY);
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
    getSettingsViewFromLocation(window.location)
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
  const [expandedSections, setExpandedSections] = useState(() => {
    try {
      const saved = localStorage.getItem(ACCORDION_STORAGE_KEY);
      if (saved) return JSON.parse(saved) as typeof defaultExpandedSections;
    } catch {
      // ignore parse errors
    }
    return defaultExpandedSections;
  });
  const [securityActionBusy, setSecurityActionBusy] = useState<
    "resend" | "logoutAll" | null
  >(null);

  useEffect(() => {
    const handlePopState = () => {
      setView(getSettingsViewFromLocation(window.location));
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(ACCORDION_STORAGE_KEY, JSON.stringify(expandedSections));
    } catch {
      // ignore storage errors
    }
  }, [expandedSections]);

  const openView = (nextView: SettingsView) => {
    if (nextView === "menu") {
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

  const showFeedback = (
    type: "success" | "error" | "info",
    title: string,
    message: string
  ) => {
    setFeedback({ open: true, type, title, message });
  };

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
    try {
      await signOut(auth);
    } finally {
      navigateToPath(LOGIN_PATH);
    }
  };

  const handleDeleteAccount = async () => {
    if (!firebaseUser) return;
    setDeleteConfirmOpen(false);

    const result = await deleteCurrentAccount();
    if (!result.ok) {
      if (result.code === "auth/requires-recent-login") {
        setPasswordPromptOpen(true);
        return;
      }
      showFeedback("error", "Delete account failed", result.message);
      return;
    }

    navigateToPath(LOGIN_PATH);
  };

  const handlePasswordPromptSubmit = async () => {
    if (!firebaseUser?.email) {
      showFeedback("error", "Missing email", "No email found for this account.");
      return;
    }

    if (!reauthPassword.trim()) {
      showFeedback("info", "Password required", "Please enter your password to continue.");
      return;
    }

    const result = await reauthenticateWithPassword({
      email: firebaseUser.email,
      password: reauthPassword,
    });

    if (!result.ok) {
      showFeedback("error", "Verification failed", result.message);
      return;
    }

    setPasswordPromptOpen(false);
    setReauthPassword("");
    await handleDeleteAccount();
  };

  const handleResendVerification = async () => {
    if (!firebaseUser) return;

    setSecurityActionBusy("resend");
    try {
      const result = await resendVerificationEmail();
      if (result.ok) {
        showFeedback("success", "Verification sent", result.message || "Verification email sent.");
      } else {
        showFeedback("error", "Resend failed", result.message);
      }
    } finally {
      setSecurityActionBusy(null);
    }
  };

  const handleRefreshVerification = async () => {
    if (!firebaseUser) return;
    const verified = await refreshEmailVerificationState();

    if (verified) {
      showFeedback("success", "Email verified", "Your email address is now verified.");
      return;
    }

    showFeedback(
      "info",
      "Still not verified",
      "Email verification has not been completed yet. Check your inbox and spam folder."
    );
  };

  const handleLogoutAllSessions = async () => {
    if (!firebaseUser) return;

    setSecurityActionBusy("logoutAll");
    try {
      const result = await logoutOtherSessions();
      if (!result.ok) {
        showFeedback("error", "Logout failed", result.message);
        return;
      }

      showFeedback("success", "Signed out", result.message || "All sessions have been signed out.");
      navigateToPath(LOGIN_PATH);
    } finally {
      setSecurityActionBusy(null);
    }
  };

  const handle2FAEntry = () => {
    showFeedback(
      "info",
      "2FA setup",
      "Two-factor authentication needs backend support first. Add it only after SMS or Google provider flow is wired on the auth side."
    );
  };

  const handleVerifyIdentity = () => {
    if (!firebaseUser) return;
    setPasswordPromptOpen(true);
  };

  const toggleSection = (
    section: "account" | "security" | "privacy" | "helpLegal"
  ) => {
    setExpandedSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  };

  if (view === "privacy") {
    return <PrivacyPolicyPage onBack={() => openView("menu")} />;
  }
  if (view === "terms") {
    return <TermsPage onBack={() => openView("menu")} />;
  }
  if (view === "safety") {
    return <SafetyTipsPage onBack={() => openView("menu")} />;
  }
  if (view === "report") {
    return <ReportProblemPage onBack={() => openView("menu")} isLoggedIn={!!firebaseUser} />;
  }

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <BrandMark />

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
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
            >
              <ShoppingBag className="w-4 h-4" />
              Market
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

        <section className="space-y-4">
          <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => toggleSection("account")}
              className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-zinc-50 transition-colors"
              aria-expanded={expandedSections.account}
            >
              <span className="inline-flex items-center gap-3 min-w-0">
                <span className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-zinc-700" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-extrabold uppercase tracking-[0.14em] text-zinc-400">
                    Account
                  </span>
                </span>
              </span>

              <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-zinc-500">
                {expandedSections.account ? "Hide" : "Show"}
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${expandedSections.account ? "rotate-180" : ""}`}
                />
              </span>
            </button>

            {expandedSections.account ? (
              <div className="divide-y divide-zinc-100">
                <div className="px-5 py-4 bg-zinc-50/60">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-zinc-400">
                        Email
                      </p>
                      <p className="mt-1 text-sm font-semibold text-zinc-900">
                        {profile?.email || firebaseUser?.email || "Not available"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-zinc-400">
                        University
                      </p>
                      <p className="mt-1 text-sm font-semibold text-zinc-900">
                        {profile?.university || "Not set"}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigateToPath(EDIT_ACCOUNT_PATH)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-50 transition-colors"
                >
                  <span className="font-bold text-zinc-900">Edit Account</span>
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                </button>

                {profile?.is_seller ? (
                  <button
                    type="button"
                    onClick={() => navigateToPath(EDIT_PROFILE_PATH)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-50 transition-colors"
                  >
                    <span className="font-bold text-zinc-900">Edit Seller Profile</span>
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigateToPath(BECOME_SELLER_PATH)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-50 transition-colors"
                  >
                    <span className="font-bold text-zinc-900">Become Seller</span>
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </button>
                )}

                {isAdmin ? (
                  <>
                    <button
                      type="button"
                      onClick={() => navigateToPath(ADMIN_REPORTS_PATH)}
                      className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-50 transition-colors"
                    >
                      <span className="font-bold text-indigo-900 inline-flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Admin Reports
                      </span>
                      <ChevronRight className="w-4 h-4 text-zinc-400" />
                    </button>

                    <button
                      type="button"
                      onClick={() => navigateToPath(ADMIN_SELLER_APPLICATIONS_PATH)}
                      className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-50 transition-colors"
                    >
                      <span className="font-bold text-indigo-900 inline-flex items-center gap-2">
                        <UserCheck className="w-4 h-4" />
                        Seller Approvals
                      </span>
                      <ChevronRight className="w-4 h-4 text-zinc-400" />
                    </button>
                  </>
                ) : null}

                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  disabled={!firebaseUser}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-50 transition-colors disabled:cursor-not-allowed disabled:bg-zinc-100"
                >
                  <span className="font-bold text-zinc-900 inline-flex items-center gap-2">
                    <LogOut className="w-4 h-4" />
                    Logout
                  </span>
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                </button>

                <button
                  type="button"
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={!firebaseUser}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-red-50 transition-colors disabled:cursor-not-allowed disabled:bg-zinc-100"
                >
                  <span className="font-bold text-red-700 inline-flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" />
                    Delete Account
                  </span>
                  <ChevronRight className="w-4 h-4 text-red-300" />
                </button>
              </div>
            ) : null}
          </section>

          <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => toggleSection("security")}
              className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-zinc-50 transition-colors"
              aria-expanded={expandedSections.security}
            >
              <span className="inline-flex items-center gap-3 min-w-0">
                <span className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-zinc-700" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-extrabold uppercase tracking-[0.14em] text-zinc-400">
                    Security
                  </span>
                </span>
              </span>

              <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-zinc-500">
                {expandedSections.security ? "Hide" : "Show"}
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${expandedSections.security ? "rotate-180" : ""}`}
                />
              </span>
            </button>

            {expandedSections.security ? (
              <div className="divide-y divide-zinc-100">
                <button
                  type="button"
                  onClick={() => navigateToPath(CHANGE_PASSWORD_PATH)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-50 transition-colors"
                >
                  <span className="font-bold text-zinc-900 inline-flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Change Password
                  </span>
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                </button>

                <button
                  type="button"
                  onClick={() => navigateToPath(CHANGE_EMAIL_PATH)
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-50 transition-colors"
                >
                  <span className="font-bold text-zinc-900 inline-flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Change Email
                  </span>
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                </button>
                
                <button
                  type="button"
                  onClick={handle2FAEntry}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-50 transition-colors"
                >
                  <span className="font-bold text-zinc-900 inline-flex items-center gap-2">
                    <ShieldEllipsis className="w-4 h-4" />
                    2Factor Auth
                  </span>
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                </button>

                <div className="px-5 py-4 bg-zinc-50/60">
                  <div className="flex flex-col gap-3">
                    <div>
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-zinc-400">
                        Email verification
                      </p>
                      <p className="mt-1 text-sm font-semibold text-zinc-900">
                        {profileLoading
                          ? "Checking..."
                          : !firebaseUser
                          ? "Login required"
                          : firebaseUser.emailVerified
                          ? "Verified"
                          : "Not verified"}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        type="button"
                        onClick={handleRefreshVerification}
                        disabled={!firebaseUser}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-900 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Refresh status
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleResendVerification()}
                        disabled={!firebaseUser || securityActionBusy === "resend" || !!firebaseUser?.emailVerified}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {securityActionBusy === "resend" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Mail className="h-4 w-4" />
                        )}
                        Resend verification
                      </button>
                    </div>

                    <p className="text-xs text-zinc-500">
                      Verification must be completed before higher-trust actions should be allowed.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void handleLogoutAllSessions()}
                  disabled={!firebaseUser || securityActionBusy === "logoutAll"}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-50 transition-colors disabled:cursor-not-allowed disabled:bg-zinc-100"
                >
                  <span className="font-bold text-zinc-900 inline-flex items-center gap-2">
                    <LogOut className="w-4 h-4" />
                    Logout all sessions
                  </span>
                  {securityActionBusy === "logoutAll" ? (
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleVerifyIdentity}
                  disabled={!firebaseUser}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-50 transition-colors disabled:cursor-not-allowed disabled:bg-zinc-100"
                >
                  <span className="font-bold text-zinc-900 inline-flex items-center gap-2">
                    <KeyRound className="w-4 h-4" />
                    Verify identity
                  </span>
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                </button>
              </div>
            ) : null}
          </section>

          <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => toggleSection("privacy")}
              className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-zinc-50 transition-colors"
              aria-expanded={expandedSections.privacy}
            >
              <span className="inline-flex items-center gap-3 min-w-0">
                <span className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5 text-zinc-700" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-extrabold uppercase tracking-[0.14em] text-zinc-400">
                    Privacy
                  </span>
                </span>
              </span>

              <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-zinc-500">
                {expandedSections.privacy ? "Hide" : "Show"}
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${expandedSections.privacy ? "rotate-180" : ""}`}
                />
              </span>
            </button>

            {expandedSections.privacy ? (
              <div className="divide-y divide-zinc-100">
                <div className="px-5 py-4 bg-zinc-50/60">
                  <FormDropdown
                    label="Profile visibility"
                    value={VISIBILITY_LABEL[profile?.profile_visibility || "everyone"]}
                    options={VISIBILITY_OPTIONS}
                    disabled={!firebaseUser || savingPrivacyField === "profile_visibility"}
                    onChange={(value) =>
                      void updateVisibility(
                        "profile_visibility",
                        LABEL_TO_VISIBILITY[value] ?? "everyone"
                      )
                    }
                  />
                </div>

                <div className="px-5 py-4 bg-white">
                  <FormDropdown
                    label="Seller visibility"
                    value={VISIBILITY_LABEL[profile?.seller_visibility || "everyone"]}
                    options={VISIBILITY_OPTIONS}
                    disabled={!firebaseUser || savingPrivacyField === "seller_visibility" || !profile?.is_seller}
                    onChange={(value) =>
                      void updateVisibility(
                        "seller_visibility",
                        LABEL_TO_VISIBILITY[value] ?? "everyone"
                      )
                    }
                  />
                  {!firebaseUser ? (
                    <p className="mt-2 text-xs text-zinc-500">Sign in to view seller status.</p>
                  ) : profileLoading ? (
                    <p className="mt-2 text-xs text-zinc-500">Loading seller status...</p>
                  ) : !profile?.is_seller ? (
                    <p className="mt-2 text-xs text-zinc-500">Available after becoming a seller.</p>
                  ) : null}
                </div>

                <div className="px-5 py-4 bg-zinc-50/60">
                  <FormDropdown
                    label="Saved items visibility"
                    value={VISIBILITY_LABEL[profile?.saved_visibility || "only_me"]}
                    options={VISIBILITY_OPTIONS}
                    disabled={!firebaseUser || savingPrivacyField === "saved_visibility"}
                    onChange={(value) =>
                      void updateVisibility(
                        "saved_visibility",
                        LABEL_TO_VISIBILITY[value] ?? "only_me"
                      )
                    }
                  />
                </div>

                {!firebaseUser ? (
                  <div className="px-5 py-4 text-sm text-zinc-600 bg-white">
                    Sign in to save privacy preferences.
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => toggleSection("helpLegal")}
              className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-zinc-50 transition-colors"
              aria-expanded={expandedSections.helpLegal}
            >
              <span className="inline-flex items-center gap-3 min-w-0">
                <span className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center shrink-0">
                  <Settings className="w-5 h-5 text-zinc-700" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-extrabold uppercase tracking-[0.14em] text-zinc-400">
                    Help & Legal
                  </span>
                </span>
              </span>

              <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-zinc-500">
                {expandedSections.helpLegal ? "Hide" : "Show"}
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${expandedSections.helpLegal ? "rotate-180" : ""}`}
                />
              </span>
            </button>

            {expandedSections.helpLegal ? (
              <div className="divide-y divide-zinc-100">
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
                      className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-50 transition-colors"
                    >
                      <span className="inline-flex items-center gap-3 min-w-0">
                        <span className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-zinc-700" />
                        </span>
                        <span className="font-bold text-zinc-900">{item.label}</span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-zinc-400" />
                    </button>
                  );
                })}
              </div>
            ) : null}
          </section>
        </section>
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
