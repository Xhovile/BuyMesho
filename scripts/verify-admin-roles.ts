import { getFirebaseAdmin } from "../server/auth/firebaseAdmin.js";

const expectedEntries = String(process.env.ROLE_MIGRATIONS ?? "")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);

if (expectedEntries.length === 0) {
  throw new Error("Set ROLE_MIGRATIONS using UID:role entries before verification.");
}

const admin = getFirebaseAdmin();
const supportedRoles = new Set([
  "admin",
  "finance_admin",
  "moderator",
  "support",
  "validator",
  "seller",
  "buyer",
]);

async function main() {
  let failures = 0;

  for (const entry of expectedEntries) {
    const separator = entry.lastIndexOf(":");
    if (separator <= 0) {
      console.error(`[FAIL] Invalid ROLE_MIGRATIONS entry: ${entry}`);
      failures += 1;
      continue;
    }

    const uid = entry.slice(0, separator).trim();
    const expectedRole = entry.slice(separator + 1).trim();

    if (!supportedRoles.has(expectedRole)) {
      console.error(`[FAIL] Unsupported expected role for ${uid}: ${expectedRole}`);
      failures += 1;
      continue;
    }

    try {
      const user = await admin.auth().getUser(uid);
      const actualRole = typeof user.customClaims?.role === "string" ? user.customClaims.role : null;

      if (actualRole !== expectedRole) {
        console.error(
          `[FAIL] ${user.email ?? uid}: expected role=${expectedRole}, actual role=${actualRole ?? "<none>"}`,
        );
        failures += 1;
        continue;
      }

      console.log(`[OK] ${user.email ?? uid}: role=${actualRole}`);
    } catch (error) {
      console.error(`[FAIL] ${uid}:`, error);
      failures += 1;
    }
  }

  if (failures > 0) {
    process.exitCode = 1;
    console.error(`Role verification failed for ${failures} target(s).`);
    return;
  }

  console.log(`Role verification passed for ${expectedEntries.length} target(s).`);
}

main().catch((error) => {
  console.error("Role verification failed:", error);
  process.exit(1);
});
