import { apiFetch } from '../../lib/api';

export type PayChanguConnectMode = 'live' | 'test';
export type PayChanguConnectStatus = 'pending' | 'connected' | 'revoked' | 'error';

export interface PayChanguConnectAuthorizeLinkRequest {
  sellerUid: string;
  clientId: string;
  redirectUri: string;
  mode: PayChanguConnectMode;
  scope?: string;
  whUrl?: string;
  whSecret?: string;
}

export interface PayChanguConnectAuthorizeLinkResponse {
  sellerUid: string;
  authorizationUrl: string;
}

export interface PayChanguConnectAccount {
  id: string;
  sellerUid: string;
  providerName: 'paychangu';
  status: PayChanguConnectStatus;
  mode: PayChanguConnectMode;
  scope?: string | null;
  authorizationUrl?: string | null;
  connectUserId?: string | null;
  connectUserEmail?: string | null;
  connectUserName?: string | null;
  connectedAt?: string | null;
  revokedAt?: string | null;
  lastError?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayChanguConnectCallbackPayload {
  sellerUid: string;
  accessToken?: string;
  refreshToken?: string | null;
  mode?: PayChanguConnectMode;
  scope?: string | null;
  webhookUrl?: string | null;
  webhookSecret?: string | null;
  authorizationUrl?: string | null;
  rawPayload?: Record<string, unknown> | null;
}

function normalizeConnectAccount(response: unknown): PayChanguConnectAccount {
  if (!response || typeof response !== 'object') {
    throw new Error('Invalid Connect account response');
  }

  const account = response as Record<string, unknown>;

  return {
    id: String(account.id ?? ''),
    sellerUid: String(account.sellerUid ?? account.seller_uid ?? ''),
    providerName: 'paychangu',
    status: (account.status as PayChanguConnectStatus) ?? 'pending',
    mode: (account.mode as PayChanguConnectMode) ?? 'test',
    scope: (account.scope as string | null) ?? null,
    authorizationUrl: (account.authorizationUrl as string | null) ?? (account.authorization_url as string | null) ?? null,
    connectUserId: (account.connectUserId as string | null) ?? (account.connect_user_id as string | null) ?? null,
    connectUserEmail: (account.connectUserEmail as string | null) ?? (account.connect_user_email as string | null) ?? null,
    connectUserName: (account.connectUserName as string | null) ?? (account.connect_user_name as string | null) ?? null,
    connectedAt: (account.connectedAt as string | null) ?? (account.connected_at as string | null) ?? null,
    revokedAt: (account.revokedAt as string | null) ?? (account.revoked_at as string | null) ?? null,
    lastError: (account.lastError as string | null) ?? (account.last_error as string | null) ?? null,
    createdAt: String(account.createdAt ?? account.created_at ?? ''),
    updatedAt: String(account.updatedAt ?? account.updated_at ?? ''),
  };
}

export async function createConnectAuthorizationLink(
  payload: PayChanguConnectAuthorizeLinkRequest,
): Promise<PayChanguConnectAuthorizeLinkResponse> {
  const response = await apiFetch('/api/connect/authorize-link', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return {
    sellerUid: String(response?.sellerUid ?? response?.seller_uid ?? payload.sellerUid),
    authorizationUrl: String(response?.authorizationUrl ?? response?.authorization_url ?? ''),
  };
}

export async function getConnectAccount(sellerUid: string): Promise<PayChanguConnectAccount | null> {
  const response = await apiFetch(`/api/connect/status/${encodeURIComponent(sellerUid)}`);
  if (!response) return null;
  return normalizeConnectAccount(response);
}

export async function submitConnectCallback(payload: PayChanguConnectCallbackPayload): Promise<PayChanguConnectAccount> {
  const response = await apiFetch('/api/connect/callback', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return normalizeConnectAccount(response);
}

export async function disconnectConnectAccount(
  sellerUid: string,
  reason?: string,
): Promise<PayChanguConnectAccount> {
  const response = await apiFetch(`/api/connect/disconnect/${encodeURIComponent(sellerUid)}`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });

  return normalizeConnectAccount(response);
}
