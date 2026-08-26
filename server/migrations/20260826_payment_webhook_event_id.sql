ALTER TABLE payment_webhook_events
  ADD COLUMN IF NOT EXISTS event_id TEXT;

UPDATE payment_webhook_events
SET event_id = 'internal:' || md5(id::text || COALESCE(provider, '') || COALESCE(created_at::text, ''))
WHERE event_id IS NULL;

ALTER TABLE payment_webhook_events
  ALTER COLUMN event_id SET DEFAULT ('internal:' || md5(random()::text || clock_timestamp()::text));

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_webhook_events_provider_event_id
  ON payment_webhook_events(provider, event_id);