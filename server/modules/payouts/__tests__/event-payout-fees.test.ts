import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildEventPayoutFormulaSnapshot,
  calculateEventPayoutFees,
  EVENT_PAYOUT_FORMULA_VERSION,
} from '../event-payout-fees.js';

test('event payout formula calculates commission and creator net server-side', () => {
  const result = calculateEventPayoutFees({
    eventId: 'event-100',
    grossAmount: 10_000,
    currency: 'mwk',
  });

  assert.equal(result.formulaVersion, EVENT_PAYOUT_FORMULA_VERSION);
  assert.equal(result.grossAmount, 10_000);
  assert.equal(result.platformFeeAmount, 300);
  assert.equal(result.processingFeeAmount, 0);
  assert.equal(result.payoutFeeAmount, 0);
  assert.equal(result.netAmount, 9_700);
  assert.equal(result.sellerReceivesAmount, 9_700);
  assert.equal(result.currency, 'MWK');
});

test('event payout formula includes an explicit processing fee without changing legacy seller formula', () => {
  const result = calculateEventPayoutFees({
    eventId: 'event-101',
    grossAmount: 10_000,
    processingFeeAmount: 300,
    currency: 'MWK',
  });

  assert.equal(result.platformFeeAmount, 300);
  assert.equal(result.processingFeeAmount, 300);
  assert.equal(result.payoutFeeAmount, 0);
  assert.equal(result.netAmount, 9_400);
});

test('event payout formula applies the registered payout destination fee separately', () => {
  const result = calculateEventPayoutFees({
    eventId: 'event-102',
    grossAmount: 10_000,
    payoutMethod: 'airtel_money',
    currency: 'MWK',
  });

  assert.equal(result.platformFeeAmount, 300);
  assert.equal(result.payoutFeeAmount, 180);
  assert.equal(result.netAmount, 9_520);
});

test('event payout formula snapshot freezes inputs, policy, and result', () => {
  const input = {
    eventId: 'event-103',
    grossAmount: 10_000,
    processingFeeAmount: 300,
    payoutMethod: 'airtel_money' as const,
    currency: 'MWK',
  };
  const result = calculateEventPayoutFees(input);
  const snapshot = buildEventPayoutFormulaSnapshot(input, result);

  assert.equal(snapshot.formulaVersion, EVENT_PAYOUT_FORMULA_VERSION);
  assert.equal(snapshot.scope, 'event');
  assert.equal(snapshot.eventId, 'event-103');
  assert.equal(snapshot.inputs.grossAmount, 10_000);
  assert.equal(snapshot.inputs.processingFeeAmount, 300);
  assert.equal(snapshot.inputs.payoutMethod, 'airtel_money');
  assert.equal(snapshot.policy.platformFeeBps, 300);
  assert.equal(snapshot.policy.payoutFeeBps.airtel_money, 180);
  assert.equal(snapshot.result.platformFeeAmount, 300);
  assert.equal(snapshot.result.payoutFeeAmount, 180);
  assert.equal(snapshot.result.netAmount, 9_220);
});

test('event payout formula rejects a missing event identity', () => {
  assert.throws(
    () => calculateEventPayoutFees({ eventId: '  ', grossAmount: 1_000 }),
    /eventId is required for event payout fee calculation/,
  );
});
