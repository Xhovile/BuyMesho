import { ENDPOINTS } from './endpoints';
import { ApiError } from './errors';
import type { ApiEnvelope } from '../types/common';
import type { AuthSession } from '../types/user';

export interface RequestOptions extends RequestInit {
  authToken?: string;
  idempotencyKey?: string;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = payload?.message || payload?.error || response.statusText || 'Request failed';
    throw new ApiError(message, {
      status: response.status,
      code: payload?.code,
      details: payload?.details,
      requestId: payload?.requestId,
    });
  }

  return payload as T;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (options.authToken) {
    headers.set('Authorization', `Bearer ${options.authToken}`);
  }
  if (options.idempotencyKey) {
    headers.set('Idempotency-Key', options.idempotencyKey);
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  return parseResponse<T>(response);
}

export async function fetchSession(authToken: string): Promise<AuthSession> {
  const response = await apiRequest<ApiEnvelope<AuthSession>>(ENDPOINTS.auth.me, {
    method: 'GET',
    authToken,
  });

  return response.data;
}
