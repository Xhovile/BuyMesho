import { getPaymentDb } from "../server/sqlite.js";

const FINANCE_TABLES_IN_DELETE_ORDER = [
  "payout_attempts",
  "payout_events",
  "payout_adjustments",
  "seller_payout_account_events",
  "payouts",
  "escrows",
  "disputes",
  "payments",
  "orders",
  "seller_payout_accounts",
  "payment_webhook_events",
  "idempotency_keys",
] as const;

function main() {
  const db = getPaymentDb();

  const reset = db.transaction(() => {
    db.exec("PRAGMA foreign_keys = ON");

    for (const table of FINANCE_TABLES_IN_DELETE_ORDER) {
      db.prepare(`DELETE FROM ${table}`).run();
    }

    // Clear AUTOINCREMENT counters for finance-related tables where SQLite tracks them.
    db.prepare(
      `DELETE FROM sqlite_sequence WHERE name IN (
        'payment_webhook_events',
        'payout_attempts',
        'payout_events',
        'payout_adjustments',
        'seller_payout_account_events'
      )`,
    ).run();
  });

  reset();
  console.log("Finance data reset complete.");
}

try {
  main();
} catch (error) {
  console.error(
    "Finance reset failed:",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
}