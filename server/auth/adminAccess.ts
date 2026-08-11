export type AdminIdentity = {
  email?: string | null;
  uid?: string | null;
  is_admin?: boolean;
};

function parseCsvEnv(value: string | undefined, normalizeLowercase = false): string[] {
  return String(value ?? "")
    .split(",")
    .map((item) => {
      const trimmed = item.trim();
      return normalizeLowercase ? trimmed.toLowerCase() : trimmed;
    })
    .filter(Boolean);
}

export function getConfiguredAdminEmails(): string[] {
  return parseCsvEnv(process.env.ADMIN_EMAILS || process.env.VITE_ADMIN_EMAILS, true);
}

export function getConfiguredAdminUids(): string[] {
  return parseCsvEnv(process.env.ADMIN_UIDS || process.env.VITE_ADMIN_UIDS);
}

export function isConfiguredAdmin(identity?: Pick<AdminIdentity, "email" | "uid">): boolean {
  const email = typeof identity?.email === "string" ? identity.email.trim().toLowerCase() : "";
  if (email && getConfiguredAdminEmails().includes(email)) return true;

  const uid = typeof identity?.uid === "string" ? identity.uid.trim() : "";
  if (uid && getConfiguredAdminUids().includes(uid)) return true;

  return false;
}

export function hasAdminAccess(identity?: AdminIdentity): boolean {
  if (identity?.is_admin === true) return true;
  return isConfiguredAdmin(identity);
}
