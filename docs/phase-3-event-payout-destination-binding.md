# Phase 3 — Event Payout Destination Binding

## Objective

Give each event an explicit payout-destination binding using the shared payout-destination system established in Phase 2.

## Data model

`events.payout_destination_id` references the existing `seller_payout_accounts.id` record.

The relationship is intentionally one-way from the event to the destination:

```text
Event A ─────> Payout Destination A
Event B ─────> Payout Destination B
Event C ─────> Payout Destination C
```

The same physical payout destination may be reused by multiple events, but each event must store its own explicit binding.

## Binding rules

A non-null event payout destination must:

1. exist;
2. have `owner_type = 'event_creator'`;
3. have `owner_uid = events.creator_uid`;
4. have `event_creator_uid = events.creator_uid`;
5. be active; and
6. be verified/payout-eligible.

The database enforces these rules through the event payout-destination validation trigger. This prevents an event from being attached to another creator's destination even if a caller bypasses application-level checks.

## Legacy compatibility

`payout_destination_id` is nullable during this phase so existing events can continue to exist while the event-creation flow is upgraded in Phase 4.

Phase 4 will require a valid destination for newly created ticket-selling events before publication/creation is completed.

## Deletion behavior

The foreign key uses `ON DELETE RESTRICT` so a destination cannot be deleted while an event still references it. This prevents an active/historical event binding from silently disappearing.

Destination replacement therefore remains a new-destination operation with explicit history rather than destructive reassignment.

## Security

No raw bank or mobile-money values are added to the `events` table. The event stores only the opaque payout-destination record id; the destination record continues to use the shared encryption, masking, verification, and audit mechanisms.

## Not included

- event creation payout setup UI;
- automatic destination creation from the event form;
- first-sale destination locking;
- event linkage on payout rows;
- event payout execution or immediate payout timing;
- refunds.
