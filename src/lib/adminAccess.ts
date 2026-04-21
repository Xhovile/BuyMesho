import type { User } from "firebase/auth";

const parseCsvEnv = (value: unknown) =>
  String(value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

const ADMIN_UIDS = parseCsvEnv(import.meta.env.VITE_ADMIN_UIDS);
const ADMIN_EMAILS = parseCsvEnv(import.meta.env.VITE_ADMIN_EMAILS);

const hasAdminClaim = async (user: User) => {
  try {
    const tokenResult = await user.getIdTokenResult();
    return tokenResult.claims.admin === true || tokenResult.claims.role === "admin";
  } catch (error) {
    console.warn("Failed to read admin claims", error);
    return false;
  }
};

export const isConfiguredAdminUser = (user: User | null | undefined) => {
  if (!user) return false;

  const uid = user.uid?.trim();
  const email = user.email?.trim().toLowerCase();

  return Boolean(
    (uid && ADMIN_UIDS.includes(uid)) ||
      (email && ADMIN_EMAILS.includes(email))
  );
};

export const resolveIsAdminUser = async (user: User | null | undefined) => {
  if (!user) return false;

  if (isConfiguredAdminUser(user)) return true;

  return hasAdminClaim(user);
};
