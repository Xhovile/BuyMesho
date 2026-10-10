import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const routesIndex = readFileSync(resolve(process.cwd(), "server/routes/index.ts"), "utf8");

test("canonical Admin Payouts router is the only registered owner of list and detail GET routes", () => {
  assert.match(routesIndex, /import\s*\{\s*createPaymentAdminPayoutCanonicalRouter\s*\}\s*from/);
  assert.match(routesIndex, /app\.use\(["']\/api\/admin["'],\s*createPaymentAdminPayoutCanonicalRouter\(requireAuth\)\)/);
  assert.doesNotMatch(routesIndex, /createPaymentAdminPayoutDisplayRouter/);
  assert.doesNotMatch(routesIndex, /createPaymentAdminPayoutRouter/);
  assert.doesNotMatch(routesIndex, /createPaymentAdminDetailRouter/);
});

test("dedicated payout mutation and adjustment routers remain registered", () => {
  assert.match(routesIndex, /createPaymentAdminActionRouter\(requireAuth\)/);
  assert.match(routesIndex, /createPaymentAdminReconcileRouter\(requireAuth\)/);
  assert.match(routesIndex, /createPaymentAdminRouter\(requireAuth\)/);
});
