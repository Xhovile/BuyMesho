# BuyMesho Structure Completion Gate

This document defines the exact point at which the BuyMesho payout structure is complete enough for implementation.

Its purpose is to stop vague decisions, repeated redesign, and unsafe payment logic from leaking into code.

**Hard rule:** if any item in this file is still moving, implementation does not start.

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

### 2.7 Automated failure tests

The payout flow is not complete until the following cases are tested:
- duplicate release clicks
- duplicate webhook callbacks
- payout retry with a fresh provider charge ID
- seller cannot trigger own release
- payout failure after escrow release
- partial provider downtime

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
- [ ] Gross collected amount is stored correctly
- [ ] Platform fee is fixed at 2%
- [ ] Payment processing fee is captured from the provider
- [ ] Reserve logic is defined and capped at 6%
- [ ] Manual adjustments are explicit and logged
- [ ] Final seller net payout is calculated server-side

### Permissions
- [ ] Seller permissions are defined
- [ ] Admin permissions are defined
- [ ] System permissions are defined
- [ ] Payment provider responsibilities are defined
- [ ] No frontend-only payout authority exists

### Destination management
- [ ] Payout destination can be added
- [ ] Payout destination can be edited
- [ ] Payout destination can be replaced
- [ ] Re-verification after destination change is defined
- [ ] Duplicate destination protection exists
- [ ] Destination history is retained

### Eligibility and recovery
- [ ] Payment confirmation is required
- [ ] Order completion is required
- [ ] Dispute window is enforced
- [ ] Seller verification is required
- [ ] Admin holds block payout
- [ ] Fraud flags block payout
- [ ] Failure recovery flow is defined

### State machine
- [ ] Normal payout path is defined
- [ ] Failure path is defined
- [ ] Retry path is defined
- [ ] Manual review path is defined
- [ ] Hold and cancellation paths are defined

### Retry and safety
- [ ] Retry count is limited
- [ ] Retry is idempotent
- [ ] Retry is only for technical failure
- [ ] Fraud and disputes do not auto-retry
- [ ] Final failure escalates to manual review

### Storage and audit
- [ ] Payout snapshot is stored
- [ ] Provider transfer ID is stored
- [ ] Last error is stored
- [ ] All status transitions are logged
- [ ] Admin actions are logged

### Testing
- [ ] Duplicate release is tested
- [ ] Duplicate webhook callback is tested
- [ ] Retry with fresh provider charge ID is tested
- [ ] Seller self-trigger is blocked in tests
- [ ] Escrow-release failure is tested
- [ ] Provider downtime handling is tested

---

## 4) Open questions that must be answered before coding

If any of these are unresolved, the structure is not complete.

- Should the 6% reserve be split into separate buckets or tracked as one reserve pool?
- What is the exact dispute window length?
- Should first-time sellers have stricter reserve rules?
- Should some categories have higher risk holds?
- What is the minimum payout threshold?
- Should payout be automatic or admin-approved at launch?
- What exact webhook events will confirm payout success or failure?
- What is the max retry count?
- What error types are retryable?
- What error types are manual-review only?
- Must provider balance already be funded before payout submission?

---

## 5) Acceptance rule

The payout structure is complete only when:

1. The formula is frozen.
2. Permissions are frozen.
3. The state machine is frozen.
4. Retry logic is frozen.
5. Eligibility rules are frozen.
6. Destination management rules are frozen.
7. Validation and audit rules are frozen.
8. Automated failure tests are defined.
9. Database fields are defined.
10. Admin review rules are defined.

If any of those items are still moving, the structure is not complete.

---

## 6) Practical rule for the team

Do not start implementation while key payout rules are still being debated.

Do not code first and decide later.

Decide first, then build.

---

## 7) Final note

BuyMesho is being built as a trust-first marketplace. Core participation stays open, monetization follows proof, and transaction-linked features only make sense when the system is operationally mature. This payout structure must reflect that discipline.

When this file is fully satisfied, the seller payout structure is ready for implementation.
