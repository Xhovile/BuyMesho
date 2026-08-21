-- Ensure webhook audit rows can be inserted without the legacy SQLite-style id argument.
ALTER TABLE payment_webhook_events
  ALTER COLUMN id SET DEFAULT md5(random()::text || clock_timestamp()::text);
