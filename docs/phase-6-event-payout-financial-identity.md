# Phase 6 — Event Payout Financial Identity

## Goal

Give every future event payout a permanent financial identity that records the event and event creator involved, while preserving the existing payout destination identity.

## Data model

The shared `payouts` table now supports:

- `event_id` — the specific event that generated the payout.
- `event_creator_uid` — the event creator associated with that event payout.
- `destination_account_id` — the exact payout destination record used by the event.

Existing seller payouts remain unchanged and may leave the new event fields null.

## Integrity rules

For an event payout:

1. `event_id` must reference a real event.
2. The event must have an event creator.
3. `event_creator_uid` must match the event creator.
4. A payout must retain a destination account.
5. The destination account must equal the event's currently bound payout destination.

These rules are enforced by a PostgreSQL trigger rather than relying only on application code.

## Historical identity

Payout records reference the destination record by ID. A later destination replacement creates a different destination record and does not rewrite historical payout rows.

The event binding and destination binding therefore remain explicit for every payout record.

## Compatibility

The change is additive. Existing seller payout routes, payout calculations, provider attempt handling, and seller payout destinations remain on their existing contract.

The event payout creation/execution path will populate these fields in Phase 8 after event commission and fee calculation is finalized in Phase 7.
