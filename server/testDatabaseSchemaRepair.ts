import { postgresDb } from './postgresCompat.js';

export function repairPaymentWebhookTestSchema(): void {
  const table = postgresDb
    .prepare(
      `SELECT 1 AS present
       FROM information_schema.tables
       WHERE table_schema = current_schema()
         AND table_name = 'payment_webhook_events'
       LIMIT 1`,
    )
    .get() as { present?: number } | undefined;

  if (!table?.present) return;

  postgresDb.exec(`
    CREATE SEQUENCE IF NOT EXISTS payment_webhook_events_id_seq;

    SELECT setval(
      'payment_webhook_events_id_seq',
      GREATEST(COALESCE((SELECT MAX(id) FROM payment_webhook_events), 0) + 1, 1),
      false
    );

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'payment_webhook_events'
          AND column_name = 'id'
          AND is_identity = 'YES'
      ) THEN
        ALTER TABLE payment_webhook_events
          ALTER COLUMN id SET DEFAULT nextval('payment_webhook_events_id_seq');
      END IF;
    END
    $$;

    ALTER TABLE payment_webhook_events
      ADD COLUMN IF NOT EXISTS event_id TEXT;

    ALTER TABLE payment_webhook_events
      ALTER COLUMN event_id SET DEFAULT (
        'internal:' || md5(random()::text || clock_timestamp()::text)
      );
  `);
}
