import {
  EmailAuthProvider,
  applyActionCode,
  deleteUser,
  reauthenticateWithCredential,
  reload,
  signOut,
  updatePassword,
  verifyBeforeUpdateEmail,
  type User,
} from "firebase/auth";
import { auth } from "../firebase";
import { apiFetch } from "./api";
import {
  clearTotpVerifiedSessionToken,
  setTotpVerifiedSessionToken,
} from "./totpSession";

export type FeedbackLevel = "success" | "error" | "info";

export type SecurityResult =
  | { ok: true; message?: string; code?: string }
  | { ok: false; message: string; code?: string };

export type PasswordCredentialInput = {
  email: string;
  password: string;
};

const DEFAULT_ACTION_CODE_SETTINGS = {
  url: `${window.location.origin}/email-action`,
  handleCodeInApp: false,
};

function getErrorMessage(error: any, fallback: string) {
  const code = error?.code as string | undefined;
  const status = Number(error?.status);
  const rawMessage = String(error?.message || "").toLowerCase();

  switch (code) {
    case "auth/requires-recent-login":
      return "Please verify your identity again and try once more.";
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "The password is incorrect.";
    case "auth/weak-password":
      return "The password is too weak.";
    case "auth/email-already-in-use":
      return "That email is already in use.";
    case "auth/invalid-email":
      return "That email address is invalid.";
    case "auth/user-token-expired":
    case "auth/user-disabled":
      return "This account needs to be signed in again.";
    default:
      break;
  }

  if (status === 429 || rawMessage.includes("too_many_attempts") || rawMessage.includes("too many attempts")) {
    return "Too many attempts. Please wait a few minutes before trying again.";
  }

  if (
    rawMessage.includes("unrecognised ip") ||
    rawMessage.includes("unrecognized ip") ||
    rawMessage.includes("authorised_ips") ||
    rawMessage.includes("unauthorized")
  ) {
    return "Email delivery is temporarily unavailable. Please try again later.";
  }

  if (status >= 500) {
    return fallback;
  }

  return error?.message || fallback;
}

function requireUser(): User {
  const user = auth.currentUser;
  if (!user) {
    throw Object.assign(new Error("Login required."), { code: "auth/no-current-user" });
  }
  return user;
}

export async function reauthenticateWithPassword({
  email,
  password,
}: PasswordCredentialInput): Promise<SecurityResult> {
  try {
    const user = requireUser();
    const credential = EmailAuthProvider.credential(email, password);
    await reauthenticateWithCredential(user, credential);
    return { ok: true };
  } catch (error: any) {
    return { ok: false, message: getErrorMessage(error, "Could not verify your identity."), code: error?.code };
  }
}

export async function resendVerificationEmail(): Promise<SecurityResult> {
  try {
    const user = requireUser();
    await apiFetch("/api/auth/resend-verification-email", {
      method: "POST",
      body: JSON.stringify({ display_name: user.displayName || undefined }),
    });
    return { ok: true, message: "Verification email sent. Check your inbox and spam folder if you do not see it." };
  } catch (error: any) {
    return { ok: false, message: getErrorMessage(error, "Could not send verification email."), code: error?.code };
  }
}

export async function refreshEmailVerificationState(): Promise<boolean> {
  try {
    const user = requireUser();
    await reload(user);
    return !!auth.currentUser?.emailVerified;
  } catch {
    return !!auth.currentUser?.emailVerified;
  }
}

export async function changePasswordWithReauth(
  currentPassword: string,
  newPassword: string
): Promise<SecurityResult> {
  try {
    const user = requireUser();
    if (!user.email) {
      return { ok: false, message: "No email found for this account." };
    }

    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
    await updatePassword(user, newPassword);

    return { ok: true, message: "Password changed successfully." };
  } catch (error: any) {
    return { ok: false, message: getErrorMessage(error, "Failed to change password."), code: error?.code };
  }
}

export type TotpStatusResponse = {
  status: "disabled" | "pending" | "enabled";
  enrolledAt: string | null;
  confirmedAt: string | null;
  issuer: string | null;
  accountName: string;
  hasSecret: boolean;
};

export type TotpStartResponse = {
  status: "disabled" | "pending" | "enabled";
  secret: string;
  otpauthUri: string;
  issuer: string;
  accountName: string;
  enrolledAt: string | null;
  confirmedAt: string | null;
};

export type TotpConfirmResponse = {
  status: "disabled" | "pending" | "enabled";
  issuer: string;
  accountName: string;
  enrolledAt: string | null;
  confirmedAt: string | null;
};

export type TotpVerifyResponse = {
  verified: true;
  status: "disabled" | "pending" | "enabled";
  sessionToken: string;
  expiresAt: string;
};

