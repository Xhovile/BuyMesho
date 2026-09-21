# Payout Ownership Refactor

## Purpose

Make payout ownership explicit so seller payouts and event-creator payouts are represented as distinct financial ownership scopes.

## Authoritative identity

Every payout now has:

- `owner_type`: `seller` or `event_creator`
- `owner_uid`: UID of the financial owner
- `event_id`: set for event payouts
- `event_creator_uid`: retained for event financial identity
- `destination_account_id`: the exact payout destination selected when the payout was created

For seller payouts, `seller_id` remains populated for backwards compatibility with existing provider, audit, reconciliation, and seller-history code. `owner_type` and `owner_uid` are the authoritative ownership fields.

## Migration behavior

Existing payouts are backfilled:

- event payouts -> `event_creator` ownership using `event_creator_uid`
- seller payouts -> `seller` ownership using `seller_id`

A database trigger normalizes new and updated payout rows, and a check constraint prevents mismatched owner identities.

## Destination resolution

Payout execution resolves the destination by:

`destination_account_id + owner_type + owner_uid`

Seller payouts retain the existing current/default fallback behavior.

Event payouts never fall back to the creator's current/default destination. If their historical destination is unusable, the payout remains subject to normal hold/manual-recovery handling.

## Compatibility boundary

The PayChangu execution adapter and legacy payout/audit tables still expose seller-oriented fields. Those interfaces continue receiving the legacy `sellerId` compatibility value while the payout record itself carries the authoritative owner identity.

A later cleanup can migrate provider/audit APIs from `sellerId` to a generic owner identity once downstream consumers no longer require the legacy contract.
