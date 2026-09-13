# Phase 5 — Payout Destination Migration and Hardening

## Objective

Complete the transition to seller-managed payout destinations without leaving legacy destinations stuck behind the retired Admin approval workflow.

## Migration

`scripts/migrate-seller-payout-destinations.ts` is an idempotent migration for active legacy destinations whose status is `pending` or `unverified`.

- Default mode is **dry run**. Nothing is changed unless `DRY_RUN=false` is supplied.
- Migrated destinations become `verified`, reset verification attempts/errors, receive a `verified_at` timestamp, and remain active.
- Each migrated destination receives a `destination_migrated_to_self_service` audit event with the previous verification status.
- Inactive destinations are not changed.
- Running the migration again is safe because already-verified destinations are excluded.

Run the migration with:

```bash
npm run migrate:payout-destinations
```

Apply changes only after reviewing the dry-run output:

```bash
DRY_RUN=false npm run migrate:payout-destinations
```

## Regression coverage

`server/routes/escrow/__tests__/payout.destination-independence.test.ts` verifies that:

- a normal seller can create a payout destination without Admin approval;
- a newly created destination is active/default as requested and marked ready for payout;
- sensitive destination data remains masked in the API response;
- the seller action is recorded as a seller event; and
- a seller cannot edit another seller's payout destination.

Existing payout routing tests continue to cover incomplete provider routing data and cross-seller destination protection.

## Architecture guard

`scripts/check-payout-destination-independence.mjs` protects the new contract by checking that:

- obsolete Admin destination navigation/API surfaces stay removed;
- seller destination creation and ownership checks remain present;
- new/changed destinations remain immediately eligible under the seller-managed model;
- seller-facing copy does not regress to an Admin-approval dependency; and
- payout execution still contains the `destination_not_verified` safety gate.

## Scope boundary

This phase does **not** remove the separate Admin controls for operational payout actions, nor does it change the `admin_approved` launch-mode rule for seller withdrawal/retry requests. Destination setup and payout-operation approval remain distinct workflows.

## Validation gate

Before merging the branch, run the architecture guard, destination regression test, routing-guard suite, server type-check, and production build. CI must pass before the branch is merged into `main`.
