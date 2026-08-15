import { useEffect, useMemo, useState } from "react";
import { House, ShoppingBag } from "lucide-react";
import BrandMark from "./components/BrandMark";
import PrivacyPolicyPage from "./components/PrivacyPolicyPage";
import TermsPage from "./components/TermsPage";
import SafetyTipsPage from "./components/SafetyTipsPage";
import ReportProblemPage from "./components/ReportProblemPage";
import ConfirmModal from "./components/ConfirmModal";
import FeedbackModal from "./components/FeedbackModal";
import PasswordPromptModal from "./components/PasswordPromptModal";
import TotpSetupModal from "./components/TotpSetupModal";
import SettingsAccountSection from "./components/settings/SettingsAccountSection";
import SettingsSecuritySection from "./components/settings/SettingsSecuritySection";
import SettingsPrivacySection from "./components/settings/SettingsPrivacySection";
import SettingsHelpLegalSection from "./components/settings/SettingsHelpLegalSection";
import {
  ADMIN_MODERATION_QUEUE_PATH,
  ADMIN_SETUP_PATH,
  BECOME_SELLER_PATH,
  CHANGE_EMAIL_PATH,
  CHANGE_PASSWORD_PATH,
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
  navigateBackOrPath,
  navigateToPath,
  navigateToSellerPayouts,
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
  getTotpStatus,
  startTotpEnrollment,
  confirmTotpEnrollment,
  disableTotpEnrollment,
} from "./lib/security";
import { getTotpDisplayName, type TotpMfaStatus } from "./lib/totp";
import { auth } from "./firebase";
import { clearTotpVerifiedSessionToken } from "./lib/totpSession";
import { signOut } from "firebase/auth";

