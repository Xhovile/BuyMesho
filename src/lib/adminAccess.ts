import type { User } from "firebase/auth";

const ADMIN_UIDS = ((import.meta.env.VITE_ADMIN_UIDS as string | undefined) || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

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

  return Boolean(user.uid && ADMIN_UIDS.includes(user.uid));
};

export const resolveIsAdminUser = async (user: User | null | undefined) => {
  if (!user) return false;

  if (isConfiguredAdminUser(user)) return true;

  return hasAdminClaim(user);
};
