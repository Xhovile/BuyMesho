# Phase 9 — Event Financial History & Reporting

## Purpose

Phase 9 adds an event-level financial reporting layer without creating a second accounting system.

The report reads:

- successful event ticket sales from recorded order/payment and event-ticket records;
- refunds from canonical `refund_transactions` records, with escrow refund entries as a compatibility fallback;
- payout amounts and fee components from the payout row and its immutable `formula_snapshot`;
- exact historical payout destinations from `payouts.destination_account_id`;
- provider attempts from `payout_attempts`.

The current payout policy is not applied when reading historical payout records.

## Event financial model

```
Event
 ├── Sales
 │    ├── tickets sold
 │    ├── gross ticket revenue
 │    ├── refunds
 │    └── net sales
 │
 ├── Recorded payout deductions
 │    ├── BuyMesho commission
 │    ├── processing fees
 │    ├── reserves
 │    ├── payout fees
 │    └── manual adjustments
 │
 ├── Payouts
 │    ├── pending / processing
 │    ├── paid
 │    ├── failed
 │    └── cancelled
 │
 └── Historical destination + provider attempts
```

## API

`GET /api/event-creator/events/:eventId/financial`

The authenticated event creator can read the report only when `events.creator_uid` matches their UID.

The response includes:

- `sales`
- `fees`
- `payouts`
- `currentDestination`
- `payoutHistory`
- `ledger`

Each payout remains linked to its event, order, escrow, release entry, destination ID, and provider attempt history.

## Refund attribution

For a single-event order, a recorded refund is attributed to that event.

For a mixed-event order, a refund is attributed only when the refund identifies an event ticket through `refund_requests.item_id` (or the compatible escrow entry metadata). Otherwise the report exposes the value as `sales.unallocatedRefundedAmount` instead of silently assigning it to the wrong event.

This prevents cross-event refund double counting.

## Historical integrity

Historical payout values come from the stored payout formula snapshot first and payout columns second.

Changing:

- the event's current payout destination;
- the event creator's current profile;
- the active payout fee policy;

does not recalculate or redirect an existing payout record.

The report may show the event's current receiving destination separately, but every historical payout retains the exact destination account ID that was recorded when that payout was created.

## Payout totals and ledger semantics

`payouts.netPaidAmount` is the sum of payout net amounts with status `paid`.

`payouts.netPayableAmount` is the sum of currently outstanding payout obligations, including retryable `failed` payouts.

`payouts.netPayoutAmount` is the total recorded net payout amount across paid and outstanding obligations. It replaces the ambiguous `netAmountOwed` field.

Ledger entries carry both:

- `direction`: actual inflow/outflow direction for cash movement, or `neutral` when the row represents an obligation rather than cash movement;
- `movementType`: `cash`, `obligation`, or `none`.

A paid payout is a cash outflow. Pending, processing, queued, held, eligible, ready-for-payout, and failed payouts are represented as obligations rather than completed cash outflows. Cancelled payouts are retained in history but do not create a cash movement entry.

## Creator-facing UI

The event creator overview now provides a **Financials** action for each event.

The financial report panel shows:

- gross sales;
- refunds;
- net sales;
- net paid;
- net payable;
- recorded fee breakdown;
- payout history;
- exact destination metadata;
- provider attempts;
- event ledger activity.

The overview's previous estimated-net wording was removed so dashboard totals use recorded sales/refund history instead of the current payout policy.

## Test coverage

`server/modules/events/__tests__/eventFinancialReporting.test.ts` covers:

- event ownership identity;
- gross sales and ticket counts;
- refund amount and ticket refund count;
- historical payout fee snapshot values;
- paid payout totals;
- destination identity;
- provider attempt identity;
- event/order/escrow payout trace;
- ledger entry creation.
