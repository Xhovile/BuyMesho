export type EntityId = string;
export type ISODateString = string;
export type Nullable<T> = T | null;
export type Maybe<T> = T | undefined;
export type MaybePromise<T> = T | Promise<T>;

export interface Timestamped {
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface AuditMeta {
  createdBy?: EntityId;
  updatedBy?: EntityId;
  source?: string;
  requestId?: string;
}

export interface MoneyValue {
  amount: number;
  currency: string;
}

export interface ApiMeta {
  requestId?: string;
  traceId?: string;
}

export interface PaginationInput {
  page?: number;
  pageSize?: number;
}

export interface PaginationResult {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ListResponse<T> {
  data: T[];
  meta: PaginationResult & ApiMeta;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: ApiMeta;
}

export interface ApiErrorShape {
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
  requestId?: string;
}
