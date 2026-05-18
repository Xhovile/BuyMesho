# BuyMesho Structure Completion Gate

This document defines the exact point at which the BuyMesho payout structure is complete enough for implementation.

Its purpose is to stop vague decisions, repeated redesign, and unsafe payment logic from leaking into code.

**Hard rule:** if any item in this file is still moving, implementation does not start.

See `docs/seller-payout-implementation-plan.md` for the implementation sequence that follows this gate.

## 1) Locked decisions

These decisions must be frozen before implementation starts.

### 1.1 Payout formula

`Seller Net Payout = Gross Collected Amount - Platform Fee - Payment Processing Fee - Refund Reserve - Chargeback Reserve - Manual Adjustments`

### 1.2 Platform fee

The platform fee is fixed at:

`2% of Gross Collected Amount`

### 1.3 Reserve cap

The reserve and adjustment protection layer is capped at:

`6% of Gross Collected Amount`

This cap may be split internally into refund reserve, chargeback reserve, and operational/manual hold logic.

### 1.4 Manual adjustments

Manual adjustments must never be silent.

They require:
- a reason
- an admin actor
- a timestamp
- a logged amount
- an audit trail

### 1.5 Seller and admin permissions

The permission model must be frozen before coding.

The system must explicitly define who can:
- view payout settings
- edit payout settings
- request withdrawal
- see payout history
- request or trigger payout retry
- approve override after review

Frontend visibility does **not** grant payout authority.

### 1.6 Failure and retry rules

The failure path must be deterministic.

The system must define:
- whether a failed payout is fixable by the seller
- whether a failed payout moves into admin review
- whether a retry is allowed
- whether retry requires a fresh provider charge ID
- whether fraud, disputes, or holds block automatic retry
- whether funds remain held after payout failure

Retry is for technical failure only. Fraud and dispute states do not auto-retry.

### 1.7 Eligibility gate

A payout may only be released when the payout eligibility gate is true.

At minimum, the gate must confirm:
- payment has been captured
- the order is eligible for release
- the seller has a verified payout destination
- the seller is not blocked by admin hold, fraud flag, or dispute state
- provider/balance conditions required for submission are satisfied

If the gate is false, the amount stays held even if the calculation is correct.

### 1.8 Validation rules

Before saving a payout destination, the backend must validate and normalize:
- country format
- mobile money operator or bank selection
- account or phone number format
- account-name matching rules, if any
- duplicate destination protection
- currency constraints

Validation must happen server-side. The frontend is only a convenience layer.

### 1.8.1 Launch payout floor

The minimum payout amount for launch is `1000` MWK.

### 1.9 Audit requirements

Every payout-related action must be logged for admins and support.

Required events:
- destination added
- destination updated
- destination replaced
- payout queued
- payout sent
- payout failed
- payout retried
- payout paid
- payout held
- payout released
- admin override
- payout adjusted

Audit records must include the actor, timestamp, and the relevant state change.

---

## 2) Seller backend requirements that must exist before this can be called complete

### 2.1 Seller payout destination lifecycle

The system must support:
- adding a payout destination
- editing a payout destination
- replacing a payout destination
- re-verification after changes
- keeping destination history for audit purposes

### 2.2 Seller-side authorization rules

The permission model must clearly define who can:
- view payout settings
- edit payout settings
- request withdrawal
- see payout history
- request or trigger payout retry
- approve override after review

### 2.3 Failure recovery flow

The seller experience and backend must show what happens when payout fails:
- whether the destination must be corrected
- whether the payout is pending admin review
- whether a retry is allowed
- whether funds are still safe and held
- whether the payout is permanently blocked

### 2.4 Validation and normalization

Before saving a payout destination, the backend must validate and normalize:
- country format
- mobile money operator or bank selection
- account or phone number format
- account-name matching rules, if any
- duplicate destination protection
- currency constraints

### 2.5 Balance and eligibility checks

The system must define the exact rule for:
- when a payout becomes eligible
- whether funds must already be available in the provider balance
- what happens when balance is insufficient at release time

### 2.6 Audit trail

Every payout-related action must be logged for admins and support.

Required events:
- destination added
- destination updated
- destination replaced
- payout queued
- payout sent
- payout failed
- payout retried
- payout paid
- payout held
- payout released
- admin override
- payout adjusted

### 2.7 Automated failure tests

The payout flow is not complete until the following cases are tested:
- duplicate release clicks
- duplicate webhook callbacks
- payout retry with a fresh provider charge ID
- seller cannot trigger own release
- payout failure after escrow release
- partial provider downtime
- payout adjustment recalculation

