import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = process.cwd();

const files = {
  navigation: 'src/lib/appNavigation.query.ts',
  adminRoutes: 'server/modules/admin/admin.summary.routes.ts',
  payoutRoutes: 'server/routes/escrow/payoutRoutes.ts',
  destinationHelper: 'server/routes/escrow/payoutRoutes.helpers.destinations.ts',
  destinationForm: 'src/components/payouts/PayoutDestinationForm.tsx',
  destinationCard: 'src/components/payouts/PayoutDestinationCard.tsx',
  payoutCore: 'server/modules/payouts/payout.service.core.ts',
};

const source = {};
for (const [key, relativePath] of Object.entries(files)) {
  source[key] = await readFile(resolve(ROOT, relativePath), 'utf8');
}

const checks = [
  ['Admin destination location mapping removed', !source.navigation.includes('ADMIN_PAYOUT_DESTINATIONS_PATH') && !source.navigation.includes('admin_payout_destinations')],
  ['Admin destination request API removed', !source.adminRoutes.includes('/payout-destination-requests')],
  ['Admin destination verification API removed', !source.adminRoutes.includes('/payouts/destinations/:destinationAccountId/verification')],
  ['Seller destination create route retained', source.payoutRoutes.includes("router.post('/destinations'")],
  ['Seller destination ownership check retained', source.payoutRoutes.includes('assertEditSettingsAccess(req, sellerId)')],
  ['New destinations become verified', source.destinationHelper.includes("VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified'")],
  ['Changed destinations do not wait for Admin verification', source.destinationHelper.includes("shouldResetVerification ? 'verified' : existing.verification_status")],
  ['Seller UI says no Admin approval is required', source.destinationForm.includes('No admin approval is required')],
  ['Destination UI uses Ready since language', source.destinationCard.includes('Ready since')],
  ['Payout execution still protects against unverified destinations', source.payoutCore.includes('destination_not_verified')],
];

const failures = checks.filter(([, passed]) => !passed);
if (failures.length) {
  console.error('[payout-destination-independence] validation failed');
  for (const [label] of failures) console.error(`- ${label}`);
  process.exit(1);
}

console.log(`[payout-destination-independence] ${checks.length} safeguards passed`);
