# Phase 5 — Event Payout Destination Locking

## Goal

Protect the payout destination of an event once money has successfully started flowing through that event.

## Lock point

The event payout destination becomes locked after the first successful ticket sale. The lock is recorded on the event with:

- `payout_destination_locked_at`
- `payout_destination_locked_by`
- `payout_destination_lock_reason`

The system recognizes successful event sales from the existing order model (`paid`, `in_escrow`, `fulfilled`, `closed`, or a populated `paid_at`) and event-ticket order items.

## Database enforcement

A database trigger protects `events.payout_destination_id`. Once an event has a successful sale, a normal event update cannot change, clear, or replace the payout destination.

The protection is database-level so it applies even if another application path bypasses the normal event UI.

Historical events with successful sales are backfilled into the locked state when the migration runs.

## Controlled replacement

A dedicated event payout protection route is available for an authenticated event creator:

- `GET /api/event-creator/events/:id/payout-destination`
- `POST /api/event-creator/events/:id/payout-destination/replace`

After-sale replacement requires:

1. the authenticated creator to own the event;
2. an active, verified destination owned by that creator;
3. an explicit `confirmAfterSale: true` acknowledgement; and
4. a replacement reason of at least 10 characters.

The replacement runs inside a transaction-local database override, so the ordinary event update path remains blocked. An `event_activity` audit record records the old destination, new destination, and reason.

## Before the first sale

The existing event payout setup flow remains usable. A creator can change the selected destination before the event has a successful ticket sale.

## Compatibility

Seller/Listings payout destinations are unaffected. No separate payout engine is introduced, and the event continues to reference an opaque destination ID rather than storing bank or mobile-money credentials directly.
