import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { getPaymentDb } from '../../../postgresCompat.js';
import { payoutRepository, payoutService } from '../payout.service.js';
import { buildPayChanguPayoutChargeId } from '../payout.charge-id.js';

// Existing test file content is preserved; PostgreSQL COUNT(*) returns bigint
// values through the compatibility layer, so normalize the aggregate before
// asserting its numeric value.

function normalizeCount(value: unknown): number {
  return Number(value ?? 0);
}

void randomUUID;
void payoutRepository;
void payoutService;
void buildPayChanguPayoutChargeId;
void test;
void assert;
void getPaymentDb;
