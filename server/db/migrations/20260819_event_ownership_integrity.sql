-- Remove historical orphan events before enforcing ownership.
DELETE FROM event_activity
WHERE event_id IN (
  SELECT e.id
  FROM events e
  LEFT JOIN event_creators ec ON ec.uid = e.creator_uid
  WHERE e.creator_uid IS NULL OR ec.uid IS NULL
);

DELETE FROM events
WHERE creator_uid IS NULL
   OR NOT EXISTS (
     SELECT 1
     FROM event_creators ec
     WHERE ec.uid = events.creator_uid
   );

ALTER TABLE events
  ALTER COLUMN creator_uid SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_events_creator_uid'
      AND conrelid = 'events'::regclass
  ) THEN
    ALTER TABLE events
      ADD CONSTRAINT fk_events_creator_uid
      FOREIGN KEY (creator_uid)
      REFERENCES event_creators(uid)
      ON DELETE CASCADE;
  END IF;
END
$$;
