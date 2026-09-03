import { GoogleAuthProvider, signInWithPopup, type User } from "firebase/auth";
import { auth } from "../firebase";
import { apiFetch } from "./api";
import { consumeAuthReturnPath, HOME_PATH, navigateToPath } from "./appNavigation";

export type GoogleAuthMode = "login" | "signup";

function splitGoogleDisplayName(displayName: string | null) {
  const parts = (displayName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { firstName: parts[0] || "", otherNames: "", surname: "" };
  }

  return {
    firstName: parts[0] || "",
    otherNames: parts.length > 2 ? parts.slice(1, -1).join(" ") : "",
    surname: parts[parts.length - 1] || "",
  };
}

async function ensureGoogleAccountProfile(user: User) {
  const existing = await apiFetch("/api/profile") as Record<string, unknown>;
  const setupComplete = existing?.profile_setup_complete === true;

  if (setupComplete) return { setupRequired: false, profile: existing };

  const firstName = typeof existing?.first_name === "string" && existing.first_name.trim()
    ? existing.first_name.trim()
    : splitGoogleDisplayName(user.displayName).firstName;
  const surname = typeof existing?.surname === "string" && existing.surname.trim()
    ? existing.surname.trim()
    : splitGoogleDisplayName(user.displayName).surname;
  const otherNames = typeof existing?.other_names === "string" && existing.other_names.trim()
    ? existing.other_names.trim()
    : splitGoogleDisplayName(user.displayName).otherNames;
  const fullName = [firstName, otherNames, surname].filter(Boolean).join(" ") || user.displayName?.trim() || "";

  if (firstName && surname) {
    await apiFetch("/api/account", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: firstName,
        surname,
        other_names: otherNames || null,
        full_name: fullName,
        profile_picture: typeof existing?.profile_picture === "string" && existing.profile_picture.trim()
          ? existing.profile_picture
          : user.photoURL || null,
        profile_setup_complete: false,
      }),
    });
  }

  return { setupRequired: true, profile: existing };
}

export async function authenticateWithGoogle(mode: GoogleAuthMode) {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  const result = await signInWithPopup(auth, provider);
  const user = result.user;
  await user.reload();

  if (!user.email) {
    throw new Error("Google sign-in did not provide an email address.");
  }

  const state = await ensureGoogleAccountProfile(user);

  if (state.setupRequired) {
    navigateToPath("/account/setup", { replace: true });
    return { user, setupRequired: true, mode };
  }

  const destination = consumeAuthReturnPath(HOME_PATH);
  navigateToPath(destination, { replace: true });
  return { user, setupRequired: false, mode };
}
