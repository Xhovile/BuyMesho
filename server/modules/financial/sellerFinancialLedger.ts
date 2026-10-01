import { query, withTransaction } from "../../postgres.js";
import type { PoolClient } from "pg";
import { randomUUID } from "crypto";

export type SellerFinancialAccount = {
  sellerUid: string;
  currency: string;
  reserveBalance: number;
  negativeBalance: number;
  reservedNegativeBalance: number;
  payoutHold: boolean;
  payoutHoldReason: string | null;
  createdAt: string;
  updatedAt: string;
};

type DbExecutor = Pick<PoolClient, "query">;

function normalizeUid(value: unknown): string {
  const uid = String(value ?? "").trim();
  if (!uid) throw new Error("Seller financial account requires an owner UID");
  return uid;
}

function normalizeCurrency(value: unknown): string {
  return String(value ?? "MWK").trim().toUpperCase() || "MWK";
}

function toAccount(row: Record<string, unknown>): SellerFinancialAccount {
  return {
    sellerUid: String(row.seller_uid),
    currency: String(row.currency ?? "MWK"),
    reserveBalance: Number(row.reserve_balance ?? 0),
    negativeBalance: Number(row.negative_balance ?? 0),
    reservedNegativeBalance: Number(row.reserved_negative_balance ?? 0),
    payoutHold: Number(row.payout_hold ?? 0) === 1,
    payoutHoldReason: row.payout_hold_reason == null ? null : String(row.payout_hold_reason),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

async function ensureAccount(
  executor: DbExecutor,
  sellerUid: string,
  currency: string,
): Promise<SellerFinancialAccount> {
  await executor.query(
    `INSERT INTO seller_financial_accounts (seller_uid, currency)
     VALUES ($1, $2)
     ON CONFLICT (seller_uid, currency) DO NOTHING`,
    [sellerUid, currency],
  );
  const result = await executor.query<Record<string, unknown>>(
    `SELECT *
       FROM seller_financial_accounts
      WHERE seller_uid = $1
        AND currency = $2
      LIMIT 1
      FOR UPDATE`,
    [sellerUid, currency],
  );
  if (!result.rows[0]) throw new Error("Seller financial account could not be created");
  return toAccount(result.rows[0]);
}

async function insertLedgerEvent(
  executor: DbExecutor,
  input: {
    idempotencyKey: string;
    sellerUid: string;
    currency: string;
    eventType: string;
    amount: number;
    reserveDelta: number;
    negativeBalanceDelta: number;
    reservedNegativeBalanceDelta: number;
    account: SellerFinancialAccount;
    payoutId?: string | null;
    refundLiabilityId?: string | null;
    reference?: string | null;
    reason: string;
    actorType: string;
    actorId?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await executor.query(
    `INSERT INTO seller_financial_ledger (
       id, idempotency_key, seller_uid, currency, event_type, amount,
       reserve_delta, negative_balance_delta, reserved_negative_balance_delta,
       reserve_balance_after, negative_balance_after, reserved_negative_balance_after,
       payout_id, refund_liability_id, reference, reason, actor_type, actor_id,
       metadata, created_at
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20
     )
     ON CONFLICT (idempotency_key) DO NOTHING`,
    [
      randomUUID(),
      input.idempotencyKey,
      input.sellerUid,
      input.currency,
      input.eventType,
      Math.max(0, Math.trunc(input.amount)),
      Math.trunc(input.reserveDelta),
      Math.trunc(input.negativeBalanceDelta),
      Math.trunc(input.reservedNegativeBalanceDelta),
      input.account.reserveBalance,
      input.account.negativeBalance,
      input.account.reservedNegativeBalance,
      input.payoutId ?? null,
      input.refundLiabilityId ?? null,
      input.reference ?? null,
      input.reason,
      input.actorType,
      input.actorId ?? null,
      input.metadata ? JSON.stringify(input.metadata) : null,
      new Date().toISOString(),
    ],
  );
}

async function applyDebitInTransaction(
  client: DbExecutor,
  input: {
    sellerUid: string;
    currency: string;
    amount: number;
    idempotencyKey: string;
    eventType: string;
    reason: string;
    actorType: string;
    actorId?: string | null;
    payoutId?: string | null;
    refundLiabilityId?: string | null;
    reference?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<{ account: SellerFinancialAccount; reserveUsed: number; negativeCreated: number; duplicate: boolean }> {
  const sellerUid = normalizeUid(input.sellerUid);
  const currency = normalizeCurrency(input.currency);
  const amount = Math.max(0, Math.trunc(Number(input.amount)));
  if (amount <= 0) throw new Error("Seller financial debit must be positive");

  const existingLedger = await client.query<{ id: string }>(
    "SELECT id FROM seller_financial_ledger WHERE idempotency_key = $1 LIMIT 1",
    [input.idempotencyKey],
  );
  if (existingLedger.rows[0]) {
    return { account: await ensureAccount(client, sellerUid, currency), reserveUsed: 0, negativeCreated: 0, duplicate: true };
  }

  const before = await ensureAccount(client, sellerUid, currency);
  const reserveUsed = Math.min(amount, before.reserveBalance);
  const negativeCreated = amount - reserveUsed;

  await client.query(
    `UPDATE seller_financial_accounts
        SET reserve_balance = reserve_balance - $1,
            negative_balance = negative_balance + $2,
            updated_at = CURRENT_TIMESTAMP
      WHERE seller_uid = $3
        AND currency = $4`,
    [reserveUsed, negativeCreated, sellerUid, currency],
  );

  const afterResult = await client.query<Record<string, unknown>>(
    `SELECT *
       FROM seller_financial_accounts
      WHERE seller_uid = $1
        AND currency = $2
      LIMIT 1
      FOR UPDATE`,
    [sellerUid, currency],
  );
  const after = toAccount(afterResult.rows[0]!);

  await insertLedgerEvent(client, {
    idempotencyKey: input.idempotencyKey,
    sellerUid,
    currency,
    eventType: input.eventType,
    amount,
    reserveDelta: -reserveUsed,
    negativeBalanceDelta: negativeCreated,
    reservedNegativeBalanceDelta: 0,
    account: after,
    payoutId: input.payoutId ?? null,
    refundLiabilityId: input.refundLiabilityId ?? null,
    reference: input.reference ?? null,
    reason: input.reason,
    actorType: input.actorType,
    actorId: input.actorId ?? null,
    metadata: { reserveUsed, negativeCreated, ...(input.metadata ?? {}) },
  });

  return { account: after, reserveUsed, negativeCreated, duplicate: false };
}

export async function getSellerFinancialAccount(
  sellerUid: string,
  currency = "MWK",
): Promise<SellerFinancialAccount> {
  const ownerUid = normalizeUid(sellerUid);
  const normalizedCurrency = normalizeCurrency(currency);
  return withTransaction((client) => ensureAccount(client, ownerUid, normalizedCurrency));
}

export async function applySellerReversalDebit(
  executor: DbExecutor,
  input: {
    sellerUid: string;
    currency: string;
    amount: number;
    reason: string;
    actorType: string;
    actorId?: string | null;
    payoutId?: string | null;
    refundLiabilityId?: string | null;
    reference?: string | null;
    idempotencyKey: string;
    metadata?: Record<string, unknown>;
  },
): Promise<{ account: SellerFinancialAccount; reserveUsed: number; negativeCreated: number; duplicate: boolean }> {
  return applyDebitInTransaction(executor, {
    ...input,
    eventType: "reversal_debit",
  });
}

export async function recordSellerExternalRefundRecovery(
  executor: DbExecutor,
  input: {
    sellerUid: string;
    currency: string;
    amount: number;
    reason: string;
    actorType: string;
    actorId?: string | null;
    reference: string;
    refundLiabilityId?: string | null;
    orderId?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<SellerFinancialAccount> {
  const sellerUid = normalizeUid(input.sellerUid);
  const currency = normalizeCurrency(input.currency);
  const amount = Math.max(0, Math.trunc(Number(input.amount)));
  if (amount <= 0) throw new Error("External seller refund recovery amount must be positive");

  const idempotencyKey = `external-refund-recovery:${input.reference}`;
  const existing = await executor.query<{ id: string }>(
    "SELECT id FROM seller_financial_ledger WHERE idempotency_key = $1 LIMIT 1",
    [idempotencyKey],
  );
  if (existing.rows[0]) return ensureAccount(executor, sellerUid, currency);

  const account = await ensureAccount(executor, sellerUid, currency);
  await insertLedgerEvent(executor, {
    idempotencyKey,
    sellerUid,
    currency,
    eventType: "external_refund_recovery",
    amount,
    reserveDelta: 0,
    negativeBalanceDelta: 0,
    reservedNegativeBalanceDelta: 0,
    account,
    reference: input.reference,
    refundLiabilityId: input.refundLiabilityId ?? null,
    reason: input.reason,
    actorType: input.actorType,
    actorId: input.actorId ?? null,
    metadata: { orderId: input.orderId ?? null, ...(input.metadata ?? {}) },
  });
  return account;
}

export async function recordManualRecoveryCredit(
  executor: DbExecutor,
  input: {
    sellerUid: string;
    currency: string;
    amount: number;
    reason: string;
    actorId: string;
    reference?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<{ account: SellerFinancialAccount; appliedAmount: number; duplicate: boolean }> {
  const sellerUid = normalizeUid(input.sellerUid);
  const currency = normalizeCurrency(input.currency);
  const amount = Math.max(0, Math.trunc(Number(input.amount)));
  if (amount <= 0) throw new Error("Manual recovery credit must be positive");

  const reference = String(input.reference ?? "").trim();
  if (!reference) throw new Error("Manual recovery credit requires a reference");
  const idempotencyKey = `manual-recovery-credit:${reference}`;
  const duplicate = await executor.query<{ id: string }>(
    "SELECT id FROM seller_financial_ledger WHERE idempotency_key = $1 LIMIT 1",
    [idempotencyKey],
  );
  if (duplicate.rows[0]) {
    return { account: await ensureAccount(executor, sellerUid, currency), appliedAmount: 0, duplicate: true };
  }

  const before = await ensureAccount(executor, sellerUid, currency);
  const availableNegative = Math.max(0, before.negativeBalance - before.reservedNegativeBalance);
  if (amount > availableNegative) {
    throw new Error(
      `Manual recovery credit exceeds the currently unreserved seller negative balance (${availableNegative})`,
    );
  }

  await executor.query(
    `UPDATE seller_financial_accounts
        SET negative_balance = negative_balance - $1,
            updated_at = CURRENT_TIMESTAMP
      WHERE seller_uid = $2
        AND currency = $3`,
    [amount, sellerUid, currency],
  );

  const after = await ensureAccount(executor, sellerUid, currency);
  await insertLedgerEvent(executor, {
    idempotencyKey,
    sellerUid,
    currency,
    eventType: "manual_recovery_credit",
    amount,
    reserveDelta: 0,
    negativeBalanceDelta: -amount,
    reservedNegativeBalanceDelta: 0,
    account: after,
    reference: input.reference ?? null,
    reason: input.reason,
    actorType: "admin",
    actorId: input.actorId,
    metadata: input.metadata,
  });
  return { account: after, appliedAmount: amount, duplicate: false };
}

export async function setSellerPayoutHold(
  executor: DbExecutor,
  input: {
    sellerUid: string;
    currency: string;
    held: boolean;
    reason?: string | null;
    actorId?: string | null;
  },
): Promise<SellerFinancialAccount> {
  const account = await ensureAccount(executor, normalizeUid(input.sellerUid), normalizeCurrency(input.currency));
  if (input.held && !String(input.reason ?? "").trim()) {
    throw new Error("A payout hold requires a reason");
  }

  await executor.query(
    `UPDATE seller_financial_accounts
        SET payout_hold = $1,
            payout_hold_reason = $2,
            updated_at = CURRENT_TIMESTAMP
      WHERE seller_uid = $3
        AND currency = $4`,
    [input.held ? 1 : 0, input.held ? String(input.reason).trim() : null, account.sellerUid, account.currency],
  );

  const refreshed = await ensureAccount(executor, account.sellerUid, account.currency);
  await insertLedgerEvent(executor, {
    idempotencyKey: `payout-hold:${account.sellerUid}:${account.currency}:${input.held ? "on" : "off"}:${Date.now()}`,
    sellerUid: account.sellerUid,
    currency: account.currency,
    eventType: input.held ? "payout_hold_set" : "payout_hold_cleared",
    amount: 0,
    reserveDelta: 0,
    negativeBalanceDelta: 0,
    reservedNegativeBalanceDelta: 0,
    account: refreshed,
    reason: input.held ? String(input.reason).trim() : "Payout hold cleared",
    actorType: "admin",
    actorId: input.actorId ?? null,
    metadata: { held: input.held },
  });
  return refreshed;
}

export async function preparePayoutFinancialNetting(
  executor: DbExecutor,
  input: {
    payoutId: string;
    sellerUid: string;
    currency: string;
    minimumPayoutAmount: number;
  },
): Promise<{
  payoutAmount: number;
  balanceNettingAmount: number;
  blocked: boolean;
  reason: string | null;
}> {
  const sellerUid = normalizeUid(input.sellerUid);
  const currency = normalizeCurrency(input.currency);

  const payoutResult = await executor.query<Record<string, unknown>>(
    `SELECT id, seller_receives_amount, amount, balance_netting_amount, balance_netting_status, currency
       FROM payouts
      WHERE id = $1
      LIMIT 1
      FOR UPDATE`,
    [input.payoutId],
  );
  const payout = payoutResult.rows[0];
  if (!payout) throw new Error("Payout not found");

  const existingNetting = Number(payout.balance_netting_amount ?? 0);
  const existingStatus = String(payout.balance_netting_status ?? "none");
  if (existingNetting > 0 && existingStatus === "reserved") {
    return {
      payoutAmount: Number(payout.amount ?? 0),
      balanceNettingAmount: existingNetting,
      blocked: false,
      reason: null,
    };
  }

  const account = await ensureAccount(executor, sellerUid, currency);
  const availableNegative = Math.max(0, account.negativeBalance - account.reservedNegativeBalance);
  if (availableNegative <= 0) {
    return {
      payoutAmount: Number(payout.amount ?? payout.seller_receives_amount ?? 0),
      balanceNettingAmount: 0,
      blocked: false,
      reason: null,
    };
  }

  const originalPayoutAmount = Number(payout.seller_receives_amount ?? payout.amount ?? 0);
  const nettingAmount = Math.min(Math.max(0, originalPayoutAmount), availableNegative);
  const effectivePayoutAmount = Math.max(0, originalPayoutAmount - nettingAmount);

  if (effectivePayoutAmount < input.minimumPayoutAmount) {
    return {
      payoutAmount: effectivePayoutAmount,
      balanceNettingAmount: 0,
      blocked: true,
      reason: "Seller negative balance consumes the payout below the provider minimum",
    };
  }

  if (nettingAmount <= 0) {
    return {
      payoutAmount: originalPayoutAmount,
      balanceNettingAmount: 0,
      blocked: false,
      reason: null,
    };
  }

  await executor.query(
    `UPDATE seller_financial_accounts
        SET reserved_negative_balance = reserved_negative_balance + $1,
            updated_at = CURRENT_TIMESTAMP
      WHERE seller_uid = $2
        AND currency = $3`,
    [nettingAmount, sellerUid, currency],
  );

  const after = await ensureAccount(executor, sellerUid, currency);
  await insertLedgerEvent(executor, {
    idempotencyKey: `payout-netting-reserved:${input.payoutId}`,
    sellerUid,
    currency,
    eventType: "payout_netting_reserved",
    amount: nettingAmount,
    reserveDelta: 0,
    negativeBalanceDelta: 0,
    reservedNegativeBalanceDelta: nettingAmount,
    account: after,
    payoutId: input.payoutId,
    reason: "Reserved part of seller payout against outstanding negative balance",
    actorType: "system",
    metadata: {
      originalPayoutAmount,
      effectivePayoutAmount,
      availableNegativeBefore: availableNegative,
    },
  });

  await executor.query(
    `UPDATE payouts
        SET amount = $1,
            balance_netting_amount = $2,
            balance_netting_status = 'reserved',
            updated_at = CURRENT_TIMESTAMP
      WHERE id = $3`,
    [effectivePayoutAmount, nettingAmount, input.payoutId],
  );

  return {
    payoutAmount: effectivePayoutAmount,
    balanceNettingAmount: nettingAmount,
    blocked: false,
    reason: null,
  };
}

export async function listSellerFinancialLedger(
  sellerUid: string,
  currency = "MWK",
  limit = 100,
): Promise<Record<string, unknown>[]> {
  const result = await query<Record<string, unknown>>(
    `SELECT *
       FROM seller_financial_ledger
      WHERE seller_uid = $1
        AND currency = $2
      ORDER BY created_at DESC
      LIMIT $3`,
    [normalizeUid(sellerUid), normalizeCurrency(currency), Math.max(1, Math.min(250, Math.trunc(limit)))],
  );
  return result.rows;
}
