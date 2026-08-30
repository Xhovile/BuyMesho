import { getPaymentDb } from '../../postgresCompat.js';
import { payoutRepository, payoutService } from './payout.service.js';
import { PAYOUT_POLICY, isRetryableFailureCode } from './payout.policy.js';

type ReconcilePayouts = (input: {
  actorType: 'system';
  limit: number;
}) => Promise<unknown>;

type Logger = Pick<Console, 'log' | 'warn' | 'error'>;

export type PayoutReconciliationSchedulerConfig = {
  enabled: boolean;
  intervalMs: number;
  batchLimit: number;
};

const DEFAULT_INTERVAL_MS = PAYOUT_POLICY.automaticRetryIntervalHours * 60 * 60 * 1000;
const DEFAULT_BATCH_LIMIT = 25;
const MIN_INTERVAL_MS = 10 * 1000;
const MAX_BATCH_LIMIT = 50;
const RETRY_INTERVAL_MS = PAYOUT_POLICY.automaticRetryIntervalHours * 60 * 60 * 1000;
const RETRY_WINDOW_MS = PAYOUT_POLICY.automaticRetryWindowHours * 60 * 60 * 1000;

function parseBooleanEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value.trim() === '') return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return defaultValue;
}

function parsePositiveIntegerEnv(
  value: string | undefined,
  defaultValue: number,
  options: { min?: number; max?: number } = {},
): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return defaultValue;
  const integer = Math.trunc(parsed);
  if (integer <= 0) return defaultValue;
  const min = options.min ?? integer;
  const max = options.max ?? Math.max(integer, min);
  return Math.min(Math.max(integer, min), max);
}

