# Event Payouts — Phase 1 Architecture Audit & Contract Freeze

_Last reviewed: 2026-09-15_

## Objective

Establish the existing Listings/Seller Payout architecture as the baseline for event payouts.

This phase is intentionally **read-only with respect to payout behavior**. It does not introduce an event payout table, change seller payout behavior, change fees, or alter payout timing.

The outcome is a frozen architecture contract that later event-payout phases must extend rather than replace.

## Baseline decision

BuyMesho already has a centralized payout system. Event payouts should reuse that system instead of creating a parallel `event_payouts` implementation.

The existing system already separates:

- payout destination records,
- payout records,
- provider attempts,
- payout status transitions,
- financial calculation policy,
- audit events,
- destination security and masking,
- and PayChangu execution/reconciliation.

The event work should therefore add **event identity and event-specific destination binding** to the existing model, while keeping the seller/Listings path intact.

## 1. Existing payout destination architecture

The current destination table is `seller_payout_accounts`. It stores ownership, destination type, provider identifiers, currency, account holder name, encrypted bank/mobile values, masked display value, a destination fingerprint, default status, verification state, replacement history, active state, and timestamps.

Full account/mobile values are encrypted at rest. Normal application/UI exposure is based on masked values. Destination uniqueness is enforced with a fingerprint, and replacement history is represented explicitly rather than overwriting historical relationships.

Destination ownership checks are actor-based: the payout settings layer permits the destination owner or an administrator to view/edit the settings.

### Frozen contract for event payouts

1. Do not create a second encryption/masking implementation for events.
2. Do not store event payout credentials in public event fields.
3. Reuse destination fingerprinting and duplicate protection.
4. Preserve destination replacement history.
5. A payout must keep the destination identity that was selected when the payout became payable; changing a current destination must not silently redirect an existing payout.
6. The event model may bind an event to a destination record, but payout history must remain independently anchored to the destination actually used.

## 2. Existing payout financial model

`payouts` already stores the financial snapshot needed to reconstruct a payout. Current fields include:

- `gross_amount`
- `platform_fee_amount`
- `processing_fee_amount`
- `reserve_amount`
- `reserve_cap_amount`
- `manual_adjustment_amount`
- `payout_fee_amount`
- `seller_receives_amount`
- `net_amount`
- `formula_snapshot`
- `currency`
- `destination_account_id`

The repository also has a separate `payout_attempts` table so provider attempts have their own attempt number, PayChangu `charge_id`, request/response payloads, state, failure reason, and timestamps.

This is the correct financial-history pattern to extend to events.

## 3. Frozen payout calculation contract

The centralized `PAYOUT_POLICY` currently defines:

- platform fee: **3%** (`300` basis points),
- reserve cap: **6%** (`600` basis points),
- Airtel Money payout fee: **1.8%**,
- TNM Mpamba payout fee: **1.5%**,
- bank payout fee: **1.7% + MWK 700**, and
- buyer fee / PayChangu customer fee in the current policy: **0%**.

The payout formula calculates platform fee and reserve against gross amount, applies any manual adjustment, calculates the destination-method payout fee, and persists the resulting financial values in the payout row together with a formula snapshot.

### Frozen contract for event payouts

Event payouts must call the same centralized formula machinery. A second event-specific commission formula is prohibited unless a future product decision explicitly changes the global payout policy.

The event implementation may add event context to the calculation input/snapshot, but it must not duplicate the arithmetic in event routes.

## 4. Existing payout lifecycle

The current seller/Listings path supports these local payout states:

`eligible → pending_settlement → ready_for_payout → queued → processing → pending → paid`

with operational branches for `held`, `failed`, and `cancelled`.

A released escrow produces one payout candidate, and payout uniqueness is protected at the escrow/release level. Provider attempts are tracked independently so a retry can receive a fresh provider attempt identity without creating a second payout candidate for the same underlying release.

### Important timing baseline

The existing seller payout implementation is settlement-aware. `pending_settlement` exists specifically so payout submission can wait for the platform balance to become usable under the current PayChangu operating model. The repository also contains retry/reconciliation logic for provider failures and balance-insufficient conditions.

**Event payout timing is not frozen to the seller timing.** The user-facing event requirement is immediate payout initiation after a successful ticket payment, but Phase 1 deliberately does not implement or redefine that behavior. Phase 8 must verify PayChangu balance availability and decide how the existing engine can support immediate event initiation without corrupting the seller/Listings lifecycle.

## 5. Existing provider architecture

