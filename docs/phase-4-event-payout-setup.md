# Phase 4 — Event Creation Payout Setup

## Goal

Make payout destination setup part of the event creation workflow while reusing the existing payout destination storage, encryption, masking, verification state, and audit model.

## Event creator destinations

Event creators use the shared `seller_payout_accounts` table with `owner_type = 'event_creator'` and `event_creator_uid = <creator uid>`.

The event creator API exposes:

- `GET /api/event-creator/payout-destinations` — list destinations owned by the authenticated event creator.
- `POST /api/event-creator/payout-destinations` — create a bank or mobile-money destination using the existing payout normalization and encryption helpers.

Destination credentials are never stored on the `events` row. Account/mobile values are encrypted and only a masked display value is returned to the client.

## Event creation flow

The event creation screen now presents a **Payout details** section after the poster upload.

The creator can:

1. Select an existing active and verified destination.
2. Add a new destination without leaving event creation.
3. Continue with the selected destination attached to the event.

The browser sends the opaque `payout_destination_id` with the event payload.

## Paid-event requirement

When creating a new event with a ticket price greater than zero, the API requires a payout destination and verifies that it:

- belongs to the authenticated event creator;
- is active; and
- has `verification_status = 'verified'`.

Free events do not require a destination.

The database trigger from Phase 3 remains the final integrity boundary for event-to-destination ownership and eligibility.

## Destination creation

New event creator destinations reuse the existing payout crypto and normalization helpers. New records are initially stored with the same verified/active state used by the existing seller destination creation workflow, and a `destination_added` audit record is written with event-creator ownership.

No new payout engine or separate event payout account table was introduced.

## Editing and compatibility

Existing events may remain unbound so the migration does not break historical data. Destination locking after the first successful ticket sale is intentionally deferred to Phase 5.

Seller/Listings payout routes continue to use seller ownership and are not changed by this phase.

## Deferred work

- Phase 5: destination locking after first successful sale and controlled replacement.
- Phase 6: link payout records to the event as a financial identity.
- Phase 7: event commission and fee calculation.
- Phase 8: ticket payment to payout execution flow.
- Phase 9: event financial history and reporting.
- Phase 10: refunds and post-payout handling.
- Phase 11: admin recovery controls.
- Phase 12: full integration, migration, and production hardening.
