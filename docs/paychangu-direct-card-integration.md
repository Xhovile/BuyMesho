# BuyMesho PayChangu Direct Card integration

## Current branch scope

This branch adds the BuyMesho-owned durable adapter for the experimental Platform server entry point:

`@xhovile/platform/payments/direct-card/server`

It persists a pending payment and charge atomically, binds the order to one payment reference, tracks the Direct Card/3-D Secure lifecycle, checks verified amount and currency against the stored order, and delegates settlement to BuyMesho's existing `applyVerifiedPayChanguPayment` flow. That flow remains the single source for payment capture, escrow, event-ticket projection, and Connect settlement behavior.

The charge table deliberately has no raw card-number, PAN, CVV, or raw provider-response columns.

## Not enabled for buyers

This branch does not add a buyer-facing card form or mount a checkout route. New charge creation must remain disabled until PayChangu confirms the exact validate/authorization API contract and a reviewed authorization adapter exists. PayChangu's merchant PCI DSS eligibility and Direct Card account activation also require independent confirmation.

The Platform dependency is temporarily pinned to `feat/paychangu-direct-card-foundation` so this branch can build against the new package export. Once the Platform PR is merged, update BuyMesho's dependency and lockfile to `main` (or a released version) before merging this integration.

## Verification

The integration test uses the test database to assert:
- only the order's buyer can resolve the stored order;
- order claiming, payment creation and charge creation occur in one transaction;
- a second charge cannot claim the same order;
- successful verification uses BuyMesho's existing escrow settlement path;
- repeating settlement does not duplicate the escrow credit;
- no PAN/CVV/card-number column exists in the charge table.
