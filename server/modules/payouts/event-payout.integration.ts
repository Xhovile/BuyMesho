import { randomUUID } from 'crypto';
import type { PoolClient } from 'pg';
import { calculateEventPayoutFees, buildEventPayoutFormulaSnapshot, type EventPayoutFeeInput } from './event-payout-fees.js';
import type { PayoutRecord, PayoutStatus } from './payout.shared.js';

export type EventPayoutContext = {
  eventId: string;
  eventCreatorUid: string;
  destinationAccountId: string;
  destinationType: string | null;
  providerRefId: string | null;
  providerName: string | null;
  payoutMethod: EventPayoutFeeInput['payoutMethod'];
};

type DbExecutor = Pick<PoolClient, 'query'>;

type OrderItem = {
  eventId?: unknown;
  event_id?: unknown;
  kind?: unknown;
};

function parseEventIds(items: unknown): string[] {
  if (typeof items !== 'string') return [];

  try {
    const parsed = JSON.parse(items);
    if (!Array.isArray(parsed)) return [];

    return [...new Set(
      parsed
        .map((item) => item as OrderItem)
        .filter((item) => item && (item.kind === 'event_ticket' || item.eventId || item.event_id))
        .map((item) => String(item.eventId ?? item.event_id ?? '').trim())
        .filter((eventId) => /^\d+$/.test(eventId)),
    )];
  } catch {
    return [];
  }
}

function resolvePayoutMethod(destinationType: unknown, providerRefId: unknown, providerName: unknown): EventPayoutFeeInput['payoutMethod'] {
  if (destinationType === 'bank') return 'bank_transfer';

  const provider = `${String(providerRefId ?? '')} ${String(providerName ?? '')}`;
  if (/tnm|mpamba/i.test(provider)) return 'tnm_mpamba';
  if (/airtel/i.test(provider)) return 'airtel_money';
  return null;
}

export async function resolveEventPayoutContext(orderId: string, client: DbExecutor): Promise<EventPayoutContext | undefined> {
  const orderResult = await client.query<{
    seller_id: string | null;
    items: string | null;
  }>(
    `SELECT seller_id, items
     FROM orders
     WHERE id = $1
     LIMIT 1`,
    [orderId],
  );

  const order = orderResult.rows[0];
  if (!order) return undefined;

  const eventIds = parseEventIds(order.items);
  if (eventIds.length === 0) return undefined;
  if (eventIds.length > 1) {
    throw new Error('An order containing tickets from multiple events cannot be settled as one payout');
  }

  const eventId = eventIds[0]!;
  const result = await client.query<{
    creator_uid: string | null;
    payout_destination_id: string | null;
  }>(
    `SELECT creator_uid, payout_destination_id
     FROM events
     WHERE id = $1
     LIMIT 1`,
    [eventId],
  );

  const event = result.rows[0];
  if (!event?.creator_uid) throw new Error('Event creator not found for payout');
  if (order.seller_id !== event.creator_uid) {
    throw new Error('Event payout creator does not match the order owner');
  }
  if (!event.payout_destination_id) {
    throw new Error('Event has no bound payout destination');
  }

  const destinationResult = await client.query<{
    id: string;
    destination_type: string | null;
    provider_ref_id: string | null;
    provider_name: string | null;
    is_active: number;
    verification_status: string | null;
    owner_type: string | null;
    owner_uid: string | null;
  }>(
    `SELECT id, destination_type, provider_ref_id, provider_name,
            is_active, verification_status, owner_type, owner_uid
     FROM seller_payout_accounts
     WHERE id = $1
     LIMIT 1`,
    [event.payout_destination_id],
  );

  const destination = destinationResult.rows[0];
  if (!destination) throw new Error('Event payout destination not found');
  if (destination.owner_type !== 'event_creator' || destination.owner_uid !== event.creator_uid) {
    throw new Error('Event payout destination does not belong to the event creator');
  }
  if (Number(destination.is_active) !== 1) throw new Error('Event payout destination is inactive');
  if ((destination.verification_status ?? '').toLowerCase() !== 'verified') {
    throw new Error('Event payout destination is not verified');
  }

  return {
    eventId,
    eventCreatorUid: event.creator_uid,
    destinationAccountId: destination.id,
    destinationType: destination.destination_type,
    providerRefId: destination.provider_ref_id,
    providerName: destination.provider_name,
    payoutMethod: resolvePayoutMethod(destination.destination_type, destination.provider_ref_id, destination.provider_name),
  };
}

