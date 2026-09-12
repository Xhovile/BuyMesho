import { getPaymentDb } from '../server/postgresCompat.js';

const DRY_RUN = process.env.DRY_RUN !== 'false';

function main(): void {
  const db = getPaymentDb();
  const candidates = db.prepare(`
    SELECT id, seller_uid, verification_status
    FROM seller_payout_accounts
    WHERE is_active = 1
      AND lower(coalesce(verification_status, '')) IN ('pending', 'unverified')
    ORDER BY created_at ASC
  `).all() as Array<{ id: string; seller_uid: string; verification_status: string | null }>;

  if (candidates.length === 0) {
    console.log('[payout-destination-migration] no active legacy destinations require migration');
    return;
  }

  console.log(`[payout-destination-migration] ${DRY_RUN ? 'dry run:' : 'migrating:'} ${candidates.length} active legacy destination(s)`);

  if (DRY_RUN) {
    for (const row of candidates) {
      console.log(`- ${row.id} seller=${row.seller_uid} status=${row.verification_status ?? 'unknown'}`);
    }
    console.log('[payout-destination-migration] set DRY_RUN=false to apply changes');
    return;
  }

  const now = new Date().toISOString();
  let migrated = 0;

  db.transaction(() => {
    for (const row of candidates) {
      db.prepare(`
        UPDATE seller_payout_accounts
        SET verification_status = 'verified',
            verification_attempts = 0,
            last_error = NULL,
            verified_at = ?,
            updated_at = ?
        WHERE id = ?
          AND is_active = 1
          AND lower(coalesce(verification_status, '')) IN ('pending', 'unverified')
      `).run(now, now, row.id);

      db.prepare(`
        INSERT INTO seller_payout_account_events
          (seller_uid, account_id, event_type, actor_type, actor_id, note, payload, created_at)
        VALUES (?, ?, 'destination_migrated_to_self_service', 'system', NULL, ?, ?, ?)
      `).run(
        row.seller_uid,
        row.id,
        'Legacy active payout destination migrated from the retired Admin approval workflow.',
        JSON.stringify({ previousVerificationStatus: row.verification_status ?? null }),
        now,
      );
      migrated += 1;
    }
  })();

  console.log(`[payout-destination-migration] migrated ${migrated} destination(s)`);
}

main();
