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

  const idColumn = postgresDb
    .prepare(
      `SELECT data_type, is_identity
       FROM information_schema.columns
       WHERE table_schema = current_schema()
         AND table_name = 'payment_webhook_events'
         AND column_name = 'id'
       LIMIT 1`,
    )
    .get() as { data_type?: string; is_identity?: string } | undefined;

  if (!idColumn) return;

  postgresDb.exec(`CREATE SEQUENCE IF NOT EXISTS payment_webhook_events_id_seq;`);

  if (idColumn.is_identity !== 'YES') {
    if (idColumn.data_type === 'text' || idColumn.data_type === 'character varying') {
      postgresDb.exec(`
        SELECT setval(
          'payment_webhook_events_id_seq',
          GREATEST(
            COALESCE(
              (SELECT MAX(CASE WHEN id ~ '^[0-9]+$' THEN id::BIGINT ELSE 0 END)
               FROM payment_webhook_events),
              0::BIGINT
            ) + 1,
            1::BIGINT
          ),
          false
        );

        ALTER TABLE payment_webhook_events
          ALTER COLUMN id SET DEFAULT nextval('payment_webhook_events_id_seq')::text;
      `);
    } else {
      postgresDb.exec(`
        SELECT setval(
          'payment_webhook_events_id_seq',
          GREATEST(
            COALESCE((SELECT MAX(id)::BIGINT FROM payment_webhook_events), 0::BIGINT) + 1,
            1::BIGINT
          ),
          false
        );

        ALTER TABLE payment_webhook_events
          ALTER COLUMN id SET DEFAULT nextval('payment_webhook_events_id_seq');
      `);
    }
  }

  postgresDb.exec(`
    ALTER TABLE payment_webhook_events
      ADD COLUMN IF NOT EXISTS event_id TEXT;

    UPDATE payment_webhook_events
    SET event_id = 'internal:' || md5(id::text || COALESCE(provider, '') || COALESCE(created_at::text, ''))
    WHERE event_id IS NULL;

    ALTER TABLE payment_webhook_events
      ALTER COLUMN event_id SET DEFAULT (
        'internal:' || md5(random()::text || clock_timestamp()::text)
      );

    ALTER TABLE payment_webhook_events
      ALTER COLUMN event_id SET NOT NULL;
  `);
}