function extractApiData<T>(response: any): T {
  return (response?.data ?? response) as T;
}

export async function getTotpStatus(): Promise<SecurityResult & { data?: TotpStatusResponse }> {
  try {
    const response = await apiFetch("/api/totp/status");
    return { ok: true, data: extractApiData<TotpStatusResponse>(response) };
  } catch (error: any) {
    return {
      ok: false,
      message: getErrorMessage(error, "Failed to load 2FA status."),
      code: error?.code,
    };
  }
}

export async function startTotpEnrollment(
  accountName?: string
): Promise<SecurityResult & { data?: TotpStartResponse }> {
  try {
    const response = await apiFetch("/api/totp/enroll/start", {
      method: "POST",
      body: JSON.stringify({
        accountName: accountName?.trim() || undefined,
        issuer: "BuyMesho",
      }),
    });

    return { ok: true, data: extractApiData<TotpStartResponse>(response) };
  } catch (error: any) {
    return {
      ok: false,
      message: getErrorMessage(error, "Failed to start 2FA setup."),
      code: error?.code,
    };
  }
}

export async function confirmTotpEnrollment(
  code: string
): Promise<SecurityResult & { data?: TotpConfirmResponse }> {
  try {
    const normalizedCode = code.trim();
    const response = await apiFetch("/api/totp/enroll/confirm", {
      method: "POST",
      body: JSON.stringify({ code: normalizedCode }),
    });

    return { ok: true, data: extractApiData<TotpConfirmResponse>(response) };
  } catch (error: any) {
    return {
      ok: false,
      message: getErrorMessage(error, "Failed to confirm 2FA setup."),
      code: error?.code,
    };
  }
}

export async function disableTotpEnrollment(): Promise<SecurityResult> {
  try {
    await apiFetch("/api/totp/disable", { method: "POST" });
    clearTotpVerifiedSessionToken();
    return { ok: true, message: "Two-factor authentication disabled." };
  } catch (error: any) {
    return {
      ok: false,
      message: getErrorMessage(error, "Failed to disable 2FA."),
      code: error?.code,
    };
  }
}

export async function verifyTotpChallenge(
  code: string
): Promise<SecurityResult & { data?: TotpVerifyResponse }> {
  try {
    const normalizedCode = code.trim();
    const response = await apiFetch("/api/totp/challenge/verify", {
      method: "POST",
      body: JSON.stringify({ code: normalizedCode }),
    });

    const data = extractApiData<TotpVerifyResponse>(response);
    if (data?.sessionToken) {
      setTotpVerifiedSessionToken(data.sessionToken);
    }

    return { ok: true, data };
  } catch (error: any) {
    return {
      ok: false,
      message: getErrorMessage(error, "Invalid authenticator code."),
      code: error?.code,
    };
  }
}

export async function changeEmailWithVerification(
  currentPassword: string,
  nextEmail: string
): Promise<SecurityResult> {
  try {
    const user = requireUser();
    if (!user.email) {
      return { ok: false, message: "No email found for this account." };
    }

    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));

    await verifyBeforeUpdateEmail(user, nextEmail, DEFAULT_ACTION_CODE_SETTINGS);

    return {
      ok: true,
      message: "A verification link was sent to your new email address.",
    };
  } catch (error: any) {
    return { ok: false, message: getErrorMessage(error, "Failed to change email."), code: error?.code };
  }
}

export async function logoutOtherSessions(): Promise<SecurityResult> {
  try {
    await apiFetch("/api/auth/revoke-sessions", { method: "POST" });

    clearTotpVerifiedSessionToken();
    await signOut(auth);

    return { ok: true, message: "All sessions signed out." };
  } catch (error: any) {
    return {
      ok: false,
      message: getErrorMessage(error, "Could not sign out all sessions."),
      code: error?.code,
    };
  }
}

export async function deleteCurrentAccount(): Promise<SecurityResult> {
  try {
    const user = requireUser();

    await apiFetch("/api/account/delete", { method: "DELETE" });

    clearTotpVerifiedSessionToken();
    await deleteUser(user);

    return { ok: true, message: "Account deleted successfully." };
  } catch (error: any) {
    return { ok: false, message: getErrorMessage(error, "Failed to delete account."), code: error?.code };
  }
}

export async function applyPendingEmailActionCode(oobCode: string): Promise<SecurityResult> {
  try {
    await applyActionCode(auth, oobCode);
    return { ok: true, message: "Email updated successfully." };
  } catch (error: any) {
    return {
      ok: false,
      message: getErrorMessage(error, "Could not complete the email update."),
      code: error?.code,
    };
  }
}