type SettingsView = "menu" | "privacy" | "terms" | "safety" | "report";
type PasswordPromptAction = "verifyIdentity" | "deleteAccount" | null;

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
const SECURITY_ITEMS_STORAGE_KEY = "settings-security-items-state";
const defaultExpandedSections = {
  account: true,
  security: true,
  privacy: false,
  helpLegal: false,
};
const defaultExpandedSecurityItems = {
  twoFactor: false,
  emailVerification: false,
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
  const [passwordPromptBusy, setPasswordPromptBusy] = useState(false);
  const [passwordPromptAction, setPasswordPromptAction] =
    useState<PasswordPromptAction>(null);
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
  const [totpStatus, setTotpStatus] = useState<TotpMfaStatus>("disabled");
  const [totpLoading, setTotpLoading] = useState(false);
  const [totpSetupOpen, setTotpSetupOpen] = useState(false);
  const [totpSetupCode, setTotpSetupCode] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [totpUri, setTotpUri] = useState("");
  const [totpAccountName, setTotpAccountName] = useState("");
  const [expandedSecurityItems, setExpandedSecurityItems] = useState(() => {
    try {
      const saved = localStorage.getItem(SECURITY_ITEMS_STORAGE_KEY);
      if (saved) return JSON.parse(saved) as typeof defaultExpandedSecurityItems;
    } catch {
      // ignore parse errors
    }
    return defaultExpandedSecurityItems;
  });

  useEffect(() => {
    const handlePopState = () => {
      setView(getSettingsViewFromLocation(window.location));
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (view === "menu") {
      setExpandedSections((current) => ({ ...current, account: true }));
    }
  }, [view]);

  useEffect(() => {
    try {
      localStorage.setItem(ACCORDION_STORAGE_KEY, JSON.stringify(expandedSections));
    } catch {
      // ignore storage errors
    }
  }, [expandedSections]);

  useEffect(() => {
    try {
      localStorage.setItem(
        SECURITY_ITEMS_STORAGE_KEY,
        JSON.stringify(expandedSecurityItems)
      );
    } catch {
      // ignore storage errors
    }
  }, [expandedSecurityItems]);

  useEffect(() => {
    if (!firebaseUser) return;
    const loadTotpStatus = async () => {
      const result = await getTotpStatus();
      setTotpStatus(result.ok && result.data ? result.data.status : "disabled");
    };
    void loadTotpStatus();
  }, [firebaseUser]);

  const openView = (nextView: SettingsView) => {
    const url = new URL(window.location.href);
    url.pathname = SETTINGS_PATH;

    if (nextView === "menu") {
      url.searchParams.delete(SETTINGS_VIEW_QUERY_KEY);
    } else {
      url.searchParams.set(SETTINGS_VIEW_QUERY_KEY, nextView);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    window.history.pushState({}, "", url.toString());
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const showFeedback = (
    type: "success" | "error" | "info",
    title: string,
    message?: string
  ) => setFeedback({ open: true, type, title, message: message ?? "" });

  const totpQrImageUrl = useMemo(() => {
    if (!totpUri) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(totpUri)}`;
  }, [totpUri]);

  const emailVerified = firebaseUser?.emailVerified ?? false;
  const emailVerificationButtonsDisabled = !firebaseUser || emailVerified;
  const resendVerificationDisabled =
    emailVerificationButtonsDisabled || securityActionBusy === "resend";
  const verifiedAccountRequiredDisabled = !firebaseUser || !emailVerified;

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
      clearTotpVerifiedSessionToken();
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
      if ("code" in result && result.code === "auth/requires-recent-login") {
        setPasswordPromptAction("deleteAccount");
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

    setPasswordPromptBusy(true);
    try {
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
      const promptAction = passwordPromptAction;
      setPasswordPromptAction(null);
      if (promptAction === "deleteAccount") {
        await handleDeleteAccount();
        return;
      }
      showFeedback(
        "success",
        "Identity verified",
        "Your password has been verified for this session."
      );
    } finally {
      setPasswordPromptBusy(false);
    }
  };

  const handlePasswordPromptCancel = () => {
    setPasswordPromptOpen(false);
    setReauthPassword("");
    setPasswordPromptAction(null);
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
    showFeedback(
      verified ? "success" : "info",
      verified ? "Email verified" : "Still not verified",
      verified
        ? "Your email address is now verified."
        : "Email verification has not been completed yet. Check your inbox and spam folder."
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

  const handle2FAEntry = async () => {
    if (!firebaseUser) {
      showFeedback("error", "Login required", "Please log in before setting up two-factor authentication.");
      return;
    }

    setTotpLoading(true);
    try {
      const accountName = getTotpDisplayName(
        profile?.business_name || null,
        firebaseUser.email || null
      );
      const result = await startTotpEnrollment(accountName);
      if (!result.ok || !result.data) {
        showFeedback("error", "Setup failed", result.message);
        return;
      }
      setTotpSecret(result.data.secret);
      setTotpUri(result.data.otpauthUri);
      setTotpAccountName(result.data.accountName);
      setTotpSetupCode("");
      setTotpSetupOpen(true);
    } finally {
      setTotpLoading(false);
    }
  };

  const handleTotpSetupConfirm = async () => {
    if (!totpSetupCode.trim()) {
      showFeedback("info", "Code required", "Enter the 6-digit code from your authenticator app.");
      return;
    }
    setTotpLoading(true);
    try {
      const result = await confirmTotpEnrollment(totpSetupCode);
      if (!result.ok || !result.data) {
        showFeedback("error", "Confirmation failed", result.message);
        return;
      }
      setTotpStatus("enabled");
      setTotpSetupOpen(false);
      setTotpSetupCode("");
      showFeedback("success", "Two-factor enabled", "Authenticator app verification is now active.");
    } finally {
      setTotpLoading(false);
    }
  };

  const handleDisableTotp = async () => {
    setTotpLoading(true);
    try {
      const result = await disableTotpEnrollment();
      if (!result.ok) {
        showFeedback("error", "Disable failed", result.message);
        return;
      }
      setTotpStatus("disabled");
      setTotpSetupOpen(false);
      setTotpSetupCode("");
      setTotpSecret("");
      setTotpUri("");
      setTotpAccountName("");
      showFeedback("success", "Two-factor disabled", "Authenticator app protection has been removed.");
    } finally {
      setTotpLoading(false);
    }
  };

  const handleTotpSetupBack = () => {
    setTotpSetupOpen(false);
    setTotpSetupCode("");
    navigateBackOrPath(SETTINGS_PATH);
  };

  const handleVerifyIdentity = () => {
    if (!firebaseUser) return;
    setPasswordPromptAction("verifyIdentity");
    setPasswordPromptOpen(true);
  };

  const toggleSection = (
    section: "account" | "security" | "privacy" | "helpLegal"
  ) => {
    setExpandedSections((current) => ({ ...current, [section]: !current[section] }));
  };

  const toggleSecurityItem = (key: "twoFactor" | "emailVerification") => {
    setExpandedSecurityItems((current) => ({ ...current, [key]: !current[key] }));
  };

  if (view === "privacy") return <PrivacyPolicyPage onBack={() => openView("menu")} />;
  if (view === "terms") return <TermsPage onBack={() => openView("menu")} />;
  if (view === "safety") return <SafetyTipsPage onBack={() => openView("menu")} />;
  if (view === "report") {
    return <ReportProblemPage onBack={() => openView("menu")} isLoggedIn={!!firebaseUser} />;
  }

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <BrandMark />
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigateToPath(HOME_PATH)} className="hidden sm:inline-flex px-4 py-2.5 rounded-2xl border border-zinc-200 bg-white text-sm font-bold hover:bg-zinc-50 items-center gap-2"><House className="w-4 h-4" />Home</button>
            <button type="button" onClick={() => navigateToPath(EXPLORE_PATH)} className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"><ShoppingBag className="w-4 h-4" />Market</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">Settings</p>
              <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-zinc-900">Your account control center.</h1>
              <p className="mt-3 max-w-2xl text-sm sm:text-base text-zinc-600 leading-relaxed font-medium">Manage your account details, security posture, visibility controls, and legal/help resources from one page.</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-4 min-w-[220px]">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-400">Current section</p>
              <p className="mt-2 text-2xl font-black tracking-tight text-zinc-900 capitalize">{view === "menu" ? "Settings" : view}</p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <SettingsAccountSection
            expanded={expandedSections.account}
            onToggle={() => toggleSection("account")}
            profile={profile}
            firebaseUser={firebaseUser}
            isAdmin={isAdmin}
            verifiedAccountRequiredDisabled={verifiedAccountRequiredDisabled}
            onNavigate={navigateToPath}
            onSellerPayouts={navigateToSellerPayouts}
            onLogout={handleLogout}
            onDeleteAccount={() => setDeleteConfirmOpen(true)}
            paths={{ editAccount: EDIT_ACCOUNT_PATH, editProfile: EDIT_PROFILE_PATH, becomeSeller: BECOME_SELLER_PATH, moderationQueue: ADMIN_MODERATION_QUEUE_PATH, adminSetup: ADMIN_SETUP_PATH }}
          />
          <SettingsSecuritySection
            expanded={expandedSections.security}
            onToggle={() => toggleSection("security")}
            securityItems={expandedSecurityItems}
            onToggleSecurityItem={toggleSecurityItem}
            verifiedAccountRequiredDisabled={verifiedAccountRequiredDisabled}
            emailVerified={emailVerified}
            profileLoading={profileLoading}
            firebaseUser={firebaseUser}
            securityActionBusy={securityActionBusy}
            resendVerificationDisabled={resendVerificationDisabled}
            totpStatus={totpStatus}
            totpLoading={totpLoading}
            onNavigate={navigateToPath}
            changePasswordPath={CHANGE_PASSWORD_PATH}
            changeEmailPath={CHANGE_EMAIL_PATH}
            on2FAEntry={handle2FAEntry}
            onDisableTotp={handleDisableTotp}
            onRefreshVerification={handleRefreshVerification}
            onResendVerification={handleResendVerification}
            onLogoutAllSessions={handleLogoutAllSessions}
            onVerifyIdentity={handleVerifyIdentity}
          />
          <SettingsPrivacySection
            expanded={expandedSections.privacy}
            onToggle={() => toggleSection("privacy")}
            profile={profile}
            profileLoading={profileLoading}
            firebaseUser={firebaseUser}
            savingPrivacyField={savingPrivacyField}
            onUpdateVisibility={updateVisibility}
            visibilityLabel={VISIBILITY_LABEL}
            visibilityOptions={VISIBILITY_OPTIONS}
            labelToVisibility={LABEL_TO_VISIBILITY}
          />
          <SettingsHelpLegalSection
            expanded={expandedSections.helpLegal}
            onToggle={() => toggleSection("helpLegal")}
            onOpenView={(nextView) => openView(nextView)}
          />
        </section>
      </main>

      <TotpSetupModal
        open={totpSetupOpen}
        title="Set up authenticator app"
        message="Scan the QR code with Google Authenticator, Microsoft Authenticator, Authy, or any TOTP app. Then enter the 6-digit code to confirm setup."
        qrCodeUrl={totpQrImageUrl}
        otpauthUri={totpUri}
        secret={totpSecret}
        accountName={totpAccountName}
        code={totpSetupCode}
        busy={totpLoading}
        onCodeChange={setTotpSetupCode}
        onConfirm={handleTotpSetupConfirm}
        onDisable={handleDisableTotp}
        onBack={handleTotpSetupBack}
        onClose={() => {
          setTotpSetupOpen(false);
          setTotpSetupCode("");
        }}
      />

      <PasswordPromptModal
        open={passwordPromptOpen}
        title="Verify identity"
        message="Enter your password to continue with this security action."
        password={reauthPassword}
        busy={passwordPromptBusy}
        onPasswordChange={setReauthPassword}
        onSubmit={handlePasswordPromptSubmit}
        onCancel={handlePasswordPromptCancel}
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
      {feedback && <FeedbackModal open={feedback.open} type={feedback.type} title={feedback.title} message={feedback.message} onClose={() => setFeedback(null)} />}
    </div>
  );
}
