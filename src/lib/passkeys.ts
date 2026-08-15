import {
  authenticateWithPasskey,
  isPasskeySupported,
  registerPasskey,
} from "@xhovile/platform/passkeys/browser";
import { apiFetch } from "./api";

export type PasskeyCredential = {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  deviceType: string | null;
  backedUp: boolean | null;
};

export type PasskeyStatus = {
  enabled: boolean;
  count: number;
  credentials?: PasskeyCredential[];
};

const POST_LOGIN_PASSKEY_OFFER_KEY = "buymesho:offer-passkey";

export function supportsPasskeys(): boolean {
  try {
    return isPasskeySupported();
  } catch {
    return false;
  }
}

export function markPasskeySetupOffer(): void {
  try {
    sessionStorage.setItem(POST_LOGIN_PASSKEY_OFFER_KEY, "1");
  } catch {
    // Passkey setup is optional; storage failures should not block login.
  }
}

export function consumePasskeySetupOffer(): boolean {
  try {
    const shouldOffer = sessionStorage.getItem(POST_LOGIN_PASSKEY_OFFER_KEY) === "1";
    if (shouldOffer) sessionStorage.removeItem(POST_LOGIN_PASSKEY_OFFER_KEY);
    return shouldOffer;
  } catch {
    return false;
  }
}

export async function beginPasskeyLogin(): Promise<{ customToken: string; uid: string }> {
  const start = await apiFetch("/api/auth/passkey/login/options", { method: "GET" });
  const assertion = await authenticateWithPasskey(start.options);
  const result = await apiFetch("/api/auth/passkey/login/verify", {
    method: "POST",
    body: JSON.stringify({ ceremonyId: start.ceremonyId, response: assertion }),
  });

  if (!result?.customToken || !result?.uid) {
    throw new Error("Passkey sign-in did not return a valid authentication token");
  }

  return { customToken: result.customToken, uid: result.uid };
}

export async function registerCurrentPasskey(): Promise<{ credentialId: string }> {
  const start = await apiFetch("/api/auth/passkey/register/options", { method: "POST" });
  const registration = await registerPasskey(start.options);
  const result = await apiFetch("/api/auth/passkey/register/verify", {
    method: "POST",
    body: JSON.stringify({ ceremonyId: start.ceremonyId, response: registration }),
  });

  if (!result?.success || !result?.credentialId) {
    throw new Error("Passkey registration did not complete successfully");
  }

  return { credentialId: result.credentialId };
}

export async function getPasskeyStatus(): Promise<PasskeyStatus> {
  const status = await apiFetch("/api/auth/passkey/status", { method: "GET" }) as PasskeyStatus;

  // The current LoginPage checks passkey status before redirecting. Keep that
  // check silent: record the one-time post-login offer and let Home render it.
  if (window.location.pathname === "/login" && !status.enabled) {
    markPasskeySetupOffer();
    return { ...status, enabled: true };
  }

  return status;
}

export async function removePasskey(credentialId: string): Promise<void> {
  await apiFetch(`/api/auth/passkey/${encodeURIComponent(credentialId)}`, {
    method: "DELETE",
  });
}
