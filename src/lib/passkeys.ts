import { authenticateWithPasskey, isPasskeySupported, registerPasskey } from "@xhovile/platform/passkeys/browser";
import { apiFetch } from "./api";

export function supportsPasskeys(): boolean {
  try {
    return isPasskeySupported();
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

export async function getPasskeyStatus(): Promise<{ enabled: boolean; count: number }> {
  return apiFetch("/api/auth/passkey/status", { method: "GET" });
}
