import { payoutService } from './payout.service.js';

export type PayoutReconciliationSchedulerConfig = {
  enabled: boolean;
  intervalMs: number;
  batchLimit: number;
};

type ReconcilePayouts = (input: {
  actorType: 'system';
  limit: number;
}) => Promise<unknown>;

type Logger = Pick<Console, 'log' | 'warn' | 'error'>;

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;
const DEFAULT_BATCH_LIMIT = 25;
const MIN_INTERVAL_MS = 10_000;
const MAX_BATCH_LIMIT = 50;

function parseBooleanEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value.trim() === '') {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return defaultValue;
}

function parsePositiveIntegerEnv(
  value: string | undefined,
  defaultValue: number,
  options: { min?: number; max?: number } = {},
): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return defaultValue;
  }

  const integer = Math.trunc(parsed);
  if (integer <= 0) {
    return defaultValue;
  }

  const min = options.min ?? integer;
  const max = options.max ?? Math.max(integer, min);
  return Math.min(Math.max(integer, min), max);
}

export function getPayoutReconciliationSchedulerConfig(
  env: NodeJS.ProcessEnv = process.env,
): PayoutReconciliationSchedulerConfig {
  return {
    enabled: parseBooleanEnv(env.PAYOUT_RECONCILIATION_WORKER_ENABLED, false),
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

    if (this.timer) {
      return;
    }

    this.timer = setInterval(() => {
      void this.runOnce();
    }, this.config.intervalMs);

    this.timer.unref?.();
    this.logger.log(
      `[payout-reconciliation] worker started intervalMs=${this.config.intervalMs} batchLimit=${this.config.batchLimit}`,
    );
  }

  stop(): void {
    if (!this.timer) {
      return;
    }

    clearInterval(this.timer);
    this.timer = undefined;
  }

  async runOnce(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    if (this.running) {
      this.logger.warn('[payout-reconciliation] previous run still active; skipping overlap');
      return;
    }

    this.running = true;
    try {
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
