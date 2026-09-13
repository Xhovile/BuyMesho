# Phase 1 — Seller Payout Destination Workflow

## Objective

Remove routine Admin approval as a prerequisite for a seller to use their own payout destination, while preserving automated verification, payout eligibility controls, auditability, and Admin exception handling.

## Current workflow observed in BuyMesho

The current implementation creates new seller payout destinations with `verification_status = 'pending'`. A dedicated Admin verification endpoint/UI can then move a destination through verification. Payout logic also reads destination verification state when determining destination eligibility.

## Relevant surfaces

- `server/routes/escrow/payoutRoutes.helpers.destinations.ts`
- `server/modules/payments/payment.admin.payout.routes.ts`
- `server/modules/payments/payment.admin.payout.canonical.routes.ts`
- `src/AdminPayoutDestinationRequestsPage.tsx`
- `src/AdminPayoutDetailDrawer.tsx`
- `src/modules/payouts/api.ts`
- `src/pages/seller-payouts/useSellerPayoutsPage.ts`
- `src/pages/seller-payouts/SellerPayoutsPage.tsx`

## Target workflow

```text
Seller adds/edits destination
        |
        v
Automated/system verification
        |
   +----+----+
   |         |
verified   failed
   |         |
   v         v
Payout     Seller fixes/retries
eligible
```

Admin is removed from the normal path:

```text
Admin
  |
  +-- monitor
  +-- investigate
  +-- disable/freeze
  +-- exceptional/manual intervention
```

## State model

- `pending` — verification has not completed yet.
- `verified` — destination has passed required verification checks and is eligible for payout.
- `failed` — verification did not pass; seller can correct/retry where allowed.
- `disabled` — destination is unavailable for payout due to an operational, risk, or administrative action.

`verification_status` is a payout-safety state. It must not be treated as an Admin approval state.

## Invariants

1. Sellers can create and manage their own payout destinations without an Admin approval queue.
2. A destination must still satisfy the system's verification/eligibility requirements before receiving a payout.
3. Seller ownership checks remain mandatory on every destination mutation/read path.
4. Existing encryption of full account/mobile values remains unchanged.
5. Masked destination values remain the normal value exposed to UI surfaces.
6. Destination fingerprint/duplicate protection remains unchanged.
7. Audit events remain recorded for destination lifecycle changes.
8. Existing payouts already assigned to a destination must not be silently redirected by an unrelated destination edit.
9. Admin intervention remains available for exceptional cases but is not required for routine destination setup.
10. Existing verified destinations continue to behave as before.

## Migration behavior

- Existing `verified` destinations remain verified.
- Existing `pending` destinations must not become payout-eligible merely because the Admin queue is removed; they require the new automated verification path or an explicit migration decision in a later phase.
- Existing `failed`/disabled destinations retain their safety state.
- Historical Admin approval/verification audit records are preserved.

## Out of scope for Phase 1

- Changing payout fee calculations.
- Changing escrow release rules.
- Changing PayChangu provider integration semantics.
- Changing encryption/masking/fingerprint protections.
- Removing Admin access to destination records entirely.
- Automatically marking unverified destinations as verified without verification.

## Phase 2 dependency

Phase 2 will implement the backend state-transition changes required to make the target workflow executable. Phase 1 intentionally documents the contract before changing runtime behavior.
