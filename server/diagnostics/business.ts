import type { Express } from "express";
import { query } from "../postgres.js";
import type { DiagnosticPayload } from "./types.js";

type ListingStage = {
  status: "PASS" | "FAIL";
  message: string;
  details?: Record<string, unknown>;
};

async function runListingDiagnostics(): Promise<{
  overall: "PASS" | "FAIL";
  checks: Record<string, ListingStage>;
}> {
  const checks: Record<string, ListingStage> = {};

  try {
    const schemaResult = await query<{ column_name: string; data_type: string }>(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'listings'
        AND column_name IN ('id','seller_uid','is_hidden','deleted_at','status','sold_quantity','quantity','created_at','views_count','category')
      ORDER BY column_name
    `);

    const requiredColumns = [
      'id',
      'seller_uid',
      'is_hidden',
      'deleted_at',
      'status',
      'sold_quantity',
      'quantity',
      'created_at',
      'views_count',
      'category',
    ];
    const present = new Set(schemaResult.rows.map((row) => row.column_name));
    const missing = requiredColumns.filter((column) => !present.has(column));

    checks.listing_schema = {
      status: missing.length === 0 ? "PASS" : "FAIL",
      message: missing.length === 0
        ? "Marketplace listing schema contains all required query columns"
        : "Marketplace listing schema is missing columns required by /api/listings",
      details: {
        required_columns: requiredColumns,
        missing_columns: missing,
        present_columns: schemaResult.rows,
      },
    };

    if (missing.length > 0) {
      return { overall: "FAIL", checks };
    }
  } catch (error) {
    checks.listing_schema = {
      status: "FAIL",
      message: "Unable to inspect marketplace listing schema",
      details: { error: error instanceof Error ? error.message : String(error) },
    };
    return { overall: "FAIL", checks };
  }

  try {
    const result = await query<{ count: string }>("SELECT COUNT(*)::text AS count FROM listings");
    checks.listing_total = {
      status: "PASS",
      message: "Listings table is queryable",
      details: { count: Number(result.rows[0]?.count ?? 0) },
    };
  } catch (error) {
    checks.listing_total = {
      status: "FAIL",
      message: "Listings table cannot be queried",
      details: { error: error instanceof Error ? error.message : String(error) },
    };
    return { overall: "FAIL", checks };
  }

  try {
    const result = await query<{ count: string }>(`
      SELECT COUNT(*)::text AS count
      FROM listings
      WHERE is_hidden = 0
    `);
    checks.listing_visible = {
      status: "PASS",
      message: "Listing visibility filter is queryable",
      details: { count: Number(result.rows[0]?.count ?? 0) },
    };
  } catch (error) {
    checks.listing_visible = {
      status: "FAIL",
      message: "Listing visibility filter failed",
      details: { error: error instanceof Error ? error.message : String(error) },
    };
    return { overall: "FAIL", checks };
  }

  try {
    const result = await query<{ count: string }>(`
      SELECT COUNT(*)::text AS count
      FROM listings
      WHERE is_hidden = 0
        AND deleted_at IS NULL
    `);
    checks.listing_not_deleted = {
      status: "PASS",
      message: "Listing deletion filter is queryable",
      details: { count: Number(result.rows[0]?.count ?? 0) },
    };
  } catch (error) {
    checks.listing_not_deleted = {
      status: "FAIL",
      message: "Listing deletion filter failed",
      details: { error: error instanceof Error ? error.message : String(error) },
    };
    return { overall: "FAIL", checks };
  }

  try {
    const result = await query<{ count: string }>(`
      SELECT COUNT(*)::text AS count
      FROM listings l
      JOIN sellers s ON l.seller_uid = s.uid
      WHERE l.is_hidden = 0
        AND l.deleted_at IS NULL
    `);
    checks.listing_seller_join = {
      status: "PASS",
      message: "Marketplace listing-to-seller join succeeds",
      details: { count: Number(result.rows[0]?.count ?? 0) },
    };
  } catch (error) {
    checks.listing_seller_join = {
      status: "FAIL",
      message: "Marketplace listing-to-seller join failed",
      details: { error: error instanceof Error ? error.message : String(error) },
    };
    return { overall: "FAIL", checks };
  }

  try {
    const result = await query<{ count: string }>(`
      SELECT COUNT(*)::text AS count
      FROM listings l
      JOIN sellers s ON l.seller_uid = s.uid
      WHERE l.is_hidden = 0
        AND l.deleted_at IS NULL
      ORDER BY CASE
        WHEN l.status = 'sold' OR l.sold_quantity >= l.quantity THEN 1
        ELSE 0
      END ASC, l.created_at DESC
      LIMIT 24
    `);
    checks.listing_marketplace_order = {
      status: "PASS",
      message: "Marketplace ordering query succeeds",
      details: { count: Number(result.rows[0]?.count ?? 0) },
    };
  } catch (error) {
    checks.listing_marketplace_order = {
      status: "FAIL",
      message: "Marketplace ordering query failed",
      details: { error: error instanceof Error ? error.message : String(error) },
    };
    return { overall: "FAIL", checks };
  }

  try {
    const result = await query<{ count: string }>(`
      SELECT COUNT(*)::text AS count
      FROM listings l
      JOIN sellers s ON l.seller_uid = s.uid
      WHERE l.is_hidden = 0
        AND l.deleted_at IS NULL
    `);
    checks.listing_marketplace_base = {
      status: "PASS",
      message: "Base marketplace listing query succeeds",
      details: { count: Number(result.rows[0]?.count ?? 0) },
    };
  } catch (error) {
    checks.listing_marketplace_base = {
      status: "FAIL",
      message: "Base marketplace listing query failed",
      details: { error: error instanceof Error ? error.message : String(error) },
    };
    return { overall: "FAIL", checks };
  }

  return { overall: "PASS", checks };
}

export function registerBusinessDiagnosticsRoutes(app: Express) {
  app.get("/api/diagnostics/business", async (_req, res) => {
    const started = Date.now();
    try {
      const [orders, listings, lifecycle, lifecycleDetails, listingDiagnostics] = await Promise.all([
        query<{ count: string }>("SELECT COUNT(*)::text AS count FROM orders"),
        query<{ count: string }>("SELECT COUNT(*)::text AS count FROM listings"),
        query<{ count: string }>(`
          SELECT COUNT(*)::text AS count
          FROM orders
          WHERE (status = 'paid' AND paid_at IS NULL)
             OR (status = 'in_escrow' AND paid_at IS NULL)
             OR (status = 'fulfilled' AND (paid_at IS NULL OR fulfilled_at IS NULL))
             OR (fulfilled_at IS NOT NULL AND paid_at IS NULL)
        `),
        query<{
          id: string;
          status: string;
          created_at: string | null;
          updated_at: string | null;
          paid_at: string | null;
          fulfilled_at: string | null;
          placed_at: string | null;
        }>(`
          SELECT id, status, created_at, updated_at, paid_at, fulfilled_at, placed_at
          FROM orders
          WHERE status = 'fulfilled'
            AND fulfilled_at IS NULL
          ORDER BY updated_at DESC NULLS LAST, created_at DESC
        `),
        runListingDiagnostics(),
      ]);

      const lifecycleCount = Number(lifecycle.rows[0]?.count ?? 0);
      const status = lifecycleCount > 0 || listingDiagnostics.overall === "FAIL" ? "FAIL" : "PASS";
      const payload: DiagnosticPayload = {
        overall: status,
        authoritative: true,
        diagnostic_version: "4.1",
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - started,
        checks: {
          business_records: {
            status: "PASS",
            message: "Business record counts collected",
            details: {
              orders: Number(orders.rows[0]?.count ?? 0),
              listings: Number(listings.rows[0]?.count ?? 0),
            },
          },
          ...listingDiagnostics.checks,
          order_lifecycle: {
            status: lifecycleCount > 0 ? "FAIL" : "PASS",
            message: lifecycleCount > 0 ? "Order lifecycle timestamp inconsistencies detected" : "Order lifecycle timestamps are consistent",
            details: {
              count: lifecycleCount,
              offending_orders: lifecycleCount === 0 ? [] : lifecycleDetails.rows,
            },
          },
        },
      };

      res.status(status === "FAIL" ? 503 : 200).setHeader("Cache-Control", "no-store").json(payload);
    } catch (error) {
      res.status(503).setHeader("Cache-Control", "no-store").json({
        overall: "FAIL",
        authoritative: true,
        diagnostic_version: "4.1",
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - started,
        error: error instanceof Error ? error.message : String(error),
      } satisfies DiagnosticPayload);
    }
  });
}
