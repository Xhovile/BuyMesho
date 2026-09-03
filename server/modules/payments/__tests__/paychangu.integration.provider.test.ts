import test from 'node:test';
import assert from 'node:assert/strict';
import { paychanguProvider } from '../paychangu.provider.js';
import { clearPaymentState, createApp, mockPayChanguFetch, seedOrder, seedStoredPayment, countEscrowsForOrder } from './paychangu.test.helpers.js';
import { escrowRepository, orderRepository, paymentRepository } from './paychangu.test.helpers.js';

test('provider: PayChangu initialization formats object validation messages for buyers', async () => {
  const originalFetch = global.fetch;
  global.fetch = (async (input: Parameters<typeof fetch>[0]) => {
    const target = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (/^https:\/\/[^/]*paychangu\.com\/payment/.test(target)) {
      return new Response(JSON.stringify({ status: 'error', message: { email: ['The email field is required.'], amount: ['The amount must be at least 100.'] } }), { status: 422, headers: { 'content-type': 'application/json' } });
    }
    return originalFetch(input);
  }) as typeof fetch;
  try {
    await assert.rejects(
      () => paychanguProvider.createPayment({ orderId: 'order_object_error_1', provider: 'paychangu', method: 'mobile_money', amount: { amount: 50, currency: 'MWK' }, customer: { id: 'buyer_1', name: 'Buyer One' }, returnUrl: 'https://example.com/return', cancelUrl: 'https://example.com/cancel' }, { paychanguSecretKey: 'integration-secret-key' }),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.notEqual(error.message, '[object Object]');
        assert.match(error.message, /email: The email field is required\./);
        assert.match(error.message, /amount: The amount must be at least 100\./);
        return true;
      },
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test('integration: PayChangu verification rejects overpaid payments', async () => {
  clearPaymentState();
  const app = createApp();
  const originalFetch = global.fetch;
  global.fetch = mockPayChanguFetch(originalFetch, 'txref-overpaid-1', 'success', 1250);
  process.env.PAYCHANGU_SECRET_KEY = 'integration-secret-key';
  const server = app.listen(0);
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  try {
    seedOrder('order_overpaid_1', 'txref-overpaid-1');
    seedStoredPayment('order_overpaid_1', 'txref-overpaid-1');
    const verifyRes = await fetch(`${base}/api/payments/paychangu/verify/txref-overpaid-1`);
    assert.equal(verifyRes.status, 200);
    const verifyResult = await verifyRes.json() as { verified?: boolean; failureReason?: string };
    assert.equal(verifyResult.verified, false);
    assert.match(verifyResult.failureReason ?? '', /exactly match order total/i);
    assert.equal(orderRepository.findById('order_overpaid_1')?.status, 'pending_payment');
    assert.equal(paymentRepository.findByReference('txref-overpaid-1')?.verified, false);
    assert.equal(paymentRepository.findByReference('txref-overpaid-1')?.status, 'pending');
    assert.equal(countEscrowsForOrder('order_overpaid_1'), 0);
    assert.equal(escrowRepository.findByOrderId('order_overpaid_1'), undefined);
  } finally {
    global.fetch = originalFetch;
    server.close();
    clearPaymentState();
  }
});

test('integration: PayChangu verification settles an exact payment into escrow using the order total', async () => {
  clearPaymentState();
  const app = createApp();
  const originalFetch = global.fetch;
  global.fetch = mockPayChanguFetch(originalFetch, 'txref-exact-amount-1', 'success', 1000, 'MWK');
  process.env.PAYCHANGU_SECRET_KEY = 'integration-secret-key';
  const server = app.listen(0);
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  try {
    seedOrder('order_exact_amount_1', 'txref-exact-amount-1');
    seedStoredPayment('order_exact_amount_1', 'txref-exact-amount-1');

    const verifyRes = await fetch(`${base}/api/payments/paychangu/verify/txref-exact-amount-1`);
    assert.equal(verifyRes.status, 200);
    const verifyResult = await verifyRes.json() as { verified?: boolean };
    assert.equal(verifyResult.verified, true);
    assert.equal(orderRepository.findById('order_exact_amount_1')?.status, 'in_escrow');
    assert.equal(paymentRepository.findByReference('txref-exact-amount-1')?.verified, true);
    assert.equal(paymentRepository.findByReference('txref-exact-amount-1')?.status, 'captured');
    assert.equal(countEscrowsForOrder('order_exact_amount_1'), 1);
    const escrow = escrowRepository.findByOrderId('order_exact_amount_1');
    assert.ok(escrow);
    assert.equal(escrow.balanceAmount, 1000);
    assert.equal(escrow.balanceCurrency, 'MWK');
  } finally {
    global.fetch = originalFetch;
    server.close();
    clearPaymentState();
  }
});

test('integration: PayChangu verification rejects underpaid, wrong-currency, and mismatched-reference responses', async () => {
  const scenarios = [
    { name: 'underpaid', reference: 'txref-underpaid-1', amount: 999, currency: 'MWK', verifiedReference: 'txref-underpaid-1', expectedReason: /exactly match order total/ },
    { name: 'wrong currency', reference: 'txref-currency-1', amount: 1000, currency: 'USD', verifiedReference: 'txref-currency-1', expectedReason: /exactly match order total/ },
    { name: 'mismatched reference', reference: 'txref-mismatch-1', amount: 1000, currency: 'MWK', verifiedReference: 'txref-other-1', expectedReason: /reference does not match requested transaction reference/ },
  ] as const;
  for (const scenario of scenarios) {
    clearPaymentState();
    const app = createApp();
    const originalFetch = global.fetch;
    global.fetch = mockPayChanguFetch(originalFetch, scenario.reference, 'success', scenario.amount, scenario.currency, scenario.verifiedReference);
    process.env.PAYCHANGU_SECRET_KEY = 'integration-secret-key';
    const server = app.listen(0);
    const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    try {
      const orderId = `order_${scenario.name.replace(/\s+/g, '_')}_1`;
      seedOrder(orderId, scenario.reference);
      seedStoredPayment(orderId, scenario.reference);
      const verifyRes = await fetch(`${base}/api/payments/paychangu/verify/${scenario.reference}`);
      assert.equal(verifyRes.status, 200);
      const verifyResult = await verifyRes.json() as { verified?: boolean; failureReason?: string };
      assert.equal(verifyResult.verified, false);
      assert.match(verifyResult.failureReason ?? '', scenario.expectedReason);
      assert.equal(orderRepository.findById(orderId)?.status, 'pending_payment');
      assert.equal(countEscrowsForOrder(orderId), 0);
      assert.equal(escrowRepository.findByOrderId(orderId), undefined);
      assert.equal(paymentRepository.findByReference(scenario.reference)?.verified, false);
      assert.equal(paymentRepository.findByReference(scenario.reference)?.status, 'pending');
    } finally {
      global.fetch = originalFetch;
      server.close();
      clearPaymentState();
    }
  }
});
