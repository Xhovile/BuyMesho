import test from 'node:test';
import assert from 'node:assert/strict';
import { getPaymentDb } from '../../../sqlite.js';

const DB_PATH = '.tmp/connect-service.test.db';
const BASE_ENV = {
  PAYMENT_DB_PATH: DB_PATH,
  PAYCHANGU_SECRET_KEY: 'test-paychangu-secret',
  PAYCHANGU_WEBHOOK_SECRET: 'test-webhook-secret',
  CONNECT_TOKEN_ENCRYPTION_KEY: 'test-connect-encryption-key',
  PAYCHANGU_BASE_URL: 'https://api.paychangu.test',
};

function setConnectEnv(overrides: Partial<typeof BASE_ENV> = {}): void {
  Object.assign(process.env, BASE_ENV, overrides);
}

function clearConnectTables(): void {
  const db = getPaymentDb();
  db.prepare('DELETE FROM seller_connect_accounts').run();
  db.prepare('DELETE FROM connect_attempts').run();
  db.prepare('DELETE FROM sellers').run();
}

async function importFreshService(tag: string) {
  return import(new URL(`../connect.service.ts?${tag}`, import.meta.url).href);
}

test('validateConnectEnvironment throws when required env values are missing', async () => {
  setConnectEnv();
  const service = await importFreshService('missing-env');

  delete process.env.PAYCHANGU_SECRET_KEY;
  assert.throws(() => service.validateConnectEnvironment(), /PAYCHANGU_SECRET_KEY/);

  process.env.PAYCHANGU_SECRET_KEY = BASE_ENV.PAYCHANGU_SECRET_KEY;
  delete process.env.PAYCHANGU_WEBHOOK_SECRET;
  assert.throws(() => service.validateConnectEnvironment(), /PAYCHANGU_WEBHOOK_SECRET/);

  process.env.PAYCHANGU_WEBHOOK_SECRET = BASE_ENV.PAYCHANGU_WEBHOOK_SECRET;
  delete process.env.CONNECT_TOKEN_ENCRYPTION_KEY;
  assert.throws(() => service.validateConnectEnvironment(), /CONNECT_TOKEN_ENCRYPTION_KEY/);
});

test('startConnectOnboarding creates a pending attempt and authorization URL', async () => {
  setConnectEnv();
  const service = await importFreshService('start-onboarding');
  clearConnectTables();

  const db = getPaymentDb();
  db.prepare("INSERT INTO sellers (uid, email) VALUES (?, ?)").run('seller_1', 'seller@example.com');

  const result = service.startConnectOnboarding({
    sellerUid: 'seller_1',
    clientId: 'client_123',
    redirectUri: 'https://example.com/connect/callback',
    mode: 'test',
    whUrl: 'https://example.com/webhook',
    whSecret: 'webhook-secret',
  });

  assert.ok(result.connectAttemptId, 'connectAttemptId should be present');
  assert.ok(result.authorizationUrl, 'authorizationUrl should be present');
  assert.doesNotMatch(result.authorizationUrl, /webhook-secret/);

  const attempt = db
    .prepare('SELECT id, seller_uid, status, expires_at, consumed_at, metadata FROM connect_attempts WHERE id = ?')
    .get(result.connectAttemptId) as
    | { id: string; seller_uid: string; status: string; expires_at: string; consumed_at: string | null; metadata: string | null }
    | undefined;

  assert.ok(attempt, 'connect attempt row should exist');
  assert.equal(attempt?.seller_uid, 'seller_1');
  assert.equal(attempt?.status, 'pending');
  assert.equal(attempt?.consumed_at, null);
  assert.ok(attempt?.expires_at, 'expires_at should be set');

  const metadata = attempt?.metadata ? JSON.parse(attempt.metadata) as Record<string, unknown> : null;
  assert.equal(metadata?.clientId, 'client_123');
  assert.equal(metadata?.redirectUri, 'https://example.com/connect/callback');
  assert.equal(metadata?.mode, 'test');
  assert.equal(metadata?.whUrl, 'https://example.com/webhook');
});

test('recordConnectCallback fetches the connected user and stores encrypted token', async () => {
  setConnectEnv();
  const service = await importFreshService('record-callback');
  clearConnectTables();

  const db = getPaymentDb();
  db.prepare("INSERT INTO sellers (uid, email) VALUES (?, ?)").run('seller_1', 'seller@example.com');

  const originalFetch = global.fetch;
  let fetchCalled = false;
  global.fetch = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    fetchCalled = true;
    const target = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    assert.match(target, /\/connect\/user\?access_token=access-token-123$/);
    assert.equal(init?.method, 'GET');
    const headers = new Headers(init?.headers);
    assert.equal(headers.get('Authorization'), 'Bearer access-token-123');

    return new Response(JSON.stringify({
      id: 'user_123',
      email: 'seller@example.com',
      name: 'Seller One',
      phone: '+265999000111',
      status: 'active',
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    const account = await service.recordConnectCallback({
      sellerUid: 'seller_1',
      connectAttemptId: 'attempt_1',
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-456',
      mode: 'test',
      scope: 'payments',
      webhookUrl: 'https://example.com/webhook',
      webhookSecret: 'webhook-secret',
      authorizationUrl: 'https://paychangu.test/connect/authorize-link',
      rawPayload: { source: 'callback-test' },
    });

    assert.equal(fetchCalled, true);
    assert.equal(account.sellerUid, 'seller_1');
    assert.equal(account.status, 'connected');
    assert.equal(account.connectUserId, 'user_123');
    assert.equal(account.connectUserEmail, 'seller@example.com');
    assert.equal(account.connectUserName, 'Seller One');
    assert.ok(account.accessTokenEncrypted, 'encrypted access token should be stored');

    const stored = service.getConnectAccount('seller_1');
    assert.ok(stored, 'stored connect account should exist');
    assert.equal(stored?.status, 'connected');
    assert.equal(service.decryptSecret(stored?.accessTokenEncrypted ?? null), 'access-token-123');
    assert.equal(service.decryptSecret(stored?.refreshTokenEncrypted ?? null), 'refresh-token-456');
    assert.equal(service.decryptSecret(stored?.webhookSecretEncrypted ?? null), 'webhook-secret');
  } finally {
    global.fetch = originalFetch;
  }
});

test('recordConnectCallback rejects missing sellerUid with a clear error', async () => {
  setConnectEnv();
  const service = await importFreshService('record-callback-missing-seller');

  await assert.rejects(
    () => service.recordConnectCallback({ accessToken: 'access-token-123' } as never),
    /sellerUid is required/,
  );
});
