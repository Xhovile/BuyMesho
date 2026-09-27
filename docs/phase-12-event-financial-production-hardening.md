# Phase 12 — Event Financial Testing, Migration & Production Hardening

## Scope

Phase 12 consolidates the event financial path after direct payment-to-payout integration:

    PayChangu payment
    → paid event order
    → event payout
    → dispute/refund decision
    → refund liability or recovery
    → final audit history

## Hardening completed

- Event refund liabilities use an idempotent durable schema.
- Refund approval does not execute an unavailable PayChangu refund.
- Event payouts are blocked while a canonical dispute case is active.
- Payouts in provider "processing"/"pending" states require reconciliation before refund cancellation.
- Ticket "Refunded", "Cancelled", and "Blocked" terminal states survive later order projection.
- Seller payout retry/override endpoints remain seller-only.
- Event payout recovery is separated from seller payout controls.

## Testing

The integration suite includes event refund-liability creation, recovery, ticket-state preservation, and idempotency coverage through "test:event-refund-recovery".

The existing event payout integration tests remain part of the integration suite.

## Migration

"20260927_event_refund_liabilities.ts" creates the liability table, supporting indexes, and the "refund_requests.event_liability_id" linkage in an idempotent manner.

## Production rule

A provider-unavailable refund must remain explicitly outstanding until a real recovery transaction is recorded. No synthetic "paid"/"refunded" state is created solely from an administrative decision.
