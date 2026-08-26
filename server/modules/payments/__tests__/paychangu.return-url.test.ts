import assert from 'node:assert/strict';
import test from 'node:test';
import { serverPaymentService } from '../payment.service.js';
import { clearPaymentState } from './paychangu.test.helpers.js';

test('PayChangu checkout uses the server-controlled return_url', async () => {
  clearPaymentState();

  const originalFetch = global.fetch;
  const originalSecretKey = process.env.PAYCHANGU_SECRET_KEY;
  const originalCallbackUrl = process.env.PAYCHANGU_CALLBACK_URL;
  const originalReturnUrl = process.env.PAYCHANGU_RETURN_URL;

  process.env.PAYCHANGU_SECRET_KEY = 'test-secret-key';
  process.env.PAYCHANGU_CALLBACK_URL = 'https://buymesho.onrender.com/api/payments/paychangu/callback';
  process.env.PAYCHANGU_RETURN_URL = 'https://buymesho.onrender.com/api/payments/paychangu/return';

  let capturedPayload: Record<string, unknown> | null = null;

  global.fetch = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const target = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (target === 'https://api.paychangu.com/payment') {
      capturedPayload = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
      return new Response(JSON.stringify({
        status: 'success',
        data: {
          checkout_url: 'https://checkout.paychangu.test/session',
          data: {
            tx_ref: String(capturedPayload.tx_ref),
            status: 'pending',
            currency: 'MWK',
            amount: 1000,
          },
        },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }

    return originalFetch(input, init);
  }) as typeof fetch;

  try {
    await serverPaymentService.createPayment({
      orderId: 'ord-return-url-test',
      provider: 'paychangu',
      method: 'mobile_money',
      amount: { amount: 1000, currency: 'MWK' },
      customer: {
        id: 'buyer_1',
        name: 'Buyer One',
        email: 'buyer@example.com',
      },
      returnUrl: 'https://attacker.example/should-not-be-used',
      cancelUrl: 'https://attacker.example/cancel',
    });

    assert.equal(capturedPayload?.callback_url, process.env.PAYCHANGU_CALLBACK_URL);
    assert.equal(capturedPayload?.return_url, process.env.PAYCHANGU_RETURN_URL);
    assert.notEqual(capturedPayload?.return_url, 'https://attacker.example/should-not-be-used');
  } finally {
    global.fetch = originalFetch;
    if (originalSecretKey === undefined) delete process.env.PAYCHANGU_SECRET_KEY;
    else process.env.PAYCHANGU_SECRET_KEY = originalSecretKey;
    if (originalCallbackUrl === undefined) delete process.env.PAYCHANGU_CALLBACK_URL;
    else process.env.PAYCHANGU_CALLBACK_URL = originalCallbackUrl;
    if (originalReturnUrl === undefined) delete process.env.PAYCHANGU_RETURN_URL;
    else process.env.PAYCHANGU_RETURN_URL = originalReturnUrl;
  }
});
