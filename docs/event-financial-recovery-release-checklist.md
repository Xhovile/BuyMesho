# Event Financial Recovery — Release Checklist

Run this checklist in order for the Event Financial Recovery changes. Treat UI loading and real money movement as separate checks.

## 1. Production smoke test

- [ ] Confirm the deployment built from the intended commit is marked **Ready** before testing.
- [ ] Sign in with an authorized admin account and open `/admin` → **Event Recovery**.
- [ ] Confirm search, Refresh, status cards, empty states, and record details render on mobile and desktop.
- [ ] Verify that an unauthenticated request to admin APIs is rejected; do not expose real transaction data to a public smoke test.
- [ ] Capture any console errors or failed network requests before proceeding.

## 2. Real event/listing separation

Use existing records for one event-ticket order and one marketplace/listing order. This is read-only verification; do not create or alter a real payment just to test the screen.

- [ ] Event payment appears in Event Financial Recovery and not in generic **Admin Payments**.
- [ ] Event payout appears in Event Financial Recovery and not in generic **Admin Payouts**.
- [ ] Listing payment and seller payout remain visible in their generic admin workspaces and do not appear in event-finance results.
- [ ] Event search by event title/ID, buyer or creator identity, order ID, and ticket ID/code returns only relevant event records.
- [ ] Record the IDs used and the observed section/status for the release notes, without copying buyer personal data into the PR.

## 3. Recovery workflow

Run write actions only in a test/staging environment or against an explicitly approved recovery case.

- [ ] Open an event payment and confirm payment, order, buyer, ticket, creator, reference, webhook, and raw diagnostics are available.
- [ ] Open an event payout and confirm attempts, payout events, refund liabilities, and raw diagnostics are available.
- [ ] Verify reconciliation against a provider test/stub, and check that repeated reconciliation does not duplicate payout attempts or audit events.
- [ ] For a test liability in `due` state, record a recovery using the exact outstanding amount and a unique transaction ID.
- [ ] Confirm the liability changes to `recovered`, the refund transaction and payout audit event are written, and retrying the same transaction is handled idempotently.
- [ ] Confirm Hold and Cancel require a reason; never retry, hold, cancel, or record a refund against a production transaction merely to test a button.

## 4. Regression tests

- [ ] `npm run test:event-recovery-filters`
- [ ] `npm run test:event-payout`
- [ ] `npm run test:admin-ticket-search`
- [ ] `npm test` (CI test suite)
- [ ] `npm run build`
- [ ] Recheck that seller/listing finance and event finance remain isolated after the route cleanup.

## 5. Legacy payout route cleanup

- [ ] Keep `createPaymentAdminPayoutCanonicalRouter` as the registered GET owner for `/api/admin/payouts`, `/api/admin/payouts/summary`, and `/api/admin/payouts/detail/:payoutId`.
- [ ] Remove duplicate registrations for the old display/list/detail routers only after verifying their route paths are completely covered by the canonical router.
- [ ] Retain distinct admin adjustment/action/reconciliation endpoints in their dedicated routers.
- [ ] Search the repository for remaining imports and update any tests/docs affected by removing the duplicate handlers.
- [ ] Confirm routing and financial tests pass before merging.

## Verification record

Live production checks require an authorized admin session and access to the deployed project. Mark the production and real-record sections complete only after an operator has run them; automated CI passing is not a substitute for verifying real records or running an actual recovery workflow.
