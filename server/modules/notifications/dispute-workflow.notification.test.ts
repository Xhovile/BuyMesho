import assert from 'node:assert/strict';
import test from 'node:test';
import { notifyDisputeWorkflowEvent } from './dispute-workflow.notification.js';

test('seller resolution workflow notification targets the buyer only', async () => {
  const sent: Array<{ to: string; subject: string }> = [];

  await notifyDisputeWorkflowEvent(
    {
      caseId: 'case-1',
      orderId: 'order-1',
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      event: 'seller_dispute_rejected',
      note: 'Reason for rejection',
      recipients: ['buyer'],
    },
    {
      lookupUser: async (uid) => ({
        email: `${uid}@example.com`,
        displayName: uid,
      }),
      send: async (message) => {
        sent.push({ to: message.to.email, subject: message.subject });
      },
      claim: () => true,
      markSent: () => undefined,
      release: () => undefined,
    },
  );

  assert.deepEqual(sent, [
    { to: 'buyer-1@example.com', subject: 'BuyMesho seller disputed-order response' },
  ]);
});

test('notification delivery is idempotent for the same case event recipient', async () => {
  const sent: string[] = [];
  const claimed = new Set<string>();

  const dependencies = {
    lookupUser: async (uid: string) => ({ email: `${uid}@example.com`, displayName: uid }),
    send: async (message: { to: { email: string } }) => {
      sent.push(message.to.email);
    },
    claim: (notificationType: string, dedupeKey: string) => {
      const key = `${notificationType}:${dedupeKey}`;
      if (claimed.has(key)) return false;
      claimed.add(key);
      return true;
    },
    markSent: () => undefined,
    release: () => undefined,
  };

  const input = {
    caseId: 'case-2',
    orderId: 'order-2',
    buyerId: 'buyer-2',
    sellerId: 'seller-2',
    event: 'seller_replacement_recorded' as const,
    recipients: ['buyer'] as const,
  };

  await notifyDisputeWorkflowEvent(input, dependencies);
  await notifyDisputeWorkflowEvent(input, dependencies);

  assert.deepEqual(sent, ['buyer-2@example.com']);
});
