import { getPaymentDb } from "../../postgresCompat.js";

const TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS email_notification_deliveries (
    notification_type TEXT NOT NULL,
    dedupe_key TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at TEXT,
    PRIMARY KEY (notification_type, dedupe_key)
  );
`;

function ensureTable(): void {
  getPaymentDb().exec(TABLE_SQL);
}

export function claimEmailNotification(notificationType: string, dedupeKey: string): boolean {
  ensureTable();
  const result = getPaymentDb()
    .prepare(
      `INSERT INTO email_notification_deliveries (notification_type, dedupe_key, status)
       VALUES (?, ?, 'pending')
       ON CONFLICT (notification_type, dedupe_key) DO NOTHING`,
    )
    .run(notificationType, dedupeKey);
  return result.changes > 0;
}

export function markEmailNotificationSent(notificationType: string, dedupeKey: string): void {
  ensureTable();
  getPaymentDb()
    .prepare(
      `UPDATE email_notification_deliveries
       SET status = 'sent', sent_at = CURRENT_TIMESTAMP
       WHERE notification_type = ? AND dedupe_key = ?`,
    )
    .run(notificationType, dedupeKey);
}

export function releaseEmailNotification(notificationType: string, dedupeKey: string): void {
  ensureTable();
  getPaymentDb()
    .prepare(
      `DELETE FROM email_notification_deliveries
       WHERE notification_type = ? AND dedupe_key = ? AND status = 'pending'`,
    )
    .run(notificationType, dedupeKey);
}
