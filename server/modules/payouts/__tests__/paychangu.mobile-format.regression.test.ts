import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizePayChanguMobileNumber } from '../paychangu.payout.js';

test('normalizes Malawi mobile numbers to PayChangu nine-digit format', () => {
  assert.equal(normalizePayChanguMobileNumber('0990000000'), '990000000');
  assert.equal(normalizePayChanguMobileNumber('265990000000'), '990000000');
  assert.equal(normalizePayChanguMobileNumber('+265 99 000 000'), '990000000');
  assert.equal(normalizePayChanguMobileNumber('990000000'), '990000000');
});

test('rejects malformed PayChangu mobile payout numbers', () => {
  assert.throws(
    () => normalizePayChanguMobileNumber('12345'),
    /nine digits/,
  );
});
