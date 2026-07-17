import type { Express } from "express";
import { getFirebaseAdmin } from "../auth/firebaseAdmin.js";
import { PAYMENT_ENDPOINTS } from "../modules/payments/payment.endpoints.js";
import { paymentWebhookHandler } from "../modules/payments/payment.webhooks.js";
import { payoutWebhookHandler } from "../modules/payouts/payout.webhooks.js";

type RouteDeps = {
  db: any;
};

type CheckStatus = "PASS" | "WARN" | "FAIL";

type NamedCheck = {
  status: CheckStatus;
  message: string;
  details?: Record<string, unknown>;
};

const REQUIRED_TABLES = [
  "sellers",
  "listings",
  "payments",
  "orders",
  "seller_applications",
  "listing_reviews",
  "reports",
  "buyer_cart_items",
  "conversations",
  "messages",
  "admin_actions",
  "escrows",
  "escrow_events",
  "disputes",
  "payouts",
  "payment_webhook_events",
  "seller_payout_accounts",
  "payout_attempts",
  "payout_events",
  "payout_adjustments",
  "seller_payout_account_events",
  "idempotency_keys",
] as const;

const REQUIRED_COLUMNS: Record<string, string[]> = {
  listings: [
    "seller_uid",
    "name",
    "price",
    "status",
    "quantity",
    "sold_quantity",
    "category",
    "university",
    "deleted_at",
    "deleted_by_uid",
    "hard_delete_after",
  ],
  payments: ["order_id", "provider", "method", "status", "reference", "currency", "amount"],
  orders: ["id", "buyer_id", "seller_id", "source", "status", "currency", "subtotal_amount", "total_amount"],
  seller_applications: [
    "applicant_uid",
    "applicant_email",
    "full_legal_name",
    "institution",
    "applicant_type",
    "institution_id_number",
    "business_name",
    "what_to_sell",
    "business_description",
    "reason_for_applying",
    "proof_document_url",
    "status",
  ],
  payment_webhook_events: ["provider", "reference", "event_type", "signature_valid", "payload", "created_at"],
  payouts: [
    "seller_id",
    "order_id",
    "escrow_id",
    "status",
    "currency",
    "amount",
    "destination_account_id",
    "provider_ref_id",
    "provider_transaction_id",
    "provider_status",
    "failure_reason",
    "manual_review_reason",
    "approved_by",
    "sent_at",
    "paid_at",
    "failed_at",
    "gross_amount",
    "platform_fee_amount",
    "processing_fee_amount",
    "reserve_amount",
    "reserve_cap_amount",
    "manual_adjustment_amount",
    "payout_fee_amount",
    "seller_receives_amount",
    "net_amount",
    "formula_snapshot",
    "last_adjustment_id",
    "processed_by",
    "raw_request",
    "raw_response",
  ],
  seller_payout_accounts: [
    "seller_uid",
    "destination_type",
    "provider_name",
    "masked_account",
    "destination_fingerprint",
    "is_default",
    "verification_status",
    "is_active",
    "created_at",
    "updated_at",
  ],
  payout_attempts: ["payout_id", "attempt_no", "provider", "provider_charge_id", "request_payload", "status", "created_at", "updated_at"],
  payout_events: ["payout_id", "seller_id", "event_type", "actor_type", "created_at"],
  payout_adjustments: ["payout_id", "seller_id", "adjustment_type", "amount", "currency", "reason", "actor_type", "created_at"],
  seller_payout_account_events: ["seller_uid", "account_id", "event_type", "actor_type", "created_at"],
};

const REQUIRED_PAYMENT_ENDPOINTS = {
  initialize: "/api/payments/paychangu/initialize",
  verify: "/api/payments/paychangu/verify/:txRef",
  webhook: "/api/payments/paychangu/webhook",
  payoutWebhook: "/api/payments/paychangu-payout/webhook",
} as const;

function statusWeight(status: CheckStatus): number {
  if (status === "FAIL") return 2;
  if (status === "WARN") return 1;
  return 0;
}

function combineStatus(checks: NamedCheck[]): CheckStatus {
  const worst = checks.reduce((acc, check) => Math.max(acc, statusWeight(check.status)), 0);
  if (worst === 2) return "FAIL";
  if (worst === 1) return "WARN";
  return "PASS";
}

function isTablePresent(db: any, tableName: string): boolean {
  const row = db
    .prepare(
      `
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = current_schema()
            AND table_name = ?
        ) AS present
      `
    )
    .get(tableName) as { present?: number | boolean } | undefined;

  return !!row?.present;
}

function getColumns(db: any, tableName: string): string[] {
  const rows = db
    .prepare(
      `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = ?
        ORDER BY ordinal_position
      `
    )
    .all(tableName) as Array<{ column_name: string }>;

  return rows.map((row) => row.column_name);
}

function getCount(db: any, tableName: string): number | null {
  try {
    const row = db.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get() as { count?: number } | undefined;
    return Number(row?.count ?? 0);
  } catch {
    return null;
  }
}

