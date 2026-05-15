# BuyMesho Structure Completion Gate

This document defines the exact point at which the BuyMesho payout structure is considered complete enough for implementation.

It exists to prevent vague decisions, repeated redesign, and unsafe payment logic.

## Why this file exists

BuyMesho is being built as a campus-first marketplace with trust-first growth, free core participation, and phased monetization. The strategy documents make it clear that the platform should stay lightweight at first, improve trust before complexity, and only add transaction-linked features when the market proves ready. 0 1

The payout system must follow the same rule.

This file is the final checkpoint before coding the seller payout layer.

---

## 1. Locked decisions

These decisions must be frozen before implementation starts.

### 1.1 Payout formula
The payout formula is:

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

### 1.5 Eligibility rule
A payout may only be released when the payout eligibility gate is true.

If the gate is false, the amount stays held, even if the math is correct.

---

## 2. What must be built before the payout system is called complete

### 2.1 Money calculation
The backend must be able to:
- read the gross amount
- apply platform fee
- apply payment gateway fee
- apply reserve logic
- apply manual adjustments
- produce the final seller net payout

### 2.2 Permission control
The system must clearly define:
- who can view payout data
- who can request payout
- who can approve payout
- who can freeze payout
- who can override a payout after review

### 2.3 State machine
The payout state flow must exist and be enforced.

Required states:
- `created`
- `paid`
- `escrowed`
- `payout_pending`
- `payout_processing`
- `payout_sent`
- `payout_success`
- `payout_failed`
- `retry_pending`
- `manual_review`
- `held`
- `cancelled`

### 2.4 Retry logic
The system must define:
- retry limit
- retry delay/backoff
- idempotency handling
- when retry is allowed
- when retry must stop
- when the flow escalates to manual review

### 2.5 Audit logging
Every payout-related action must be logged.

Required logs:
- payout calculation created
- payout eligibility changed
- payout requested
- payout sent
- payout success
- payout failure
- retry attempt
- admin override
- payout hold
- payout release

### 2.6 Backend authority
The backend must be the source of truth.

The frontend must never:
- calculate final payout on its own
- approve its own payout
- override payout state
- decide eligibility alone

---

## 3. Completion checklist

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

### Eligibility
- [ ] Payment confirmation is required
- [ ] Order completion is required
- [ ] Dispute window is enforced
- [ ] Seller verification is required
- [ ] Admin holds block payout
- [ ] Fraud flags block payout

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

---

## 4. Open questions that must be answered before coding

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

---

## 5. Acceptance rule

The payout structure is complete only when:

1. The formula is frozen.
2. Permissions are frozen.
3. The state machine is frozen.
4. Retry logic is frozen.
5. Eligibility rules are frozen.
6. Database fields are defined.
7. Audit logging is defined.
8. Admin review rules are defined.

If any of those items are still moving, the structure is not complete.

---

## 6. Practical rule for the team

Do not start implementation while key payout rules are still being debated.

Do not code first and decide later.

Decide first, then build.

---

## 7. Final note

BuyMesho is being built as a trust-first marketplace. Core participation stays open, monetization follows proof, and transaction-linked features only make sense when the system is operationally mature. This payout structure must reflect that discipline. 2 3

When this file is fully satisfied, the seller payout structure is ready for implementation.
