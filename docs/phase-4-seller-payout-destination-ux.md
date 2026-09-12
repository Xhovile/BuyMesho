# Phase 4 — Seller Payout Destination UX

## Objective

Make the seller-facing payout destination workflow clearly self-service after routine Admin destination approval has been removed.

## Changes

- Removed the stale `admin_payout_destinations` location mapping from `src/lib/appNavigation.query.ts`.
- Updated `PayoutDestinationForm` to state that sellers manage their own payout destinations and that no Admin approval is required to save or replace one.
- Updated `PayoutDestinationCard` to identify destinations as seller-managed and to avoid presenting the `verifiedAt` timestamp as a human approval event by displaying it as `Ready since`.
- Preserved the existing payout status language for actual payout operations. A payout may still be held, reviewed, or otherwise controlled operationally; this is separate from destination setup.

## Safety boundary

This phase does not remove ownership checks, encrypted storage, masking, payout routing validation, payout execution gates, or operational Admin controls.

It also does not change the separate seller withdrawal launch-mode rule that can place payout requests into an Admin review queue. That workflow is distinct from payout destination management.

## Result

A seller adding, replacing, or managing a payout destination is no longer presented with a routine Admin-approval dependency. The UI describes the destination as seller-managed and ready for payout once required routing details are valid.