function checkEnvironment(name: string, required = false): NamedCheck {
  const value = process.env[name];
  if (value && value.trim().length > 0) {
    return { status: "PASS", message: `${name} is set`, details: { configured: true } };
  }

  return {
    status: required ? "FAIL" : "WARN",
    message: `${name} is not set`,
    details: { configured: false },
  };
}

function checkEnvironmentGroup(names: string[], label: string, mode: "all" | "any" = "all"): NamedCheck {
  const configured = names.filter((name) => {
    const value = process.env[name];
    return typeof value === "string" && value.trim().length > 0;
  });

  if (mode === "any") {
    return configured.length > 0
      ? { status: "PASS", message: `${label} is configured`, details: { configured } }
      : { status: "WARN", message: `${label} is not configured`, details: { expected_any_of: names } };
  }

  if (configured.length === names.length) {
    return { status: "PASS", message: `${label} is fully configured`, details: { configured } };
  }

  return {
    status: "WARN",
    message: `${label} is partially configured`,
    details: { configured, missing: names.filter((name) => !configured.includes(name)) },
  };
}

function checkDatabase(db: any): NamedCheck {
  const started = Date.now();
  const row = db.prepare("SELECT 1 AS ok").get() as { ok?: number } | undefined;
  const latencyMs = Date.now() - started;

  return {
    status: row?.ok === 1 ? "PASS" : "FAIL",
    message: row?.ok === 1 ? "Database connection is healthy" : "Database query did not return the expected result",
    details: { latency_ms: latencyMs },
  };
}

function checkTables(db: any): NamedCheck {
  const missing = REQUIRED_TABLES.filter((table) => !isTablePresent(db, table));
  return {
    status: missing.length === 0 ? "PASS" : "FAIL",
    message: missing.length === 0 ? "All required tables are present" : `Missing tables: ${missing.join(", ")}`,
    details: { required_tables: REQUIRED_TABLES.length, missing_tables: missing },
  };
}

function checkColumns(db: any): NamedCheck {
  const missingByTable: Record<string, string[]> = {};

  for (const [tableName, columns] of Object.entries(REQUIRED_COLUMNS)) {
    if (!isTablePresent(db, tableName)) {
      missingByTable[tableName] = [...columns];
      continue;
    }

    const presentColumns = new Set(getColumns(db, tableName));
    const missing = columns.filter((column) => !presentColumns.has(column));
    if (missing.length > 0) missingByTable[tableName] = missing;
  }

  return {
    status: Object.keys(missingByTable).length === 0 ? "PASS" : "FAIL",
    message: Object.keys(missingByTable).length === 0 ? "Required columns are present" : "Some required columns are missing",
    details: {
      checked_tables: Object.keys(REQUIRED_COLUMNS),
      missing_columns: missingByTable,
    },
  };
}

function checkCounts(db: any): NamedCheck {
  const tablesToCount = ["sellers", "listings", "orders", "payments", "seller_applications", "messages", "conversations"];
  const counts: Record<string, number | null> = {};
  for (const table of tablesToCount) {
    counts[table] = isTablePresent(db, table) ? getCount(db, table) : null;
  }
  return { status: "PASS", message: "Row counts collected", details: counts };
}

function checkHardDeleteColumn(db: any): NamedCheck {
  if (!isTablePresent(db, "listings")) {
    return { status: "FAIL", message: "listings table is missing" };
  }

  const row = db
    .prepare(
      `
        SELECT data_type
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'listings'
          AND column_name = 'hard_delete_after'
        LIMIT 1
      `
    )
    .get() as { data_type?: string } | undefined;

  if (!row?.data_type) {
    return { status: "FAIL", message: "hard_delete_after column is missing" };
  }

  const status = row.data_type === "timestamp with time zone" ? "PASS" : "WARN";
  return {
    status,
    message: row.data_type === "timestamp with time zone" ? "hard_delete_after is normalized to TIMESTAMPTZ" : `hard_delete_after is still ${row.data_type}`,
    details: { data_type: row.data_type },
  };
}

function checkFirebaseAdmin(): NamedCheck {
  try {
    const admin = getFirebaseAdmin();
    return {
      status: "PASS",
      message: "Firebase Admin initialized",
      details: { apps: admin.apps.length },
    };
  } catch (error) {
    return { status: "FAIL", message: error instanceof Error ? error.message : String(error) };
  }
}

function checkWebhookExports(): NamedCheck {
  const paymentWebhookOk =
    typeof paymentWebhookHandler === "function" &&
    typeof (paymentWebhookHandler as { handlePaychanguWebhook?: unknown }).handlePaychanguWebhook === "function";
  const payoutWebhookOk =
    typeof payoutWebhookHandler === "function" &&
    typeof (payoutWebhookHandler as { handlePaychanguWebhook?: unknown }).handlePaychanguWebhook === "function";

  return {
    status: paymentWebhookOk && payoutWebhookOk ? "PASS" : "FAIL",
    message: paymentWebhookOk && payoutWebhookOk ? "Webhook handlers are exported" : "Webhook handler exports are missing",
    details: {
      paymentWebhookHandler: paymentWebhookOk,
      payoutWebhookHandler: payoutWebhookOk,
    },
  };
}

