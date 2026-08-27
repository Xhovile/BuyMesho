import {
  executePayoutFlow as executePayoutFlowImpl,
  gateForSubmissionAsync,
  getProviderBalance,
  type PayoutExecutionGate,
} from './payout.service.execution.async.js';
import { getPayout, updatePayoutStatus } from './payout.execution-repository.js';
import type { ExecutePayoutInput } from './payout.shared.js';

export type { PayoutExecutionGate };
export { gateForSubmissionAsync as gateForSubmission, getProviderBalance };

export async function executePayoutFlow(repository: unknown, input: ExecutePayoutInput) {
  const payout = await getPayout(input.payoutId);
  if (payout?.status === 'pending_settlement') {
    await updatePayoutStatus(input.payoutId, 'queued', {
      provider: payout.provider ?? 'paychangu',
      providerStatus: 'queued',
    });
  }

  return executePayoutFlowImpl(repository, input);
}
