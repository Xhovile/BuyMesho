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

test('dispute email includes buyer, seller, order items, and Buyer Disputes CTA', async () => {
  const messages: any[] = [];
  const order = {
    source: 'listing',
    buyerDetails: {
      fullName: 'Ada Buyer',
      phone: '0990000000',
      addressLine: 'Area 44',
      area: 'Area 44',
      townOrDistrict: 'Lilongwe',
      landmark: '',
    },
    items: [
      { kind: 'listing', title: 'Samsung Galaxy A15', quantity: 1 },
      { kind: 'listing', title: 'Air Max 270', quantity: 2 },
    ],
  } as any;

  await notifyDisputeWorkflowEvent(
    {
      caseId: 'case-context',
      orderId: 'order-context',
      buyerId: 'buyer-context',
      sellerId: 'seller-context',
      event: 'submitted',
      amount: 125000,
      currency: 'MWK',
      recipients: ['seller'],
    },
    {
      lookupUser: async () => ({ email: 'seller@example.com', displayName: 'Seller account' }),
      lookupSellerBusinessName: async () => "Isaac's Shop",
      lookupOrder: () => order,
      send: async (message) => messages.push(message),
      claim: () => true,
      markSent: () => undefined,
      release: () => undefined,
    },
  );

  assert.equal(messages.length, 1);
  assert.deepEqual(messages[0].to, { email: 'seller@example.com', name: "Isaac's Shop" });
  assert.match(messages[0].text, /Buyer: Ada Buyer/);
  assert.match(messages[0].text, /Seller: Isaac's Shop/);
  assert.match(messages[0].text, /Items: Samsung Galaxy A15 · Air Max 270 × 2/);
  assert.match(messages[0].html, /href="https:\/\/buymesho\.app\/seller\/payouts\?view=orders&order=order-context"/);

  const buyerMessages: any[] = [];
  await notifyDisputeWorkflowEvent(
    {
      caseId: 'case-context-buyer',
      orderId: 'order-context',
      buyerId: 'buyer-context',
      sellerId: 'seller-context',
      event: 'submitted',
      recipients: ['buyer'],
    },
    {
      lookupUser: async () => ({ email: 'buyer@example.com', displayName: 'Account Name' }),
      lookupSellerBusinessName: async () => "Isaac's Shop",
      lookupOrder: () => order,
      send: async (message) => buyerMessages.push(message),
      claim: () => true,
      markSent: () => undefined,
      release: () => undefined,
    },
  );
  assert.equal(buyerMessages.length, 1);
  assert.deepEqual(buyerMessages[0].to, { email: 'buyer@example.com', name: 'Ada Buyer' });
  assert.match(buyerMessages[0].html, /href="https:\/\/buymesho\.app\/disputes\?reference=order-context"/);
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
