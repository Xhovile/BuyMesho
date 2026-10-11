import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const routesIndex = readFileSync(resolve(process.cwd(), "server/routes/index.ts"), "utf8");
const generalPaymentAdminRoutes = readFileSync(resolve(process.cwd(), "server/modules/payments/payment.admin.routes.ts"), "utf8");
const adminReconcileRoutes = readFileSync(resolve(process.cwd(), "server/modules/payments/payment.admin.reconcile.routes.ts"), "utf8");
const payoutReconciliationFlow = readFileSync(resolve(process.cwd(), "server/modules/payouts/payout.service.reconciliation.ts"), "utf8");

test("canonical Admin Payouts router is the only registered owner of list and detail GET routes", () => {
  assert.match(routesIndex, /import\s*\{\s*createPaymentAdminPayoutCanonicalRouter\s*\}\s*from/);
  assert.match(routesIndex, /app\.use\(["']\/api\/admin["'],\s*createPaymentAdminPayoutCanonicalRouter\(requireAuth\)\)/);
  assert.doesNotMatch(routesIndex, /createPaymentAdminPayoutDisplayRouter/);
  assert.doesNotMatch(routesIndex, /createPaymentAdminPayoutRouter/);
  assert.doesNotMatch(routesIndex, /createPaymentAdminDetailRouter/);
});

test("general payment admin router has no duplicate payout read or batch-reconcile handlers", () => {
  assert.equal(generalPaymentAdminRoutes.includes("router.get('/payouts',"), false);
  assert.equal(generalPaymentAdminRoutes.includes("router.get('/payouts/summary'"), false);
  assert.equal(generalPaymentAdminRoutes.includes("router.post('/payouts/reconcile-pending'"), false);
  assert.ok(generalPaymentAdminRoutes.includes("router.post('/payouts/:payoutId/reconcile'"));
  assert.ok(generalPaymentAdminRoutes.includes("router.post('/payouts/destinations/:destinationId/verification'"));
  assert.ok(generalPaymentAdminRoutes.includes("router.get('/payouts/:payoutId/adjustments'"));
  assert.ok(generalPaymentAdminRoutes.includes("router.post('/payouts/:payoutId/adjustments'"));
});

test("Admin Payouts batch reconciliation is scoped to seller/listing payouts", () => {
  assert.ok(adminReconcileRoutes.includes("ownerType: 'seller'"));
  assert.ok(payoutReconciliationFlow.includes("COALESCE(owner_type, 'seller') = 'seller' AND event_id IS NULL"));
  // The system scheduler omits ownerType and retains its existing shared scope.
});

test("dedicated payout mutation and adjustment routers remain registered", () => {
  assert.match(routesIndex, /createPaymentAdminActionRouter\(requireAuth\)/);
  assert.match(routesIndex, /createPaymentAdminReconcileRouter\(requireAuth\)/);
  assert.match(routesIndex, /createPaymentAdminRouter\(requireAuth\)/);

});