function parseResponsePayload(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === 'object') return value as Record<string, unknown>;
  if (typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return typeof parsed === 'object' && parsed !== null ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function hasProviderIdentifier(value: unknown): boolean {
  const payload = parseResponsePayload(value);
  if (!payload) return false;

  const response = typeof payload.response === 'object' && payload.response !== null
    ? payload.response as Record<string, unknown>
    : payload;
  const data = typeof response.data === 'object' && response.data !== null
    ? response.data as Record<string, unknown>
    : response;
  const transaction = typeof data.transaction === 'object' && data.transaction !== null
    ? data.transaction as Record<string, unknown>
    : data;

  return [
    transaction.charge_id,
    transaction.ref_id,
    transaction.reference,
    transaction.trans_id,
    transaction.transaction_id,
    response.charge_id,
    response.ref_id,
    response.reference,
    response.trans_id,
    response.transaction_id,
  ].some((value) => typeof value === 'string' ? value.trim().length > 0 : Number.isFinite(value));
}

function providerAccepted(value: unknown): boolean {
  const payload = parseResponsePayload(value);
  if (!payload) return false;
  const httpStatus = Number(payload.httpStatus);
  const ok = payload.ok === true || (Number.isFinite(httpStatus) && httpStatus >= 200 && httpStatus < 300);
  return ok && hasProviderIdentifier(payload);
}

function isInsufficientBalanceResponse(value: unknown): boolean {
  const payload = parseResponsePayload(value);
  if (!payload) return false;
  const text = JSON.stringify(payload).toLowerCase();
  return text.includes('insufficient funds') || text.includes('insufficient balance') || text.includes('not enough funds');
}

function withinRetryWindow(requestedAt: string | null | undefined, nowMs = Date.now()): boolean {
  if (!requestedAt) return false;
  const start = new Date(requestedAt).getTime();
  if (!Number.isFinite(start)) return false;
  return nowMs >= start && nowMs < start + RETRY_WINDOW_MS;
}

function retryDeadline(requestedAt: string): number {
  return new Date(requestedAt).getTime() + RETRY_WINDOW_MS;
}

function retryEligibleAt(latestAttemptAt: string | null | undefined, requestedAt: string | null | undefined): number | null {
  const base = latestAttemptAt ?? requestedAt;
  if (!base) return null;
  const timestamp = new Date(base).getTime();
  return Number.isFinite(timestamp) ? timestamp + RETRY_INTERVAL_MS : null;
}

export function getPayoutReconciliationSchedulerConfig(
  env: NodeJS.ProcessEnv = process.env,
): PayoutReconciliationSchedulerConfig {
  return {
    enabled: parseBooleanEnv(env.PAYOUT_RECONCILIATION_WORKER_ENABLED, true),
    intervalMs: parsePositiveIntegerEnv(env.PAYOUT_RECONCILIATION_WORKER_INTERVAL_MS, DEFAULT_INTERVAL_MS, {
      min: MIN_INTERVAL_MS,
    }),
    batchLimit: parsePositiveIntegerEnv(env.PAYOUT_RECONCILIATION_WORKER_BATCH_LIMIT, DEFAULT_BATCH_LIMIT, {
      max: MAX_BATCH_LIMIT,
    }),
  };
}

export class PayoutReconciliationScheduler {
  private timer: NodeJS.Timeout | undefined;
  private running = false;

  constructor(
    private readonly config: PayoutReconciliationSchedulerConfig,
    private readonly reconcile: ReconcilePayouts = (input) => payoutService.reconcilePendingPayoutStatuses(input),
    private readonly logger: Logger = console,
  ) {}

  start(): void {
    if (!this.config.enabled) {
      this.logger.log('[payout-reconciliation] worker disabled');
      return;
    }
    if (this.timer) return;

    this.timer = setInterval(() => {
      void this.runOnce();
    }, this.config.intervalMs);
    this.timer.unref?.();

    this.logger.log(
      `[payout-reconciliation] worker started intervalMs=${this.config.intervalMs} batchLimit=${this.config.batchLimit}`,
    );
  }

  stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = undefined;
  }

  private async retryEligiblePayouts(limit: number): Promise<number> {
    const db = getPaymentDb();
    const rows = db.prepare(
      `SELECT
         p.id,
         p.seller_id,
         p.requested_at,
         p.created_at,
         p.status,
         p.failure_reason,
         (
           SELECT COUNT(*)
           FROM payout_attempts pa
           WHERE pa.payout_id = p.id
         ) AS attempt_count,
         (
           SELECT pa.created_at
           FROM payout_attempts pa
           WHERE pa.payout_id = p.id
           ORDER BY pa.attempt_no DESC, pa.created_at DESC
           LIMIT 1
         ) AS latest_attempt_at,
         (
           SELECT pa.response_payload
           FROM payout_attempts pa
           WHERE pa.payout_id = p.id
           ORDER BY pa.attempt_no DESC, pa.created_at DESC
           LIMIT 1
         ) AS latest_response_payload
       FROM payouts p
       WHERE p.provider = 'paychangu'
         AND (
           p.status = 'failed'
           OR (p.status = 'pending' AND p.failure_reason = 'balance_insufficient')
           OR (p.status = 'held' AND p.failure_reason IN (
             'provider_timeout',
             'provider_unavailable',
             'provider_network_error',
             'provider_rate_limited',
             'provider_rejected',
             'provider_authentication_error',
             'provider_configuration_error',
             'provider_conflict',
             'balance_insufficient'
           ))
         )
       ORDER BY COALESCE(p.requested_at, p.created_at) ASC
       LIMIT ?`,
    ).all(limit) as Array<{
      id: string;
      seller_id: string;
      requested_at: string | null;
      created_at: string;
      status: string;
      failure_reason: string | null;
      attempt_count: number;
      latest_attempt_at: string | null;
      latest_response_payload: unknown;
    }>;

    let retried = 0;
    const nowMs = Date.now();

    for (const row of rows) {
      const requestedAt = row.requested_at ?? row.created_at;
      const accepted = providerAccepted(row.latest_response_payload);

      if (accepted) {
        await payoutService.reconcilePayoutStatus({ payoutId: row.id, actorType: 'system' });
        continue;
      }

      // Older payouts may have been recorded as failed/provider_rejected even
      // though PayChangu's actual response says the platform balance was
      // insufficient. Normalize those records back to pending while the
      // 48-hour retry window is still open. The attempt remains failed.
      if (
        withinRetryWindow(requestedAt, nowMs) &&
        isInsufficientBalanceResponse(row.latest_response_payload) &&
        (row.status === 'failed' || row.failure_reason === 'provider_rejected')
      ) {
        payoutRepository.updateStatus(row.id, 'pending', {
          provider: 'paychangu',
          providerStatus: 'failed',
          failureReason: 'balance_insufficient',
          manualReviewReason: null,
          failedAt: null,
        });
        continue;
      }

      if (!withinRetryWindow(requestedAt, nowMs)) {
        payoutRepository.addEvent({
          payoutId: row.id,
          sellerId: row.seller_id,
          eventType: 'payout_retry_window_expired',
          actorType: 'system',
          actorId: null,
          note: 'Automatic payout submission window expired without provider acceptance',
          payload: {
            retryWindowStartedAt: requestedAt,
            retryWindowDeadline: new Date(retryDeadline(requestedAt)).toISOString(),
            automaticRetryWindowHours: PAYOUT_POLICY.automaticRetryWindowHours,
            attemptCount: row.attempt_count,
            failureReason: row.failure_reason,
          },
        });
        payoutRepository.updateStatus(row.id, 'failed', {
          provider: 'paychangu',
          providerStatus: 'failed',
          failureReason: 'automatic_retry_window_expired',
          manualReviewReason: 'Automatic payout retry window expired after the provider never accepted the payout.',
          failedAt: new Date().toISOString(),
        });
        continue;
      }

      if (row.attempt_count >= PAYOUT_POLICY.maxRetryCount) {
        continue;
      }

      const nextRetryAt = retryEligibleAt(row.latest_attempt_at, requestedAt);
      if (nextRetryAt !== null && nowMs < nextRetryAt) {
        continue;
      }

      const failureCode = row.failure_reason;
      if (row.status === 'held' && !isRetryableFailureCode(failureCode)) {
        continue;
      }

      try {
        const result = await payoutService.executePayout({
          payoutId: row.id,
          actorType: 'system',
        });
        retried += 1;

        payoutRepository.addEvent({
          payoutId: row.id,
          sellerId: row.seller_id,
          eventType: 'payout_automatic_retry_attempted',
          actorType: 'system',
          actorId: null,
          note: 'Automatic payout submission retry attempted after configured retry interval',
          payload: {
            requestedAt,
            retryEligibleAt: nextRetryAt ? new Date(nextRetryAt).toISOString() : null,
            retryWindowDeadline: new Date(retryDeadline(requestedAt)).toISOString(),
            attemptNo: result.attempt?.attemptNo ?? null,
            reasonCode: result.reasonCode,
            providerAccepted: providerAccepted(result.execution?.rawResponse),
          },
        });
      } catch (error) {
        this.logger.error(`[payout-reconciliation] automatic retry failed for ${row.id}:`, error);
      }
    }

    return retried;
  }

  async runOnce(): Promise<void> {
    if (!this.config.enabled) return;
    if (this.running) {
      this.logger.warn('[payout-reconciliation] previous run still active; skipping overlap');
      return;
    }

    this.running = true;
    try {
      const retriedCount = await this.retryEligiblePayouts(this.config.batchLimit);
      if (retriedCount > 0) {
        this.logger.log(`[payout-reconciliation] retried ${retriedCount} payout(s)`);
      }

      await this.reconcile({ actorType: 'system', limit: this.config.batchLimit });
    } catch (error) {
      this.logger.error('[payout-reconciliation] reconcile failed:', error);
    } finally {
      this.running = false;
    }
  }
}

export function startPayoutReconciliationScheduler(
  config = getPayoutReconciliationSchedulerConfig(),
): PayoutReconciliationScheduler {
  const scheduler = new PayoutReconciliationScheduler(config);
  scheduler.start();
  return scheduler;
}
