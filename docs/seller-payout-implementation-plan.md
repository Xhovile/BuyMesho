# Seller payout implementation plan

_Last reviewed: 2026-05-15_

## Current state in BuyMesho

Buyer payments are already represented in the local payment and escrow flow:

1. PayChangu checkout/webhook verification updates the payment row to `captured`.
2. The matching order is confirmed and moved into `in_escrow`.
3. An escrow record is created with state `funded` and a credit ledger entry for the paid amount.
4. Buyer release currently changes the escrow state to `released` and the order status to `fulfilled`.

The missing piece is that releasing escrow does **not** yet move money to a seller destination. The existing payout code only inserts a local `payouts` row with status `processing`; it does not call PayChangu, store seller payout destinations, verify payout webhooks, or reconcile PayChangu payout status.


## PayChangu source links

These PayChangu docs should stay linked in this plan because they define the payout capabilities and operational constraints that the backend implementation depends on:

- [Disbursements introduction](https://developer.paychangu.com/docs/introduction-2): PayChangu describes transfers/payouts from the available balance to bank accounts and mobile money wallets, including core fields such as `amount`, `currency`, destination identifiers, recipient account details, and a unique `charge_id`.
- [Mobile Money Payout API](https://developer.paychangu.com/reference/mobile-money-payout): documents the mobile money payout endpoint (`POST /mobile-money/payouts/initialize`) and required fields such as `mobile`, `mobile_money_operator_ref_id`, `amount`, and unique `charge_id`.
- [Bank Account payout guide](https://developer.paychangu.com/docs/bank-account): documents bank payout setup, KYC/feature activation prerequisites, sample `POST /direct-charge/payouts/initialize` payloads, and transfer status verification through the status endpoint or webhooks.
- [Wallet balance guide](https://developer.paychangu.com/docs/balance): documents `GET /wallet-balance?currency=MWK` and the distinction between `collection_balance` and `main_balance`, which matters because payouts are made from funds available to transfer out.


## Important pre-merge notes

Before implementing payouts from this plan, resolve these product and safety details:

1. **Escrow release authorization must be tightened.** The current release route uses general order access, which allows either the buyer, seller, or an admin to access an order. Escrow release should be limited to the buyer or an admin/resolution workflow, not the seller who will receive the payout.
2. **Escrow release must be an accounting event, not just a status flip.** A payout-safe release should append a ledger entry, compute the seller net amount, and create exactly one payout candidate for the escrow. The existing repository method only updates escrow state.
3. **Separate escrow idempotency from provider-attempt idempotency.** Keep one payout candidate per escrow release (for example unique on `escrow_id`), but generate a new PayChangu `charge_id` for every provider retry attempt so retries after destination-detail corrections (like fixing a wrong account/mobile) are not deduplicated.
4. **Define the money formula before launch.** Decide whether seller payout amount is gross order total, subtotal, or net of BuyMesho commission, PayChangu fees, refund adjustments, delivery fees, and dispute adjustments.
5. **Plan for payout failure after escrow release.** A failed bank/mobile-money transfer should not silently reopen buyer escrow. It should create a seller/admin remediation state where the destination can be corrected and the payout retried with a new provider attempt while retaining audit history.
6. **Plan for provider reversals/chargebacks.** If PayChangu later reverses a payment after payout, BuyMesho needs an operational policy: reserve balance, negative seller balance, account hold, or manual recovery.
7. **Keep payout details private and encrypted.** Seller payout destinations should not be stored on the public `sellers` profile record and should not be returned from normal seller/profile APIs. Store only masked values for display.
8. **Confirm PayChangu balance settlement timing.** PayChangu documents collection and main balances separately, so verify whether collected checkout money becomes payout-eligible automatically, after a delay, or only after a PayChangu-side/internal transfer.
9. **Decide whether orders can span multiple sellers.** The current order model has a single `seller_id`; if a cart can contain items from multiple sellers, checkout must split into seller-specific orders/escrows/payouts before seller payouts are safe.
10. **Add audit and notifications.** Every payout status transition should have an audit trail, and sellers should receive clear UI/email/in-app messages for setup required, payout queued, payout sent, payout paid, and payout failed.

## How the seller should receive money

There are two viable PayChangu-supported settlement models.

### Option A — Platform escrow account, then PayChangu payout API

This matches the current BuyMesho architecture.

- Buyer pays into the BuyMesho PayChangu merchant account.
- The app treats the money as held in BuyMesho escrow while the order is active.
- After buyer release/admin resolution, BuyMesho creates a payout from the PayChangu available/main balance to the seller's registered destination.
- The seller receives the money in a mobile money wallet or bank account.

[PayChangu supports transfers/payouts](https://developer.paychangu.com/docs/introduction-2) from the merchant available balance to bank accounts and mobile money wallets. Payout initiation generally needs amount, currency, bank/mobile-money identifier, account/mobile number, recipient account name, and a unique `charge_id`, with specific endpoint details for [mobile money payouts](https://developer.paychangu.com/reference/mobile-money-payout) and [bank account payouts](https://developer.paychangu.com/docs/bank-account). [PayChangu's wallet balance documentation](https://developer.paychangu.com/docs/balance) distinguishes collection balance from main balance; payouts can be made from the main balance, so BuyMesho should verify operationally whether collected checkout funds are available for payout immediately, after settlement, or after internal transfer by PayChangu.

Recommended for the current codebase: **Option A first**, because the order/escrow data model already assumes BuyMesho controls release timing.

### Option B — PayChangu Connect / seller-owned PayChangu accounts

PayChangu Connect lets sellers connect their own PayChangu accounts and receive funds in their PayChangu wallet, while BuyMesho can add commission. This reduces BuyMesho's direct handling of seller funds, but it changes onboarding: each seller must have/connect a PayChangu account and BuyMesho must store a Connect token.

This is probably a later upgrade unless the marketplace wants to avoid holding funds directly from the beginning.

## Backend work to implement for Option A

### 1. Seller payout destination storage

Add a `seller_payout_accounts` table, separate from the public `sellers` profile table, because payout details are sensitive and operationally different from profile data.

Suggested fields:

- `id`
- `seller_uid`
- `destination_type`: `mobile_money` or `bank`
- `currency`: initially `MWK`
- `provider_name`: Airtel Money, TNM Mpamba, National Bank, etc.
- `provider_ref_id` / `bank_uuid`: PayChangu operator or bank identifier
- `account_name`
- `account_number_encrypted` or `mobile_encrypted`
- `masked_account`: for UI display only
- `is_default`
- `verification_status`: `pending`, `verified`, `failed`, `disabled`
- timestamps

Do not store full mobile/bank details in plaintext if this will be used in production.

### 2. PayChangu payout provider module

Add a server-only PayChangu payout client that can:

- list supported banks/mobile money operators,
- check wallet balance before payout,
- initialize mobile money payouts,
- initialize bank payouts,
- fetch payout/transfer status,
- parse and verify payout webhooks if PayChangu sends payout status events.

BuyMesho's server-side PayChangu integration should generate a unique idempotent `charge_id` per provider attempt, not per payout row. Keep payout-level idempotency inside BuyMesho (one payout per escrow release), and create a new provider attempt identity for each retry (for example `BM-PO-{payoutId}-A{attemptNo}` or a dedicated `payout_attempt_id`).

### 3. Real payout lifecycle table

Expand the local `payouts` table beyond the current minimal columns.

Suggested statuses:

- `eligible`: escrow released, ready to pay
- `queued`: payout requested by seller/admin or auto-release job
- `processing`: request sent to PayChangu
- `pending`: PayChangu accepted request but final transfer is not complete
- `paid`: PayChangu confirms completion
- `failed`: PayChangu rejected/failed transfer
- `cancelled`: payout stopped before sending

Suggested additional fields:

- `destination_account_id`
- `provider`
- `provider_charge_id`
- `provider_ref_id`
- `provider_transaction_id`
- `provider_status`
- `failure_reason`
- `requested_by`
- `approved_by`
- `requested_at`, `sent_at`, `paid_at`, `failed_at`
- `raw_response`

To support retries cleanly, also track provider attempts (either in a `payout_attempts` table or equivalent attempt columns/history) so each retry stores its own `provider_charge_id`, request payload, response, status, and timestamps.

### 4. Release escrow should create a payable payout, not just flip state

When escrow is released:

1. Lock or transactionally load order + escrow + seller payout destination.
2. Validate order belongs to the seller and escrow is funded/held/disputed-resolved.
3. Compute seller net amount: order total minus BuyMesho commission/payment fees/refunds/adjustments.
4. Mark escrow `released` and append a ledger `release` entry.
5. Create a payout row with `queued` or `eligible` status.
6. Either auto-submit it to PayChangu or require admin approval/manual seller withdrawal.

Important: use idempotency so repeated release clicks/webhook retries do not create duplicate payout candidates, while payout retries to PayChangu always use a new provider attempt `charge_id`.

### 5. Payout reconciliation

Implement at least one of:

- payout status webhooks from PayChangu,
- scheduled polling of PayChangu transfer status,
- manual admin reconciliation screen.

On confirmed success, mark payout `paid`. On failure, keep escrow/order visible as released but payout failed, and let admins retry to a corrected payout destination.

### 6. Admin controls

Admins need tools to:

- view all released escrows waiting for payout,
- approve or retry payouts,
- see PayChangu provider references and errors,
- manually mark a payout paid only with an audit note,
- suspend payouts for a seller with suspicious/disputed orders.

## Seller UI work

### 1. Payout setup/onboarding

Add a seller payout setup screen/modal under seller settings or My Listings:

- Choose payout method: mobile money or bank.
- For mobile money: choose operator, enter mobile number, account holder name.
- For bank: choose bank, enter account number and account name.
- Show masked destination after saving.
- Show verification status and last updated date.

### 2. Seller earnings dashboard

Extend the seller dashboard to include money states:

- lifetime sales,
- currently in escrow,
- available for payout,
- pending payout,
- paid out,
- failed payout requiring action.

### 3. Order-level seller view

Sellers should see each paid order with:

- payment captured,
- escrow state,
- release eligibility,
- payout status,
- estimated payout date,
- payout destination mask.

### 4. Withdraw or automatic payout UX

Choose one product policy:

- Automatic payout after escrow release: simplest for sellers, more backend responsibility.
- Seller-requested withdrawal: gives sellers control and lets you batch payouts, but adds a withdrawal request UI.
- Admin-approved payout: safest during beta, slower for sellers.

For launch, a practical approach is **admin-approved automatic queue**: release creates a queued payout, admins send it to PayChangu, and sellers can see status.

## Recommended launch sequence

1. Add payout destination collection for sellers.
2. Add payout tables/statuses and backend provider client.
3. Change escrow release to create exactly one payout candidate.
4. Build admin payout queue and manual retry.
5. Add seller earnings/payout status UI.
6. Add PayChangu payout webhooks or scheduled polling.
7. Later evaluate PayChangu Connect if BuyMesho wants seller-owned PayChangu wallets and automatic commission splitting.
