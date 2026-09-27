# Phase 8 — Event Payment → Payout Integration

## Purpose

Event ticket sales settle directly after successful payment verification. Events use the existing BuyMesho payout execution engine and do not enter the Listings escrow/release lifecycle.

## Flow

```text
successful payment capture
        ↓
record payment as captured + order as paid
        ↓
identify event from order items
        ↓
load event-bound payout destination
        ↓
calculate payout from ticket subtotal only
        ↓
create event payout candidate (no escrow/release)
        ↓
commit payout transaction
        ↓
submit immediately through the shared PayChangu payout engine
        ↓
reuse the existing 48-hour payout retry window
```

## Event identity

The event payout candidate stores:

- `event_id`
- `event_creator_uid`
- `destination_account_id`
- the event formula snapshot
- no `escrow_id` or `release_entry_id`

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

Existing seller/listings payout and escrow behavior remains unchanged. Seller-only payout pages and seller payout history do not include event-creator payouts.

## Financial calculation

Event payout gross is the event ticket subtotal, not the buyer's final checkout charge. Any PayChangu checkout/customer fee included in the order total is not treated as event gross for BuyMesho commission or payout-fee calculation.

Event payouts reuse the Phase 7 server-side calculator. For example, with MK10,000 in ticket sales and an Airtel Money payout fee of MK180, the 3% BuyMesho platform fee is MK300 and creator net is MK9,520 before any future processing fee, reserve, or manual adjustment.

The formula snapshot is persisted with the payout candidate so later policy changes do not rewrite the historical calculation.

## Provider submission

Phase 8 does not introduce a new provider execution engine. After the event payout candidate is committed, the existing payout execution service submits the same PayChangu payout flow used by the existing payout infrastructure.

Provider timing is intentionally described as immediate submission rather than guaranteed instant settlement; provider response and retry behavior remain authoritative.
