# Phase 2 — Event Payout Destination Ownership

## Objective

Generalize the existing `seller_payout_accounts` storage so event creators can use the same payout-destination security and audit machinery without introducing a second payout-destination subsystem.

## Design

The existing destination table remains the canonical storage location.

- Seller destinations continue to use `seller_uid`.
- Event-creator destinations use `event_creator_uid`.
- `owner_type` and `owner_uid` provide a generic ownership identity for the shared destination layer.
- Exactly one owner identity is permitted for each destination.
- Existing seller rows are backfilled as `owner_type = 'seller'` and `owner_uid = seller_uid`.

This keeps Listings payout queries and payout execution seller-compatible while preparing the destination layer for event-specific binding in the next phase.

## Security invariants

1. Seller destinations remain owned by the seller and continue to use the existing seller authorization path.
2. Event-creator destinations must be owned by an existing `event_creators.uid`.
3. Full bank/mobile values remain in the existing encrypted columns.
4. Masking, destination fingerprints, active state, verification state, and replacement history remain part of the shared destination record.
5. No public event field stores raw payout credentials.
6. Audit rows use the same destination-event history structure and are generalized to support event-creator ownership.
7. Existing payout rows retain `destination_account_id`; this phase does not change payout-history semantics.

## Compatibility rule

The seller/Listings path is intentionally not rewritten in this phase. Existing seller destination queries continue to filter by `seller_uid`, so adding event-creator ownership does not make event destinations appear in seller payout settings.

## Deferred to Phase 3+

- binding an event to a selected destination;
- event creation payout setup UI;
- event-specific destination selection rules;
- first-sale destination locking;
- event linkage on `payouts`;
- event payout execution/timing.
