# Phase 13 — Shared Seller Financial Ledger

## Canonical financial policy

BuyMesho protects the buyer for the full approved refundable gross amount.

Before payout, refunds are satisfied from the customer-payment/held-money path and no seller net payout is released.

After payout, the buyer remains entitled to the full approved refundable amount. BuyMesho does not reduce a buyer refund to the creator's or seller's net payout. The seller/event creator bears any amount that BuyMesho must recover or fund after payout.

Recovery order:

1. Consume the seller's accumulated payout reserve.
2. Carry the remaining amount into seller negative balance.
3. Reserve part of future seller payouts against that negative balance and net it before provider submission.
4. If the negative balance would reduce a payout below the provider minimum, hold the payout for review.
5. Admin may record an audited manual recovery credit against the seller debt.
6. Escrow is never rewound after a payout has settled.

Seller-paid external refunds are recorded as recovery evidence and do not debit the internal reserve a second time, because the seller has already funded that refund directly.

## Shared scope

The ledger is owner-based rather than product-specific. The owner may be a Listing seller or an Event creator. Both flow through the same financial account and ledger.

## Account state

Each owner/currency account has reserve balance, negative balance, reserved negative balance, payout hold, and payout hold reason. The ledger stores signed balance deltas and balance-after snapshots with an idempotency key.

## Example

For a MWK 10,000 Airtel payout:

- Gross refundable value: MWK 10,000
- Platform fee: MWK 300
- Airtel payout fee: MWK 180
- Creator net payout: MWK 9,520
- Full post-payout buyer refund: MWK 10,000

The post-payout exposure is therefore the amount BuyMesho still has to recover or fund after payout.

With no existing reserve and no other recovery, the MWK 480 difference becomes seller negative balance.

## Payout interaction

Before provider submission, the payout flow acquires the seller financial lock and reserves any applicable negative-balance netting. The provider receives the reduced effective payout amount.

A database trigger finalizes the reservation:

- paid clears the reserved debt and credits the payout reserve;
- failed or cancelled releases the reserved debt and restores the original seller payout amount for retry.

This makes status changes from payout service execution, reconciliation, webhooks, and admin overrides converge on the same accounting rule.

## Refund interaction

A post-payout Event refund liability is a gross buyer-refund obligation.

When an administrator records recovery for a liability whose payout is already paid, the shared ledger records a reversal debit, consuming reserve first and carrying the remainder as seller negative balance.

When a seller confirms an external refund, the ledger records external refund recovery without another reserve/debt debit.

Pre-payout recovery does not create seller debt merely because an administrator recorded the buyer refund: the creator has not yet received a payout to reverse.

## Administrative controls

Admin APIs provide account and ledger inspection, payout hold/hold release, and audited manual recovery credit.

Seller APIs provide read-only access to the owner's current financial account and ledger.

## Audit event types

- historical_reserve_seed
- payout_netting_reserved
- payout_settled
- payout_netting_released
- reversal_debit
- manual_recovery_credit
- external_refund_recovery
- payout_hold_set
- payout_hold_cleared

## Production boundary

The ledger is now the canonical balance model for future Listing and Event post-payout reversals. Provider-specific refund execution and chargeback ingestion should create ledger debits through the same interface rather than implementing separate financial rules.