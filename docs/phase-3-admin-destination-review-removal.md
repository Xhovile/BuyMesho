# Phase 3 — Remove Routine Admin Destination Review

## Objective

Remove the obsolete Admin payout-destination request/approval workflow now that sellers manage their own payout destinations.

## Changes in this phase

- Remove the Admin destination-request page from the frontend.
- Remove the destination-request page from router rendering.
- Remove the destination-request item from the Admin workspace navigation.
- Remove the destination-request card from the Admin overview.
- Remove the Admin API that listed payout-destination requests.
- Remove the Admin API that approved/rejected payout destinations.
- Keep the normal Admin payout workspace available for payout monitoring and exception handling.
- Keep payout-destination encryption, masking, ownership checks, duplicate protection, and audit events.

## New Admin role

Admin is no longer part of normal payout-destination setup.

Admin remains responsible for exceptional operational controls such as payout investigation, seller payout suspension, payout retry/override handling where permitted, and other existing administrative controls.

## Compatibility

The old destination-review route is removed from the application router. Existing verified destinations continue to function. Existing destination history remains stored; removing the request UI does not delete payout-account records or their audit history.

## Security invariant

Removing Admin approval must never make a destination usable merely because a client claims it is verified. Server-side seller ownership and payout eligibility checks remain authoritative.

## Next phase

Phase 4 will align seller-facing destination and payout messaging with the new self-managed workflow and remove remaining copy or state labels that imply routine Admin approval.
