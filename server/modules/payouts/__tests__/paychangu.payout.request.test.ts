import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  executePayChanguPayout,
  getPayChanguPayoutStatus,
  listPayChanguMobileMoneyOperators,
  listPayChanguPayoutBanks,
} from '../paychangu.payout.js';

const originalFetch = global.fetch;
const originalEnv = {
  PAYCHANGU_PAYOUT_BASE_URL: process.env.PAYCHANGU_PAYOUT_BASE_URL,
  PAYCHANGU_BASE_URL: process.env.PAYCHANGU_BASE_URL,
  PAYCHANGU_SECRET_KEY: process.env.PAYCHANGU_SECRET_KEY,
  PAYCHANGU_MOBILE_MONEY_PAYOUT_PATH: process.env.PAYCHANGU_MOBILE_MONEY_PAYOUT_PATH,
  PAYCHANGU_BANK_PAYOUT_PATH: process.env.PAYCHANGU_BANK_PAYOUT_PATH,
  PAYCHANGU_PAYOUT_STATUS_PATH: process.env.PAYCHANGU_PAYOUT_STATUS_PATH,
  PAYCHANGU_MOBILE_MONEY_PATH: process.env.PAYCHANGU_MOBILE_MONEY_PATH,
  PAYCHANGU_BANKS_PATH: process.env.PAYCHANGU_BANKS_PATH,
};

type CapturedRequest = {
  url: string;
  method: string;
  authorization: string | null;
  body: Record<string, unknown>;
};

function resetPayChanguEnv(): void {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  global.fetch = originalFetch;
}

function useDefaultPayChanguEnv(): void {
  delete process.env.PAYCHANGU_PAYOUT_BASE_URL;
  delete process.env.PAYCHANGU_BASE_URL;
  delete process.env.PAYCHANGU_MOBILE_MONEY_PAYOUT_PATH;
  delete process.env.PAYCHANGU_BANK_PAYOUT_PATH;
  delete process.env.PAYCHANGU_PAYOUT_STATUS_PATH;
  delete process.env.PAYCHANGU_MOBILE_MONEY_PATH;
  delete process.env.PAYCHANGU_BANKS_PATH;
  process.env.PAYCHANGU_SECRET_KEY = 'test-secret-key';
}

function mockPayChanguFetch(responsePayload: unknown): CapturedRequest[] {
  const requests: CapturedRequest[] = [];

  global.fetch = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    requests.push({
      url: typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url,
      method: init?.method ?? 'GET',
      authorization: headers.get('authorization'),
      body: init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {},
    });

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  return requests;
}

test('PayChangu mobile money payout uses the documented initialize path and exact request body', async () => {
  useDefaultPayChanguEnv();
  const requests = mockPayChanguFetch({
    status: 'success',
    data: {
      status: 'pending',
      ref_id: 'mobile-ref',
      trans_id: 'mobile-trans',
    },
  });

  try {
    await executePayChanguPayout({
      payoutId: 'mobile-body-test',
      sellerId: 'seller-mobile-body-test',
      amount: 1250,
      currency: 'MWK',
      providerName: 'Airtel Money',
      destinationReference: '0990000000',
      attemptNo: 1,
      destinationType: 'mobile_money',
      mobile: '0990000000',
      mobileMoneyOperatorRefId: '20be6c20-adeb-4b5b-a7ba-0769820df4fb',
      email: 'recipient@example.com',
      firstName: 'Test',
      lastName: 'Recipient',
    });

    assert.equal(requests.length, 1);
    assert.equal(requests[0]?.url, 'https://api.paychangu.com/mobile-money/payouts/initialize');
    assert.equal(requests[0]?.method, 'POST');
    assert.equal(requests[0]?.authorization, 'Bearer test-secret-key');
    assert.deepEqual(requests[0]?.body, {
      mobile: '0990000000',
      mobile_money_operator_ref_id: '20be6c20-adeb-4b5b-a7ba-0769820df4fb',
      amount: '1250',
      charge_id: 'BM-PO-mobile-body-test-A01',
      email: 'recipient@example.com',
      first_name: 'Test',
      last_name: 'Recipient',
    });
    assert.equal(Object.hasOwn(requests[0]?.body ?? {}, 'transaction_status'), false);
  } finally {
    resetPayChanguEnv();
  }
});

test('PayChangu bank payout uses the documented initialize path and exact request body', async () => {
  useDefaultPayChanguEnv();
  const requests = mockPayChanguFetch({
    status: 'success',
    data: {
      transaction: {
        status: 'success',
        ref_id: 'bank-ref',
        trans_id: 'bank-trans',
      },
    },
  });

  try {
    await executePayChanguPayout({
      payoutId: 'bank-body-test',
      sellerId: 'seller-bank-body-test',
      amount: 10000,
      currency: 'MWK',
      providerName: 'National Bank',
      destinationReference: '1001000010',
      attemptNo: 2,
      destinationType: 'bank',
      bankUuid: '82310dd1-ec9b-4fe7-a32c-2f262ef08681',
      bankAccountName: 'Madalitso Kamwendo',
      bankAccountNumber: '1001000010',
    });

    assert.equal(requests.length, 1);
    assert.equal(requests[0]?.url, 'https://api.paychangu.com/direct-charge/payouts/initialize');
    assert.equal(requests[0]?.method, 'POST');
    assert.equal(requests[0]?.authorization, 'Bearer test-secret-key');
    assert.deepEqual(requests[0]?.body, {
      payout_method: 'bank_transfer',
      bank_uuid: '82310dd1-ec9b-4fe7-a32c-2f262ef08681',
      amount: '10000',
      charge_id: 'BM-PO-bank-body-test-A02',
      bank_account_name: 'Madalitso Kamwendo',
      bank_account_number: '1001000010',
    });
  } finally {
    resetPayChanguEnv();
  }
});

test('PayChangu payout lookups use documented default paths', async () => {
  useDefaultPayChanguEnv();
  const requests = mockPayChanguFetch({
    status: 'success',
    data: {
      transaction: {
        status: 'success',
        amount: 1000,
        currency: 'MWK',
        ref_id: 'status-ref',
      },
    },
  });

  try {
    await getPayChanguPayoutStatus('BM-PO-status-test-A01');
    assert.equal(
      requests[0]?.url,
      'https://api.paychangu.com/direct-charge/payouts/BM-PO-status-test-A01/details',
    );
    assert.equal(requests[0]?.method, 'GET');
    assert.equal(requests[0]?.authorization, 'Bearer test-secret-key');
  } finally {
    resetPayChanguEnv();
  }
});

test('PayChangu provider list helpers use documented default paths', async () => {
  useDefaultPayChanguEnv();
  const requests = mockPayChanguFetch({
    data: [
      { ref_id: '20be6c20-adeb-4b5b-a7ba-0769820df4fb', name: 'Airtel Money' },
      { uuid: '82310dd1-ec9b-4fe7-a32c-2f262ef08681', name: 'National Bank' },
    ],
  });

  try {
    await listPayChanguMobileMoneyOperators();
    await listPayChanguPayoutBanks('MWK');

    assert.equal(requests[0]?.url, 'https://api.paychangu.com/mobile-money');
    assert.equal(requests[0]?.method, 'GET');
    assert.equal(
      requests[1]?.url,
      'https://api.paychangu.com/direct-charge/payouts/supported-banks?currency=MWK',
    );
    assert.equal(requests[1]?.method, 'GET');
  } finally {
    resetPayChanguEnv();
  }
});
