import { createCipheriv, createDecipheriv, randomBytes, randomUUID, scryptSync } from 'crypto';
import { connectRepository } from './connect.repository.js';
import type {
  PayChanguConnectAuthorizeLinkRequest,
  PayChanguConnectCallbackPayload,
  PayChanguConnectMode,
  PayChanguConnectStartRequest,
  PayChanguConnectStartResponse,
  PayChanguConnectUserProfile,
  SellerConnectAccount,
  SellerConnectAccountUpsertInput,
} from './connect.types.js';

const CONNECT_TOKEN_ENCRYPTION_KEY = process.env.CONNECT_TOKEN_ENCRYPTION_KEY ?? process.env.SELLER_PAYOUT_ENCRYPTION_KEY ?? '';
const PAYCHANGU_API_BASE_URL = process.env.PAYCHANGU_API_BASE_URL ?? 'https://api.paychangu.com';
const CONNECT_ATTEMPT_TTL_MS = 15 * 60 * 1000;

function requireEncryptionKey(): string {
  if (!CONNECT_TOKEN_ENCRYPTION_KEY) {
    throw new Error('CONNECT_TOKEN_ENCRYPTION_KEY is not configured');
  }

  return CONNECT_TOKEN_ENCRYPTION_KEY;
}

function getDerivedKey(): Buffer {
  return scryptSync(requireEncryptionKey(), 'BuyMesho connect token', 32);
}

function encryptSecret(value: string): string {
  const iv = randomBytes(12);
  const key = getDerivedKey();
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptSecret(value: string | null | undefined): string | null {
  if (!value) return null;

  const parts = value.split(':');
  if (parts.length !== 3) {
    return value;
  }

  try {
    const key = getDerivedKey();
    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const encrypted = Buffer.from(parts[2], 'base64');
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    return `${decipher.update(encrypted, undefined, 'utf8')}${decipher.final('utf8')}`;
  } catch {
    return null;
  }
}

export function buildConnectAuthorizationUrl(input: PayChanguConnectAuthorizeLinkRequest): string {
  const url = new URL('/connect/authorize-link', PAYCHANGU_API_BASE_URL);
  url.searchParams.set('client_id', input.clientId);
  url.searchParams.set('redirect_uri', input.redirectUri);
  url.searchParams.set('mode', input.mode);

  if (input.scope) {
    url.searchParams.set('scope', input.scope);
  }

  if (input.whUrl) {
    url.searchParams.set('wh_url', input.whUrl);
  }

  if (input.whSecret) {
    url.searchParams.set('wh_secret', input.whSecret);
  }

  return url.toString();
}

function buildAttemptMetadata(input: PayChanguConnectStartRequest): Record<string, unknown> {
  return {
    clientId: input.clientId,
    redirectUri: input.redirectUri,
    mode: input.mode,
    scope: input.scope ?? null,
    whUrl: input.whUrl ?? null,
    ...(input.metadata && typeof input.metadata === 'object' ? input.metadata : {}),
  };
}

function ensureSellerExists(sellerUid: string): void {
  if (!connectRepository.sellerExists(sellerUid)) {
    throw new Error('Seller account not found');
  }
}

export function startConnectOnboarding(
  input: PayChanguConnectStartRequest & { sellerUid: string },
): PayChanguConnectStartResponse {
  ensureSellerExists(input.sellerUid);

  const connectAttemptId = randomUUID();
  const expiresAt = new Date(Date.now() + CONNECT_ATTEMPT_TTL_MS).toISOString();

  connectRepository.createConnectAttempt({
    id: connectAttemptId,
    sellerUid: input.sellerUid,
    status: 'pending',
    expiresAt,
    metadata: buildAttemptMetadata(input),
  });

  const authorizationUrl = buildConnectAuthorizationUrl({
    clientId: input.clientId,
    redirectUri: input.redirectUri,
    mode: input.mode,
    scope: input.scope,
    whUrl: input.whUrl,
    whSecret: input.whSecret,
  });

  return {
    connectAttemptId,
    authorizationUrl,
  };
}

export function saveConnectAccount(input: SellerConnectAccountUpsertInput): SellerConnectAccount {
  return connectRepository.upsert(input);
}

export async function recordConnectCallback(input: PayChanguConnectCallbackPayload): Promise<SellerConnectAccount> {
  if (!input.sellerUid) {
    throw new Error('sellerUid is required');
  }

  const connectUser = input.connectUser ?? (input.accessToken ? await fetchConnectedUser(input.accessToken) : null);
  const authorizationUrl = input.authorizationUrl ?? null;

  return connectRepository.upsert({
    sellerUid: input.sellerUid,
    status: input.accessToken ? 'connected' : 'pending',
    mode: input.mode ?? 'test',
    scope: input.scope ?? null,
    authorizationUrl,
    connectUserId: connectUser?.id ?? null,
    connectUserEmail: connectUser?.email ?? null,
    connectUserName: connectUser?.name ?? null,
    accessTokenEncrypted: input.accessToken ? encryptSecret(input.accessToken) : null,
    refreshTokenEncrypted: input.refreshToken ? encryptSecret(input.refreshToken) : null,
    webhookUrl: input.webhookUrl ?? null,
    webhookSecretEncrypted: input.webhookSecret ? encryptSecret(input.webhookSecret) : null,
    connectedAt: input.accessToken ? new Date().toISOString() : null,
    revokedAt: null,
    lastError: null,
    rawProfile: connectUser?.rawResponse ?? input.rawPayload ?? null,
  });
}

export function getConnectAccount(sellerUid: string): SellerConnectAccount | undefined {
  return connectRepository.findBySellerUid(sellerUid);
}

export function disconnectConnectAccount(sellerUid: string, reason: string | null = 'Seller disconnected PayChangu Connect'): SellerConnectAccount {
  const existing = connectRepository.findBySellerUid(sellerUid);
  if (!existing) {
    return connectRepository.upsert({
      sellerUid,
      mode: 'test',
      status: 'revoked',
      revokedAt: new Date().toISOString(),
      lastError: reason,
    });
  }

  return connectRepository.upsert({
    sellerUid,
    mode: existing.mode,
    status: 'revoked',
    scope: existing.scope ?? null,
    authorizationUrl: existing.authorizationUrl ?? null,
    connectUserId: existing.connectUserId ?? null,
    connectUserEmail: existing.connectUserEmail ?? null,
    connectUserName: existing.connectUserName ?? null,
    accessTokenEncrypted: existing.accessTokenEncrypted ?? null,
    refreshTokenEncrypted: existing.refreshTokenEncrypted ?? null,
    webhookUrl: existing.webhookUrl ?? null,
    webhookSecretEncrypted: existing.webhookSecretEncrypted ?? null,
    connectedAt: existing.connectedAt ?? null,
    revokedAt: new Date().toISOString(),
    lastError: reason,
    rawProfile: existing.rawProfile ?? null,
  });
}
