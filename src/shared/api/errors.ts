import type { ApiErrorShape } from '../types/common';

export class ApiError extends Error implements ApiErrorShape {
  code?: string;
  status?: number;
  details?: unknown;
  requestId?: string;

  constructor(message: string, options: ApiErrorShape = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = options.code;
    this.status = options.status;
    this.details = options.details;
    this.requestId = options.requestId;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
