import { getPaymentDb } from '../../postgresCompat.js';

export type EventPayoutDestination = {
  id: string;
  eventId: number;
  creatorUid: string;
  destinationType: 'mobile_money' | 'bank';
  providerName: string;
  providerRefId: string | null;
  currency: string;
  accountName: string;
  maskedAccount: string;
  verificationStatus: string;
  isActive: boolean;
};

export function findEventPayoutDestination(
  eventId: number,
): EventPayoutDestination | undefined {
  const db = getPaymentDb();
  return db.prepare(
    `SELECT
       e.payout_destination_id AS id,
       e.id AS event_id,
       e.creator_uid AS creator_uid,
       d.destination_type,
       d.provider_name,
       d.provider_ref_id,
       d.currency,
       d.account_name,
       d.masked_account,
       d.verification_status,
       d.is_active
     FROM events e
     JOIN seller_payout_accounts d
       ON d.id = e.payout_destination_id
     WHERE e.id = ?
       AND e.payout_destination_id IS NOT NULL
     LIMIT 1`,
  ).get(eventId) as EventPayoutDestination | undefined;
}

export function validateEventPayoutDestinationBinding(
  creatorUid: string,
  destinationId: string,
): boolean {
  const db = getPaymentDb();
  const row = db.prepare(
    `SELECT 1
     FROM seller_payout_accounts
     WHERE id = ?
       AND owner_type = 'event_creator'
       AND owner_uid = ?
       AND event_creator_uid = ?
       AND is_active = 1
       AND verification_status = 'verified'
     LIMIT 1`,
  ).get(destinationId, creatorUid, creatorUid) as { '?column?': number } | undefined;

  return Boolean(row);
}

export function bindEventPayoutDestination(
  eventId: number,
  creatorUid: string,
  destinationId: string,
): EventPayoutDestination {
  const db = getPaymentDb();
  const existingEvent = db.prepare(
    `SELECT id, creator_uid
     FROM events
     WHERE id = ?
       AND deleted_at IS NULL
     LIMIT 1`,
  ).get(eventId) as { id: number; creator_uid: string } | undefined;

  if (!existingEvent) throw new Error('Event not found');
  if (existingEvent.creator_uid !== creatorUid) {
    throw new Error('Only the event creator can bind a payout destination');
  }
  if (!validateEventPayoutDestinationBinding(creatorUid, destinationId)) {
    throw new Error('Payout destination must belong to the event creator and be active and verified');
  }

  db.prepare(
    `UPDATE events
     SET payout_destination_id = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?
       AND creator_uid = ?`,
  ).run(destinationId, eventId, creatorUid);

  const bound = findEventPayoutDestination(eventId);
  if (!bound) throw new Error('Failed to bind event payout destination');
  return bound;
}
