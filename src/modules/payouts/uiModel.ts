export type SellerPayoutSignalInput = {
  status: string;
  destinationStatus?: string | null;
  retryAllowed?: boolean | null;
  manualReviewPending?: boolean | null;
  verificationBlockers?: string[] | null;
};

export type SellerPayoutLaunchStatus =
  | 'eligible'
  | 'queued_for_admin_review'
  | 'sent_to_paychangu'
  | 'provider_pending'
  | 'paid'
  | 'held'
  | 'needs_destination_update'
  | 'cancelled';

export type SellerPayoutLaunchStatusMeta = {
  label: string;
  detail: string;
};

const LAUNCH_STATUS_META: Record<SellerPayoutLaunchStatus, SellerPayoutLaunchStatusMeta> = {
  eligible: {
    label: 'Eligible for payout',
    detail: 'Released funds are ready to enter the admin-approved payout queue.',
  },
  queued_for_admin_review: {
    label: 'Queued for admin review',
    detail: 'The payout is waiting for admin review before it is sent to PayChangu.',
  },
  sent_to_paychangu: {
    label: 'Sent to PayChangu',
    detail: 'The payout has been submitted to PayChangu for provider processing.',
  },
  provider_pending: {
    label: 'Provider pending',
    detail: 'PayChangu or the destination provider is still processing the payout.',
  },
  paid: {
    label: 'Paid',
    detail: 'The provider confirmed the seller payout has been completed.',
  },
  held: {
    label: 'Held',
    detail: 'The payout is held while the admin team reviews the release.',
  },
  needs_destination_update: {
    label: 'Needs destination update',
    detail: 'Update or verify the payout destination before the payout can continue.',
  },
  cancelled: {
    label: 'Cancelled',
    detail: 'The payout was cancelled and will not be sent in its current state.',
  },
};

export function getSellerPayoutLaunchStatus(input: SellerPayoutSignalInput): SellerPayoutLaunchStatus {
  const status = String(input.status ?? '').toLowerCase();
  const destinationStatus = String(input.destinationStatus ?? '').toLowerCase();

  if (destinationStatus === 'failed' || input.verificationBlockers?.length) {
    return 'needs_destination_update';
  }

  if (status === 'failed') return 'needs_destination_update';
  if (status === 'held') return 'held';
  if (status === 'paid') return 'paid';
  if (status === 'cancelled') return 'cancelled';
  if (status === 'processing') return 'sent_to_paychangu';
  if (status === 'pending') return 'provider_pending';
  if (status === 'queued' || input.manualReviewPending) return 'queued_for_admin_review';
  return 'eligible';
}

export function getSellerPayoutLaunchStatusMeta(input: SellerPayoutSignalInput): SellerPayoutLaunchStatusMeta {
  return LAUNCH_STATUS_META[getSellerPayoutLaunchStatus(input)];
}

export function sellerOperationalSignals(input: SellerPayoutSignalInput): string[] {
  const messages: string[] = [];
  const destinationStatus = String(input.destinationStatus ?? '').toLowerCase();
  const launchStatus = getSellerPayoutLaunchStatusMeta(input);

  messages.push(launchStatus.label);

  if (destinationStatus && destinationStatus !== 'verified') {
    messages.push(destinationStatus === 'failed' ? 'Needs destination update' : 'Destination pending verification');
  }
  if (input.status === 'held') {
    messages.push('Payout held');
  }
  if (input.manualReviewPending) {
    messages.push('Awaiting admin review');
  }
  if (input.status === 'failed') {
    messages.push('Failed due to provider issue');
  }
  if (input.retryAllowed === false && input.status === 'failed') {
    messages.push('Admin retry required');
    messages.push('Retry unavailable');
  }
  if (Array.isArray(input.verificationBlockers) && input.verificationBlockers.length > 0) {
    messages.push('Destination verification blocked');
    messages.push(...input.verificationBlockers);
  }

  return Array.from(new Set(messages));
}

export function getVisibleAdminActions(isAdmin: boolean): Array<'retry' | 'hold' | 'mark_paid' | 'mark_failed' | 'cancel'> {
  if (!isAdmin) return [];
  return ['retry', 'mark_paid', 'hold', 'mark_failed', 'cancel'];
}
