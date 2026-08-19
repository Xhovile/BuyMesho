# Account deletion and event ownership integrity

BuyMesho account deletion is intentionally destructive and is protected by two client-side countdowns: a five-second safety delay before final confirmation and a three-second final deletion countdown.

The backend treats event creator data as owned account data. Account deletion removes event activity, events, event creator applications, and the event creator record in the same database transaction as the other account-owned marketplace records.

The database also enforces `events.creator_uid -> event_creators.uid` with `ON DELETE CASCADE`. Historical orphan events are removed before the constraint is applied. This prevents an event from remaining when its owner record disappears unexpectedly.

Public and creator-facing event routes continue to operate against the event table, while the ownership invariant guarantees that persisted event rows have a valid creator. The migration is idempotent and safe to run repeatedly.
