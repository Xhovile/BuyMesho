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

The seller/Listings route behavior is intentionally preserved. Event creators are added as a second owner type inside the same destination storage model.

## Security invariants

1. Seller destinations remain owned by the seller.
2. Event-creator destinations must reference an existing `event_creators.uid`.
3. Full bank/mobile values continue to use the existing encrypted columns.
4. Existing masking, fingerprinting, active-state, verification, and replacement logic remain shared.
5. Payout records continue to reference the destination identity used for that payout.
6. Destination audit records are generalized to support both owner types.

## Deferred to Phase 3+

- binding an event to a selected destination;
- event payout setup UI;
- first-successful-sale destination locking;
- event linkage on `payouts`;
- event payout execution and immediate payout timing.
