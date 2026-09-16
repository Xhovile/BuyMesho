# Phase 8 — Event Payment → Payout Integration

## Purpose

Phase 8 connects a successfully releasable event order to the event-specific payout destination and Phase 7 financial formula.

## Flow

```text
captured event order
        ↓
 escrow release
        ↓
 identify event from order items
        ↓
 validate single-event ownership
        ↓
 load event-bound payout destination
        ↓
 require destination active + verified + owned by event creator
        ↓
 calculate event payout fees
        ↓
 create payout candidate with event financial identity
        ↓
 mark order fulfilled
        ↓
 submit payout through existing PayChangu execution flow
```

## Event identity

The event payout candidate stores:

- `event_id`
- `event_creator_uid`
- `destination_account_id`
- the event formula snapshot

The payout uses the destination bound to the event, not the creator's current seller default destination.

## Safety rules

An event payout is rejected when:

- the order contains tickets for more than one event;
- the event does not exist or has no creator;
- the order owner does not match the event creator;
- the event has no bound destination;
- the bound destination is inactive or unverified;
- the destination belongs to another owner;
- a caller supplies a destination different from the event-bound destination.

Existing seller/listings escrow releases continue through the existing seller destination and payout formula path.

## Financial calculation

Event payouts reuse the Phase 7 server-side calculator. For example, at the current 3% platform commission, MK10,000 gross sales with an Airtel Money payout fee of MK180 result in MK9,520 creator net before any future processing fee, reserve, or manual adjustment.

The formula snapshot is persisted with the payout candidate so later policy changes do not rewrite the historical calculation.

## Provider submission

Phase 8 does not introduce a new provider execution engine. After the event payout candidate is committed, the existing payout execution service submits the same PayChangu payout flow used by the existing payout infrastructure.

Provider timing is intentionally described as immediate submission rather than guaranteed instant settlement; provider response and retry behavior remain authoritative.
