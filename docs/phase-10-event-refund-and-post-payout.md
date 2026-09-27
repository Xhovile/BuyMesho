# Phase 10 — Event Refund & Post-Payout Handling

## Purpose

Define a safe refund path for event tickets when event payouts are direct and escrow-free.

## Provider boundary

The current PayChangu refund adapter does not execute provider refunds. BuyMesho therefore never marks an event refund as financially completed merely because an admin approved it.

## Refund states

Event refund requests use the canonical refund workflow and move to "owed" after approval when the money still requires recovery.

    requested
       ↓
    under_review
       ↓
    approved
       ↓
    owed
       ↓
    refunded

"Owed" represents a durable creator-side liability. The liability records the event, creator, order, optional ticket, payout identity, amount, currency, and recovery state.

## Payout interaction

- If the event payout is still cancellable, the payout is cancelled before the liability is created.
- A payout in "processing" or "pending" must be reconciled before the refund is approved.
- A payout already marked "paid" remains paid; the refund becomes a post-payout creator liability.
- Event refunds never reopen or modify an unrelated payout.

## Ticket accounting

A ticket-specific refund marks that ticket "Refunded". A full event-order refund marks all non-cancelled event tickets "Refunded" and closes the order as "refunded".

Terminal ticket states are preserved during later order re-projection.

## Recovery

Actual recovery is recorded separately through the Phase 11 admin recovery workflow or the existing seller/event-creator refund-confirmation workflow. A recovery transaction must exactly match the outstanding liability amount and include a transaction reference.

"refund_transactions" remains the historical transaction record; "event_refund_liabilities" remains the outstanding-obligation record.