### 2.8 Commission and fee lock-in

The money formula must be locked before launch.

It must explicitly define:
- gross vs net payout
- commission deduction
- payment fee handling
- refunds
- delivery adjustments
- dispute deductions

---

## 3) Completion checklist

The structure is complete only when every item below is checked.

### Formula
- Gross collected amount is stored correctly — **partial** (gross is persisted on order/payment flows; payout snapshots are present but not enforced for every legacy payout row).
- Platform fee is fixed at 2% — **done** (`PAYOUT_POLICY.platformFeeBps = 200`).
- Payment processing fee is captured from the provider — **done** (provider-fee adjustments persist into payout recalculation snapshots and audit history).
- Reserve logic is defined and capped at 6% — **done** (`PAYOUT_POLICY.reserveCapBps = 600` and formula cap enforcement).
- Manual adjustments are explicit and logged — **done** (admin adjustment APIs, payout adjustment persistence, recalculation snapshots, and payout audit events implemented).
- Final seller net payout is calculated server-side — **done** (`calculatePayoutFormula` is server-side and used on release).

### Permissions
- Seller permissions are defined — **done** (`canViewPayoutSettings`, `canEditPayoutSettings`, `canRequestWithdrawal`, `canRequestPayoutRetry`).
- Admin permissions are defined — **done** (`canApprovePayoutOverride` and admin-gated routes).
- System permissions are defined — **done** (system actor is represented in payout events and formalized via `canExecuteSystemAction` policy function).
- Payment provider responsibilities are defined — **partial** (provider execution and status mapping exist, but provider SLA/error taxonomy ownership is not yet documented in-code).
- No frontend-only payout authority exists — **done** (all payout mutations are backend-authorized).

### Destination management
- Payout destination can be added — **done**.
- Payout destination can be edited — **done**.
- Payout destination can be replaced — **done**.
- Re-verification after destination change is defined — **done** (status resets to `pending` and verification attempts reset).
- Duplicate destination protection exists — **done** (destination fingerprint uniqueness checks).
- Destination history is retained — **partial** (events exist; long-term archival/retention policy is not yet defined).

### Eligibility and recovery
- Payment confirmation is required — **done** (eligibility gate checks order/payment-releasable state).
- Order completion is required — **partial** (release + payout flow enforces state checks, but legacy orders may bypass full lifecycle tags).
- Dispute window is enforced — **partial** (72-hour policy frozen; automatic elapsed-time enforcement is not fully wired in release automation).
- Seller verification is required — **done** (verified active payout destination required).
- Admin holds block payout — **done** (held/manual-review state blocks execution).
- Fraud flags block payout — **blocked** (blocked because no fraud-flag data source is currently connected to payout gating).
- Failure recovery flow is defined — **done** (retry eligibility, max retry count, and manual-review paths are implemented).

### State machine
- Normal payout path is defined — **done**.
- Failure path is defined — **done**.
- Retry path is defined — **done**.
- Manual review path is defined — **done**.
- Hold and cancellation paths are defined — **done** (hold path complete; admin `cancel` override action implemented with `admin_cancel` audit event; cancels from `eligible`, `queued`, `failed`, or `held` states).

### Retry and safety
- Retry count is limited — **done** (`maxRetryCount = 3`).
- Launch mode is fixed to **Admin-approved** during beta rollout.
- Retry is idempotent — **partial** (attempt sequencing and unique provider charge IDs exist; concurrent duplicate retry requests are not yet fully deduplicated at route level).
- Retry is only for technical failure — **done** (retryable failure code list enforced).
- Fraud and disputes do not auto-retry — **done** (non-retryable codes and dispute gate block execution).
- Final failure escalates to manual review — **done** (manual-review hold path used when gates fail or retries exhaust).

### Storage and audit
- Payout snapshot is stored — **done** (`raw_request` snapshot at payout creation/release).
- Provider transfer ID is stored — **partial** (`provider_charge_id` and provider refs stored; provider transaction ID population depends on provider callback payload completeness).
- Last error is stored — **done** (`failure_reason`, attempt failure_reason, and manual review reason fields).
- All status transitions are logged — **partial** (core transitions are logged; legacy/manual seed inserts may exist without backfilled events).
- Admin actions are logged — **done** (`admin_mark_paid`, `admin_mark_failed`, `admin_hold`, and `payout_adjusted` events implemented).
