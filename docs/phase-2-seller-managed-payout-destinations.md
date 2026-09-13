# Phase 2 — Seller-Managed Payout Destinations

## Objective

Remove the routine Admin approval wait from seller payout destination setup and changes.

A seller who is authenticated and authorized to manage their own payout settings can add, edit, or replace a payout destination and use it immediately. Admin approval is no longer part of the normal destination-management path.

## Important security decision

BuyMesho does **not** claim to perform external account-ownership verification at this stage. The existing payout implementation plan states that PayChangu does not currently provide a reliable, documented pre-payout account-name verification response for every supported destination type. Therefore, BuyMesho must not manufacture an automated verification result that it cannot substantiate.

For this phase, `verification_status = 'verified'` is retained as the existing payout-eligibility flag, but seller-managed destination creation/update is the trusted activation event. The trust boundary is the authenticated seller's account and the server-side ownership check on the destination.

Provider-side ownership verification, where reliably supported and tested, remains a future hardening layer.

## Runtime change

The centralized destination persistence module now creates and changes seller payout destinations as immediately payout-eligible:

- new destinations are stored as `verified`, active, and available for payout;
- changed destinations are re-established as `verified` when their destination fingerprint changes;
- duplicate destination recovery also restores the destination to the immediately usable state;
- the existing encryption, masking, fingerprint, ownership, and audit mechanisms remain intact.

## Security invariants

1. A seller can only mutate destinations belonging to that seller.
2. Destination reads remain protected by payout-settings access checks.
3. Full bank/mobile values remain encrypted at rest.
4. Full destination values are not exposed through normal UI payloads; masked values remain the display representation.
5. Destination fingerprint uniqueness remains enforced.
6. An inactive destination remains ineligible for payout.
7. An explicitly failed/disabled destination can still be blocked by existing administrative or operational controls.
8. Escrow release rules and payout financial calculations are unchanged.
9. Admin payout overrides remain separate from destination ownership management.
10. The system must not silently redirect an existing payout to an unrelated destination edit.

## Migration behavior

- Existing verified destinations continue to work.
- Existing pending destinations are not globally mass-promoted by this phase.
- A seller editing/replacing a pending destination through the normal seller-owned path moves that destination into the seller-managed usable state.
- Existing Admin verification records and historical audit data are preserved.

## Explicitly removed from the normal path

```text
Seller adds destination
        |
        v
Admin destination-request queue
        |
        v
Admin approves
        |
        v
Payout eligible
```

Replaced with:

```text
Seller adds/edits destination
        |
        v
Server ownership check
        |
        v
Destination becomes active + payout eligible
```

## What Admin remains responsible for

Admin is not removed from payout controls. Admin remains an exception and risk-management layer for things such as payout holds, destination disabling, investigation, account suspension, and explicit payout overrides.

## Phase 3 dependency

Phase 3 should remove the now-obsolete normal-path Admin destination-request UI and adjust Admin-facing diagnostics so the Admin surface reports exceptions and operational states rather than routine destination approvals.
