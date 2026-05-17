export type SellerPayoutSignalInput = {
  status: string;
  destinationStatus?: string | null;
  retryAllowed?: boolean | null;
  manualReviewPending?: boolean | null;
  verificationBlockers?: string[] | null;
};

export function sellerOperationalSignals(input: SellerPayoutSignalInput): string[] {
  const messages: string[] = [];
  const destinationStatus = String(input.destinationStatus ?? '').toLowerCase();

  if (destinationStatus && destinationStatus !== 'verified') {
    messages.push('Destination pending verification');
  }
  if (input.status === 'held') {
    messages.push('Payout held');
  }
  if (input.retryAllowed === false && input.status === 'failed') {
    messages.push('Retry unavailable');
  }
  if (input.manualReviewPending) {
    messages.push('Awaiting admin review');
  }
  if (input.status === 'failed') {
    messages.push('Failed due to provider issue');
  }
  if (Array.isArray(input.verificationBlockers) && input.verificationBlockers.length > 0) {
    messages.push(...input.verificationBlockers);
  }

  return Array.from(new Set(messages));
}

export function getVisibleAdminActions(isAdmin: boolean): Array<'retry' | 'hold' | 'mark_paid' | 'mark_failed'> {
  if (!isAdmin) return [];
  return ['retry', 'mark_paid', 'hold', 'mark_failed'];
}
