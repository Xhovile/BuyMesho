import { createHash } from "node:crypto";
import { postgresDb } from "../../db.js";
import { decryptSensitiveValue } from "../../routes/escrow/payoutRoutes.helpers.core.js";

const LEGACY_TO_CURRENT_OPERATOR_REF: Readonly<Record<string, string>> = {
  "e8d5fca0-e5ac-4714-a518-484be9011326": "20be6c20-adeb-4b5b-a7ba-0769820df4fb",
  "5e9946ae-76ed-43f5-ad59-63e09096006a": "27494cb5-ba9e-437f-a114-4e7a7686bcca",
};

function buildDestinationFingerprint(input: {
  ownerUid: string;
  destinationType: string;
  providerName: string;
  providerRefId: string | null;
  currency: string;
  targetValue: string;
}): string {
  return createHash("sha256")
    .update([
      input.ownerUid,
      input.destinationType,
      input.providerName.toLowerCase(),
      input.providerRefId?.toLowerCase() ?? "",
      input.currency.toUpperCase(),
      input.targetValue,
    ].join("|"))
    .digest("hex");
}

/**
 * Repairs event-creator mobile-money destinations that were created with
 * PayChangu bank UUIDs instead of the mobile-money operator ref_ids required
 * by the payout endpoint.
 *
 * If a correctly repaired/current destination already exists for the same
 * creator and wallet, the legacy row is left untouched and an audit record is
 * written. This avoids aborting application startup or invalidating an event
 * or payout that is already bound to the legacy row.
 */
export function ensureEventPayoutProviderRefMigration(): void {
  const legacyRefs = Object.keys(LEGACY_TO_CURRENT_OPERATOR_REF);

  postgresDb.transaction(() => {
    const rows = postgresDb.prepare(
      `SELECT id,
              event_creator_uid,
              owner_uid,
              destination_type,
              provider_name,
              provider_ref_id,
              currency,
              mobile_encrypted,
              destination_fingerprint
         FROM seller_payout_accounts
        WHERE owner_type = 'event_creator'
          AND destination_type = 'mobile_money'
          AND provider_ref_id IN (?, ?)
        FOR UPDATE`,
    ).all(...legacyRefs) as Array<{
      id: string;
      event_creator_uid: string | null;
      owner_uid: string | null;
      destination_type: string;
      provider_name: string;
      provider_ref_id: string | null;
      currency: string;
      mobile_encrypted: string | null;
      destination_fingerprint: string;
    }>;

    if (rows.length === 0) return;

    const update = postgresDb.prepare(
      `UPDATE seller_payout_accounts
          SET provider_ref_id = ?,
              destination_fingerprint = ?,
              updated_at = ?
        WHERE id = ?
          AND provider_ref_id = ?`,
    );
    const duplicateCheck = postgresDb.prepare(
      `SELECT id
         FROM seller_payout_accounts
        WHERE owner_type = 'event_creator'
          AND event_creator_uid = ?
          AND destination_fingerprint = ?
          AND id <> ?
        LIMIT 1`,
    );
    const audit = postgresDb.prepare(
      `INSERT INTO seller_payout_account_events
        (seller_uid, event_creator_uid, owner_type, owner_uid, account_id,
         event_type, actor_type, actor_id, note, payload, created_at)
       VALUES (NULL, ?, 'event_creator', ?, ?, ?, 'system', NULL, ?, ?, ?)`,
    );

    for (const row of rows) {
      const oldRef = row.provider_ref_id ?? "";
      const nextRef = LEGACY_TO_CURRENT_OPERATOR_REF[oldRef];
      if (!nextRef) continue;

      const ownerUid = row.owner_uid ?? row.event_creator_uid;
      if (!ownerUid) {
        throw new Error(`Cannot repair payout destination ${row.id}: event creator owner is missing`);
      }

      const targetValue = decryptSensitiveValue(row.mobile_encrypted);
      if (!targetValue) {
        throw new Error(`Cannot repair payout destination ${row.id}: mobile number could not be decrypted`);
      }

      const nextFingerprint = buildDestinationFingerprint({
        ownerUid,
        destinationType: row.destination_type,
        providerName: row.provider_name,
        providerRefId: nextRef,
        currency: row.currency,
        targetValue,
      });

      const duplicate = duplicateCheck.get(row.event_creator_uid, nextFingerprint, row.id) as { id?: string } | undefined;
      if (duplicate?.id) {
        const now = new Date().toISOString();
        audit.run(
          row.event_creator_uid,
          ownerUid,
          row.id,
          "destination_provider_ref_repair_skipped_collision",
          `Skipped PayChangu mobile-money provider-reference repair because destination ${duplicate.id} already uses the current provider identifier for the same creator/wallet.`,
          JSON.stringify({
            previousProviderRefId: oldRef,
            nextProviderRefId: nextRef,
            duplicateDestinationId: duplicate.id,
            skippedAt: now,
          }),
          now,
        );
        continue;
      }

      const now = new Date().toISOString();
      const result = update.run(nextRef, nextFingerprint, now, row.id, oldRef);
      if (Number(result.changes ?? 0) !== 1) {
        throw new Error(`Payout destination ${row.id} changed before the repair could be applied`);
      }

      audit.run(
        row.event_creator_uid,
        ownerUid,
        row.id,
        "destination_provider_ref_repaired",
        "Repaired PayChangu mobile-money operator identifier",
        JSON.stringify({
          previousProviderRefId: oldRef,
          nextProviderRefId: nextRef,
          repairedAt: now,
        }),
        now,
      );
    }
  })();
}
