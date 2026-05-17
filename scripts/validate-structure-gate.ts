import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PAYOUT_POLICY } from '../server/modules/payouts/payout.policy.js';

const docPath = resolve(process.cwd(), 'docs/structure-completion-gate.md');
const doc = readFileSync(docPath, 'utf8');

const expected = [
  { label: 'platform fee 2%', token: '2%' },
  { label: 'reserve cap 6%', token: '6%' },
  { label: `minimum payout ${PAYOUT_POLICY.minimumPayoutAmount}`, token: String(PAYOUT_POLICY.minimumPayoutAmount) },
  { label: `retry count ${PAYOUT_POLICY.maxRetryCount}`, token: `${PAYOUT_POLICY.maxRetryCount}` },
  { label: `launch mode ${PAYOUT_POLICY.launchMode}`, token: PAYOUT_POLICY.launchMode === 'admin_approved' ? 'Admin-approved' : PAYOUT_POLICY.launchMode },
];

const failures = expected.filter((item) => !doc.toLowerCase().includes(item.token.toLowerCase()));

if (failures.length > 0) {
  console.error('[structure-gate] validation failed');
  for (const failure of failures) {
    console.error(`- missing token for ${failure.label}: "${failure.token}"`);
  }
  process.exit(1);
}

console.log('[structure-gate] validation passed');