function checkPaymentEndpointContract(): NamedCheck {
  const actual = PAYMENT_ENDPOINTS.paychangu;
  const mismatches: Record<string, { expected: string; actual: string | undefined }> = {};

  for (const [key, expected] of Object.entries(REQUIRED_PAYMENT_ENDPOINTS)) {
    const actualValue = (actual as Record<string, string | undefined>)[key];
    if (actualValue !== expected) {
      mismatches[key] = { expected, actual: actualValue };
    }
  }

  return {
    status: Object.keys(mismatches).length === 0 ? "PASS" : "FAIL",
    message: Object.keys(mismatches).length === 0 ? "Payment endpoint contract matches" : "Payment endpoint contract mismatch",
    details: mismatches,
  };
}

function checkPaymentTables(db: any): NamedCheck {
  const required = [
    "payment_webhook_events",
    "seller_payout_accounts",
    "payout_attempts",
    "payout_events",
    "payout_adjustments",
    "seller_payout_account_events",
    "idempotency_keys",
  ];
  const missing = required.filter((table) => !isTablePresent(db, table));
  return {
    status: missing.length === 0 ? "PASS" : "FAIL",
    message: missing.length === 0 ? "Payment lifecycle tables are present" : `Missing payment tables: ${missing.join(", ")}`,
    details: { required_tables: required, missing_tables: missing },
  };
}

function checkPaymentColumns(db: any): NamedCheck {
  const tables = ["payment_webhook_events", "seller_payout_accounts", "payouts", "payout_attempts", "payout_events", "payout_adjustments", "seller_payout_account_events"];
  const missingByTable: Record<string, string[]> = {};

  for (const tableName of tables) {
    const requiredColumns = REQUIRED_COLUMNS[tableName] ?? [];
    if (!isTablePresent(db, tableName)) {
      missingByTable[tableName] = [...requiredColumns];
      continue;
    }

    const presentColumns = new Set(getColumns(db, tableName));
    const missing = requiredColumns.filter((column) => !presentColumns.has(column));
    if (missing.length > 0) missingByTable[tableName] = missing;
  }

  return {
    status: Object.keys(missingByTable).length === 0 ? "PASS" : "FAIL",
    message: Object.keys(missingByTable).length === 0 ? "Payment columns are present" : "Missing payment columns",
    details: missingByTable,
  };
}

function checkPaymentSummarySurface(db: any): NamedCheck {
  const summaryTables = ["payments", "orders", "payouts", "payment_webhook_events"];
  const present = summaryTables.filter((table) => isTablePresent(db, table));
  const missing = summaryTables.filter((table) => !isTablePresent(db, table));

  return {
    status: missing.length === 0 ? "PASS" : "FAIL",
    message: missing.length === 0 ? "Payment summary surface is complete" : "Payment summary surface is incomplete",
    details: { present, missing },
  };
}

function checkPaymentsStrict(db: any): NamedCheck {
  const endpointContract = checkPaymentEndpointContract();
  const webhookExports = checkWebhookExports();
  const tableCheck = checkPaymentTables(db);
  const columnCheck = checkPaymentColumns(db);
  const summarySurfaceCheck = checkPaymentSummarySurface(db);
  const combined = [endpointContract, webhookExports, tableCheck, columnCheck, summarySurfaceCheck];
  const status = combineStatus(combined);

  return {
    status,
    message: status === "PASS" ? "Payments stack is structurally healthy" : "Payments stack has one or more strict failures",
    details: {
      endpointContract,
      webhookExports,
      tableCheck,
      columnCheck,
      summarySurfaceCheck,
    },
  };
}

export function registerDiagnosticsRoutes(app: Express, deps: RouteDeps) {
  const { db } = deps;

  app.get("/api/health", (_req, res) => {
    res.redirect("/api/diagnostics");
  });

  app.get("/api/diagnostics", (_req, res) => {
    const payments = checkPaymentsStrict(db);
    const checks = {
      database: checkDatabase(db),
      tables: checkTables(db),
      columns: checkColumns(db),
      counts: checkCounts(db),
      hard_delete_after: checkHardDeleteColumn(db),
      firebase: checkFirebaseAdmin(),
      cloudinary: checkEnvironmentGroup(["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"], "Cloudinary"),
      smtp: checkEnvironmentGroup(["SMTP_HOST", "SMTP_USER", "SMTP_PASS"], "SMTP"),
      paychangu: checkEnvironmentGroup(["PAYCHANGU_SECRET_KEY", "PAYCHANGU_WEBHOOK_SECRET"], "PayChangu"),
      database_url: checkEnvironment("DATABASE_URL", true),
      admin_access: checkEnvironmentGroup(["ADMIN_EMAILS", "ADMIN_UIDS"], "Admin access", "any"),
      payments,
    };

    const overall = combineStatus(Object.values(checks));

    res.setHeader("Cache-Control", "no-store");
    res.json({
      overall,
      timestamp: new Date().toISOString(),
      uptime_ms: Math.round(process.uptime() * 1000),
      checks,
    });
  });
}
