# Phase 7 — Event Commission & Fee Calculation

## Purpose

Phase 7 establishes the server-side financial formula for event payouts. It calculates the creator's net amount from event gross sales while keeping BuyMesho commission, payment-processing fees, reserves/adjustments, and payout-destination fees as distinct components.

## Formula

```text
creator net
= gross ticket sales
- BuyMesho platform commission
- processing fee
- reserve
- manual adjustment
- payout-destination fee
```

Amounts are rounded to whole MWK units by the existing money helper.

The current platform policy is the source of truth for the BuyMesho commission and payout-destination fee rates. The current policy uses a 3% platform fee. Processing fees are explicit inputs to the event calculator; the current policy does not invent a provider processing fee when none is supplied.

## Example

For MK10,000 gross sales with the current 3% platform commission and no processing or payout fee:

```text
Gross sales       MK10,000
Commission            MK300
Processing fee           MK0
Payout fee              MK0
Creator net         MK9,700
```

A future provider-confirmed processing fee can be supplied as an explicit amount without changing the commission formula.

## Immutable formula snapshot

`buildEventPayoutFormulaSnapshot()` records the event ID, formula version, calculation inputs, policy values used, and resulting amounts. The snapshot is intended to be stored on the payout record when event payouts are created in Phase 8.

The formula version is currently `event-payout-v1`.

## Scope boundaries

Phase 7 does not create or execute provider payouts, decide refund mechanics, or introduce event reporting. Those remain later phases.

Existing seller/listings payout calculations remain unchanged. The event calculator is a separate server-side contract that reuses the existing payout policy values where appropriate.