The current payout provider is PayChangu. The architecture keeps provider execution behind payout services and records provider state separately from BuyMesho's local payout state.

The current model already supports:

- provider charge identity,
- provider reference/transaction identity,
- provider status,
- provider request/response data,
- provider attempts,
- webhook/reconciliation handling,
- technical retry classification,
- and administrative exception handling.

### Frozen contract for event payouts

Event payouts must reuse this provider layer. Do not call PayChangu directly from event creation or event checkout routes.

## 6. Existing security model

The payout destination system already treats payout details as sensitive operational data rather than ordinary seller profile data.

Current controls include:

- encrypted bank/mobile values at rest,
- masked destination display,
- seller/admin ownership checks,
- destination fingerprinting,
- inactive destinations remaining payout-ineligible,
- replacement linkage,
- and payout/audit records that preserve destination identity.

The current destination implementation also keeps the seller-managed destination path separate from administrative exception controls.

### Frozen contract for event payouts

Event payout setup must inherit these controls. Event creators should not get a weaker or separate destination security model.

## 7. Existing audit model

The repository already has `payout_events`, `payout_attempts`, `payout_adjustments`, and `seller_payout_account_events`.

This means event payout work should prefer adding event context to the existing audit records rather than building an unrelated event-only audit trail.

Historical payout records must remain reconstructible after:

- destination replacement,
- provider retry,
- provider failure,
- administrative intervention,
- refund activity, and
- event completion.

## 8. Architecture gap that Phase 2+ must solve

The current payout destination ownership model is seller-centric: `seller_payout_accounts.seller_uid`.

Events currently have their own creator identity through `events.creator_uid`, but the event record does not yet have a payout-destination binding.

Therefore, the next architecture step is **not** to build a second payout engine. It is to generalize destination ownership/binding safely enough that an event can select one payout destination while the existing seller payout path remains unchanged.

The likely target is:

```text
Event Creator
   |
   +-- Event A ----> Payout Destination A
   |
   +-- Event B ----> Payout Destination B
   |
   +-- Event C ----> Payout Destination C
```

A physical receiving account may be reused across multiple events, but each event must explicitly bind to the intended destination. The event must not silently inherit a creator default.

## 9. Contract: one financial identity per event

Each event becomes a financial reporting unit.

Future event payout records must be able to answer, without reconstructing from mutable current state:

- which event generated the payout,
- gross ticket sales represented by that payout,
- BuyMesho commission,
- applicable processing/payout fees,
- reserve/adjustments where applicable,
- net creator receipt,
- the exact payout destination used,
- provider attempt history,
- payout status, and
- refund/adjustment relationships.

The preferred implementation is to extend the existing `payouts` model with event linkage rather than introducing a duplicate payout table.

## 10. Explicit non-goals for Phase 1

Phase 1 does **not**:

- add an `event_payouts` table,
- add event payout UI,
- attach a payout account to events,
- change seller payout fees,
- change seller payout timing,
- change the current payout formula,
- change PayChangu credentials or provider behavior,
- implement immediate event payout,
- implement event refunds,
- lock event destinations after first sale, or
- change seller/Listings payout behavior.

## 11. Frozen implementation rules for subsequent phases

### Rule A — Reuse the engine

Use the existing payout repository/service/provider stack.

### Rule B — Reuse financial policy

Use the existing centralized payout formula and store a historical formula snapshot.

### Rule C — Preserve payout identity

One financial event should not accidentally create duplicate payouts. Provider retries remain attempts, not new payouts.

### Rule D — Preserve destination history

Existing payouts keep the destination record they were created against. Destination replacement must not mutate historical payout meaning.

### Rule E — Keep seller behavior stable

No event-payout phase may silently modify the established Listings seller payout path.

### Rule F — Separate authorization from money routing

`event_creators` determines whether a person may create/manage events. The event payout destination determines where money for a specific event is routed. These are separate responsibilities.

### Rule G — Do not invent provider verification

BuyMesho should not claim PayChangu has verified account ownership unless the provider exposes a stable, documented verification mechanism for the specific destination type and the integration has been tested.

## Phase 1 result

**Status: COMPLETE.**

Phase 1 establishes the existing Listings/Seller Payout system as the source architecture for event payouts. The next phase can safely focus on generalizing destination ownership/binding without introducing a parallel financial subsystem.

## Next phase

**Phase 2 — Generalize Payout Destinations**

The next implementation should define the smallest safe change that allows event-owned payout destinations while preserving the current seller destination API, encryption, masking, fingerprinting, replacement, audit, and payout execution behavior.