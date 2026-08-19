import { getFirebaseAdmin } from "../server/auth/firebaseAdmin.js";

const SUPPORTED_ROLES = [
  "admin",
  "finance_admin",
  "moderator",
  "support",
  "validator",
  "seller",
  "buyer",
] as const;

type Role = (typeof SUPPORTED_ROLES)[number];

type MigrationTarget = {
  source: string;
  uid: string;
  role: Role;
};

const DRY_RUN = process.env.DRY_RUN !== "false";

function parseCsv(name: string): string[] {
  return String(process.env[name] ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function assertRole(value: string): Role {
  if ((SUPPORTED_ROLES as readonly string[]).includes(value)) return value as Role;
  throw new Error(`Unsupported role: ${value}`);
}

async function resolveUid(admin: ReturnType<typeof getFirebaseAdmin>, value: string): Promise<string> {
  const user = value.includes("@")
    ? await admin.auth().getUserByEmail(value)
    : await admin.auth().getUser(value);
  return user.uid;
}

async function buildTargets(admin: ReturnType<typeof getFirebaseAdmin>): Promise<MigrationTarget[]> {
  const sources: Array<[string, Role]> = [
    ["ADMIN_UIDS", "admin"], ["ADMIN_EMAILS", "admin"],
    ["FINANCE_ADMIN_UIDS", "finance_admin"], ["FINANCE_ADMIN_EMAILS", "finance_admin"],
    ["MODERATOR_UIDS", "moderator"], ["MODERATOR_EMAILS", "moderator"],
    ["SUPPORT_UIDS", "support"], ["SUPPORT_EMAILS", "support"],
    ["VALIDATOR_UIDS", "validator"], ["VALIDATOR_EMAILS", "validator"],
    ["SELLER_UIDS", "seller"], ["SELLER_EMAILS", "seller"],
  ];

  const seen = new Map<string, MigrationTarget>();

  for (const [envName, role] of sources) {
    for (const value of parseCsv(envName)) {
      const uid = await resolveUid(admin, value);
      const existing = seen.get(uid);
      if (existing && existing.role !== role) {
        throw new Error(`Conflicting roles for UID ${uid}: ${existing.role} (${existing.source}) vs ${role} (${envName}).`);
      }
      seen.set(uid, { source: `${envName}:${value}`, uid, role });
    }
  }

  for (const entry of parseCsv("ROLE_MIGRATIONS")) {
    const separator = entry.lastIndexOf(":");
    if (separator <= 0) throw new Error("ROLE_MIGRATIONS entries must use UID:role format.");
    const uid = entry.slice(0, separator).trim();
    const role = assertRole(entry.slice(separator + 1).trim());
    const existing = seen.get(uid);
    if (existing && existing.role !== role) {
      throw new Error(`Conflicting roles for UID ${uid}: ${existing.role} vs ${role}.`);
    }
    seen.set(uid, { source: `ROLE_MIGRATIONS:${uid}`, uid, role });
  }

  return [...seen.values()];
}

async function main() {
  const admin = getFirebaseAdmin();
  const targets = await buildTargets(admin);

  if (targets.length === 0) {
    throw new Error("No role migrations configured. Set ROLE_MIGRATIONS or *_UIDS/*_EMAILS variables.");
  }

  console.log(`Role migration mode: ${DRY_RUN ? "DRY RUN" : "WRITE"}`);
  console.log(`Targets: ${targets.length}`);

  for (const target of targets) {
    const user = await admin.auth().getUser(target.uid);
    const existingClaims = user.customClaims ?? {};
    const currentRole = typeof existingClaims.role === "string" ? existingClaims.role : null;

    console.log(
      `${DRY_RUN ? "[DRY RUN]" : "[APPLY]"} ${user.uid} (${user.email ?? "no email"}) ${currentRole ?? "<none>"} → ${target.role}`,
    );

    if (DRY_RUN) continue;

    await admin.auth().setCustomUserClaims(user.uid, {
      ...existingClaims,
      role: target.role,
    });
  }

  console.log(DRY_RUN ? "Dry run complete. No Firebase claims were changed." : "Role migration complete.");
}

main().catch((error) => {
  console.error("Role migration failed:", error);
  process.exit(1);
});
