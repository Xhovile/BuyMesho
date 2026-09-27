# Phase 11 — Event Payout Admin Controls & Recovery

## Purpose

Give administrators explicit controls for event payouts and event refund liabilities without exposing seller-only payout controls to event creators.

## Event payout controls

The admin event payout workspace exposes:

- event payout listing and detail;
- provider-status reconciliation;
- retry for failed/non-terminal event payouts;
- controlled hold;
- controlled cancellation.

The existing seller payout routes continue to reject event-owner payouts.

## Refund liability recovery

Administrators can recover an event refund liability by recording:

- the refund transaction reference;
- refund method;
- refund date;
- amount;
- destination when applicable;
- an operational note;
- optional evidence references.

Recovery is idempotent by the outstanding liability and transaction reference.

## Audit requirements

Each recovery and payout intervention records an audit event and, where applicable, a "payout_events" entry. Financial records are not deleted or rewritten to hide earlier states.
