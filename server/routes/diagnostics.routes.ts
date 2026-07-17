import type { Express } from "express";
import { getFirebaseAdmin } from "../auth/firebaseAdmin.js";

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
};

function statusWeight(status: CheckStatus) {
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

function checkEnvironment(name: string, required = false) {
  const value = process.env[name];
  if (value && value.trim().length > 0) {
    return {
      status: "PASS" as CheckStatus,
      message: `${name} is set`,
      details: { configured: true },
    };
  }

  return {
    status: required ? ("FAIL" as CheckStatus) : ("WARN" as CheckStatus),
    message: `${name} is not set`,
    details: { configured: false },
  };
}

function checkDatabase(db: any) {
  const started = Date.now();
  const row = db.prepare("SELECT 1 AS ok").get() as { ok?: number } | undefined;
  const latencyMs = Date.now() - started;

  return {
    status: row?.ok === 1 ? ("PASS" as CheckStatus) : ("FAIL" as CheckStatus),
    message: row?.ok === 1 ? "Database connection is healthy" : "Database query did not return the expected result",
    details: { latency_ms: latencyMs },
  };
}

function checkTables(db: any) {
  const missing = REQUIRED_TABLES.filter((table) => !isTablePresent(db, table));
  return {
    status: missing.length === 0 ? ("PASS" as CheckStatus) : ("FAIL" as CheckStatus),
    message:
      missing.length === 0
        ? "All required tables are present"
        : `Missing tables: ${missing.join(", ")}`,
    details: { required_tables: REQUIRED_TABLES.length, missing_tables: missing },
  };
}

function checkColumns(db: any) {
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

  const tables = Object.keys(REQUIRED_COLUMNS);
  return {
    status: Object.keys(missingByTable).length === 0 ? ("PASS" as CheckStatus) : ("FAIL" as CheckStatus),
    message:
      Object.keys(missingByTable).length === 0
        ? "Required columns are present"
        : "Some required columns are missing",
    details: {
      checked_tables: tables,
      missing_columns: missingByTable,
    },
  };
}

function checkCounts(db: any) {
  const tablesToCount = ["sellers", "listings", "orders", "payments", "seller_applications", "messages", "conversations"];
  const counts: Record<string, number | null> = {};

  for (const table of tablesToCount) {
    counts[table] = isTablePresent(db, table) ? getCount(db, table) : null;
  }

  return {
    status: "PASS" as CheckStatus,
    message: "Row counts collected",
    details: counts,
  };
}

function checkHardDeleteColumn(db: any) {
  if (!isTablePresent(db, "listings")) {
    return {
      status: "FAIL" as CheckStatus,
      message: "listings table is missing",
    };
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
    return {
      status: "FAIL" as CheckStatus,
      message: "hard_delete_after column is missing",
    };
  }

  const status = row.data_type === "timestamp with time zone" ? "PASS" : "WARN";
  return {
    status,
    message:
      row.data_type === "timestamp with time zone"
        ? "hard_delete_after is normalized to TIMESTAMPTZ"
        : `hard_delete_after is still ${row.data_type}`,
    details: { data_type: row.data_type },
  };
}

function checkFirebaseAdmin() {
  try {
    const admin = getFirebaseAdmin();
    return {
      status: "PASS" as CheckStatus,
      message: "Firebase Admin initialized",
      details: {
        apps: admin.apps.length,
      },
    };
  } catch (error) {
    return {
      status: "FAIL" as CheckStatus,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export function registerDiagnosticsRoutes(app: Express, deps: RouteDeps) {
  const { db } = deps;

  app.get("/api/health", (_req, res) => {
    res.redirect("/api/diagnostics");
  });

  app.get("/api/diagnostics", (_req, res) => {
    const checks = {
      database: checkDatabase(db),
      tables: checkTables(db),
      columns: checkColumns(db),
      counts: checkCounts(db),
      hard_delete_after: checkHardDeleteColumn(db),
      firebase: checkFirebaseAdmin(),
      cloudinary: checkEnvironment("CLOUDINARY_CLOUD_NAME") && checkEnvironment("CLOUDINARY_API_KEY") && checkEnvironment("CLOUDINARY_API_SECRET"),
      smtp: checkEnvironment("SMTP_HOST") && checkEnvironment("SMTP_USER") && checkEnvironment("SMTP_PASS"),
      paychangu: checkEnvironment("PAYCHANGU_SECRET_KEY") && checkEnvironment("PAYCHANGU_WEBHOOK_SECRET"),
      database_url: checkEnvironment("DATABASE_URL", true),
      admin_access: checkEnvironment("ADMIN_EMAILS") || checkEnvironment("ADMIN_UIDS"),
    };

    const normalizedChecks: Record<string, NamedCheck> = Object.fromEntries(
      Object.entries(checks).map(([key, value]) => {
        if (typeof value === "object" && value && "status" in value) {
          return [key, value as NamedCheck];
        }

        return [
          key,
          {
            status: "FAIL" as CheckStatus,
            message: "Invalid diagnostic result",
          },
        ];
      })
    );

    const allChecks = Object.values(normalizedChecks);
    const overall = combineStatus(allChecks);

    res.setHeader("Cache-Control", "no-store");
    res.json({
      overall,
      timestamp: new Date().toISOString(),
      uptime_ms: Math.round(process.uptime() * 1000),
      checks: normalizedChecks,
    });
  });
}