function rowToPayout(row: Record<string, unknown>): PayoutRecord {
  return {
    id: String(row.id),
    sellerId: String(row.seller_id),
    ownerType: (row.owner_type == null ? 'event_creator' : String(row.owner_type)) as 'seller' | 'event_creator',
    ownerUid: String(row.owner_uid ?? row.event_creator_uid ?? row.seller_id),
    eventId: row.event_id == null ? null : String(row.event_id),
    eventCreatorUid: row.event_creator_uid == null ? null : String(row.event_creator_uid),
    orderId: row.order_id == null ? null : String(row.order_id),
    escrowId: row.escrow_id == null ? null : String(row.escrow_id),
    releaseEntryId: row.release_entry_id == null ? null : String(row.release_entry_id),
    destinationAccountId: row.destination_account_id == null ? null : String(row.destination_account_id),
    amount: Number(row.amount ?? 0),
    currency: String(row.currency ?? 'MWK'),
    status: String(row.status ?? 'pending_settlement') as PayoutStatus,
    provider: row.provider == null ? null : String(row.provider),
    providerChargeId: row.provider_charge_id == null ? null : String(row.provider_charge_id),
    providerStatus: row.provider_status == null ? null : String(row.provider_status),
    requestedBy: row.requested_by == null ? null : String(row.requested_by),
    requestedAt: row.requested_at == null ? null : String(row.requested_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function createEventPayoutCandidateAsync(input: {
  orderId: string;
  escrowId: string;
  releaseEntryId: string;
  event: EventPayoutContext;
  grossAmount: number;
  currency: string;
  requestedBy: string;
  requestedAt: string;
  processingFeeAmount?: number;
  reserveAmount?: number;
  manualAdjustmentAmount?: number;
}, client: DbExecutor): Promise<{ payout: PayoutRecord; payoutFormula: ReturnType<typeof calculateEventPayoutFees>; formulaSnapshot: ReturnType<typeof buildEventPayoutFormulaSnapshot>; created: boolean }> {
  const existingResult = await client.query<Record<string, unknown>>(
    `SELECT *
     FROM payouts
     WHERE escrow_id = $1
       AND release_entry_id IS NOT NULL
     ORDER BY created_at ASC
     LIMIT 1`,
    [input.escrowId],
  );

  if (existingResult.rows[0]) {
    const existing = rowToPayout(existingResult.rows[0]);
    const existingEventId = existing.eventId;
    const existingOwnerUid = existing.ownerUid;
    const identityMatches =
      existing.ownerType === 'event_creator' &&
      existingOwnerUid === input.event.eventCreatorUid &&
      existingEventId === input.event.eventId &&
      existing.eventCreatorUid === input.event.eventCreatorUid &&
      existing.orderId === input.orderId &&
      existing.escrowId === input.escrowId &&
      existing.releaseEntryId === input.releaseEntryId &&
      existing.destinationAccountId === input.event.destinationAccountId;

    if (!identityMatches) {
      throw new Error('Existing payout for escrow does not match the event payout financial identity');
    }

    const storedSnapshot = existingResult.rows[0].formula_snapshot;
    const storedFormula = typeof storedSnapshot === 'string'
      ? (() => {
          try {
            const parsed = JSON.parse(storedSnapshot) as { formula?: ReturnType<typeof calculateEventPayoutFees> };
            return parsed.formula ?? null;
          } catch {
            return null;
          }
        })()
      : null;
    const existingFormula = storedFormula ?? calculateEventPayoutFees({
      eventId: input.event.eventId,
      grossAmount: input.grossAmount,
      currency: input.currency,
      payoutMethod: input.event.payoutMethod,
    });
    return {
      payout: existing,
      payoutFormula: existingFormula,
      formulaSnapshot: buildEventPayoutFormulaSnapshot(
        { eventId: input.event.eventId, grossAmount: input.grossAmount, currency: input.currency, payoutMethod: input.event.payoutMethod },
        existingFormula,
      ),
      created: false,
    };
  }

  const payoutFormula = calculateEventPayoutFees({
    eventId: input.event.eventId,
    grossAmount: input.grossAmount,
    currency: input.currency,
    payoutMethod: input.event.payoutMethod,
    processingFeeAmount: input.processingFeeAmount,
    reserveAmount: input.reserveAmount,
    manualAdjustmentAmount: input.manualAdjustmentAmount,
  });
  const formulaSnapshot = buildEventPayoutFormulaSnapshot(
    {
      eventId: input.event.eventId,
      grossAmount: input.grossAmount,
      currency: input.currency,
      payoutMethod: input.event.payoutMethod,
      processingFeeAmount: input.processingFeeAmount,
      reserveAmount: input.reserveAmount,
      manualAdjustmentAmount: input.manualAdjustmentAmount,
    },
    payoutFormula,
  );

  const now = input.requestedAt || new Date().toISOString();
  const payoutId = randomUUID();

  await client.query(
    `INSERT INTO payouts (
       id, seller_id, owner_type, owner_uid, event_id, event_creator_uid, order_id, escrow_id, release_entry_id,
       destination_account_id, amount, gross_amount, platform_fee_amount, processing_fee_amount,
       reserve_amount, reserve_cap_amount, manual_adjustment_amount, payout_fee_amount,
       seller_receives_amount, net_amount, formula_snapshot, currency, status, provider,
       provider_charge_id, requested_by, requested_at, raw_request, created_at, updated_at
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,
       'pending_settlement','paychangu',NULL,$23,$24,$25,$24,$24
     )
     ON CONFLICT (id) DO NOTHING`,
    [
      payoutId,
      input.event.eventCreatorUid,
      'event_creator',
      input.event.eventCreatorUid,
      Number(input.event.eventId),
      input.event.eventCreatorUid,
      input.orderId,
      input.escrowId,
      input.releaseEntryId,
      input.event.destinationAccountId,
      payoutFormula.sellerReceivesAmount,
      payoutFormula.grossAmount,
      payoutFormula.platformFeeAmount,
      payoutFormula.processingFeeAmount,
      payoutFormula.reserveAmount,
      payoutFormula.reserveCapAmount,
      payoutFormula.manualAdjustmentAmount,
      payoutFormula.payoutFeeAmount,
      payoutFormula.sellerReceivesAmount,
      payoutFormula.netAmount,
      JSON.stringify(formulaSnapshot),
      input.currency,
      input.requestedBy,
      now,
      JSON.stringify({
        scope: 'event',
        eventId: input.event.eventId,
        eventCreatorUid: input.event.eventCreatorUid,
        destinationAccountId: input.event.destinationAccountId,
        payoutMethod: input.event.payoutMethod,
        payoutFormula,
      }),
    ],
  );

  const createdResult = await client.query<Record<string, unknown>>(
    `SELECT *
     FROM payouts
     WHERE id = $1
     LIMIT 1`,
    [payoutId],
  );
  if (!createdResult.rows[0]) throw new Error('Failed to create event payout candidate');

  return {
    payout: rowToPayout(createdResult.rows[0]),
    payoutFormula,
    formulaSnapshot,
    created: true,
  };
}
