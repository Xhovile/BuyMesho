import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearPaymentState,
  createApp,
  mockPayChanguFetch,
  postPayChanguWebhook,
  seedOrder,
  seedStoredPayment,
  signWebhook,
  countEscrowsForOrder,
} from './paychangu.test.helpers.js';
import { orderRepository, paymentRepository } from './paychangu.test.helpers.js';

const WEBHOOK_SECRET = 'integration-secret';

async function withServer<T>(run: (base: string) => Promise<T>): Promise<T> {
  const app = createApp();
  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;
  const base = `http://127.0.0.1:${port}`;
  try {
    return await run(base);
  } finally {
    server.close();
    clearPaymentState();
  }
}

test('financial integrity: successful webhook with overpayment is ignored without settlement', async () => {
  clearPaymentState();
  process.env.PAYCHANGU_WEBHOOK_SECRET = WEBHOOK_SECRET;
  process.env.PAYCHANGU_SECRET_KEY = 'integration-secret-key';

  const originalFetch = global.fetch;
  global.fetch = mockPayChanguFetch(originalFetch, 'txref-webhook-overpaid-1', 'successful', 1250);

  try {
    seedOrder('order_webhook_overpaid_1', 'txref-webhook-overpaid-1');
    seedStoredPayment('order_webhook_overpaid_1', 'txref-webhook-overpaid-1');

    await withServer(async (base) => {
      const rawWebhook = JSON.stringify({
        event_type: 'charge.success',
        event_id: 'evt_webhook_overpaid_1',
        tx_ref: 'txref-webhook-overpaid-1',
        data: {
          tx_ref: 'txref-webhook-overpaid-1',
          status: 'successful',
          amount: 1250,
          currency: 'MWK',
        },
      });

      const response = await postPayChanguWebhook(base, rawWebhook, signWebhook(rawWebhook));
      assert.equal(response.status, 200);

      const result = await response.json() as { status?: string };
      assert.equal(result.status, 'ignored');
      assert.equal(orderRepository.findById('order_webhook_overpaid_1')?.status, 'pending_payment');
      assert.equal(paymentRepository.findByReference('txref-webhook-overpaid-1')?.verified, false);
      assert.equal(countEscrowsForOrder('order_webhook_overpaid_1'), 0);
    });
  } finally {
    global.fetch = originalFetch;
    clearPaymentState();
  }
});

test('financial integrity: successful webhook without an amount is ignored without settlement', async () => {
  clearPaymentState();
  process.env.PAYCHANGUANGU_WEBHOOK_SECRET = WEBHOOK_SECRET;
  process.env.PAYCHANGU_SECRET_KEY = 'integration-secret-key';

  const originalFetch = global.fetch;
  global.fetch = mockPayChanguFetch(originalFetch, 'txref-webhook-missing-amount-1', 'successful', 1000);

  try {
    seedOrder('order_webhook_missing_amount_1', 'txref-webhook-missing-amount-1');
    seedStoredPayment('order_webhook_missing_amount_1', 'txref-webhook-missing-amount-1');

    await withServer(async (base) => {
      const rawWebhook = JSON.stringify({
        event_type: 'charge.success',
        event_id: 'evt_webhook_missing_amount_1',
        tx_ref: 'txref-webhook-missing-amount-1',
        data: {
          tx_ref: 'txref-webhook-missing-amount-1',
          status: 'successful',
          currency: 'MWK',
        },
      });

      const response = await postPayChanguWebhook(base, rawWebhook, signWebhook(rawWebhook));
      assert.equal(response.status, 200);

      const result = await response.json() as { status?: string };
      assert.equal(result.status, 'ignored');
      assert.equal(orderRepository.findById('order_webhook_missing_amount_1')?.status, 'pending_payment');
      assert.equal(paymentRepository.findByReference('txref-webhook-missing-amount-1')?.verified, false);
      assert.equal(countEscrowsForOrder('order_webhook_missing_amount_1'), 0);
    });
  } finally {
    global.fetch = originalFetch;
    clearPaymentState();
  }
});
