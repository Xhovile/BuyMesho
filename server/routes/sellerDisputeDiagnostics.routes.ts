import express, { type RequestHandler } from 'express';
import { query } from '../postgres.js';

const REQUIRED_COLUMNS: Record<string, string[]> = {
  dispute_cases: ['id', 'order_id', 'buyer_id', 'seller_id', 'status', 'outcome', 'created_at', 'updated_at'],
  dispute_attempts: ['id', 'case_id', 'order_id', 'status', 'decision', 'created_at', 'updated_at'],
  refund_requests: ['id', 'order_id', 'buyer_id', 'seller_id', 'dispute_case_id', 'status', 'created_at', 'updated_at'],
  refund_transactions: ['id', 'refund_request_id', 'order_id', 'buyer_id', 'seller_id', 'amount', 'currency', 'destination', 'payment_method', 'provider', 'transaction_id', 'status', 'executed_by', 'executed_at', 'supporting_evidence', 'metadata', 'created_at', 'updated_at'],
  audit_events: ['id', 'entity_type', 'entity_id', 'event_type', 'performed_by', 'timestamp', 'previous_state', 'new_state', 'metadata'],
};

async function tableExists(tableName: string): Promise<boolean> {
  const result = await query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.tables
       WHERE table_schema = current_schema()
         AND table_name = $1
     ) AS exists`,
    [tableName],
  );
  return Boolean(result.rows[0]?.exists);
}

async function getColumns(tableName: string): Promise<string[]> {
  const result = await query<{ column_name: string }>(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = $1
      ORDER BY ordinal_position`,
    [tableName],
  );
  return result.rows.map((row) => row.column_name);
}

export function createSellerDisputeDiagnosticsRouter(requireAuth: RequestHandler): express.Router {
  const router = express.Router();

  router.get('/seller-disputes', requireAuth, async (_req: any, res) => {
    const startedAt = Date.now();
    try {
      const tables: Record<string, unknown> = {};
      let overallOk = true;

      for (const [tableName, requiredColumns] of Object.entries(REQUIRED_COLUMNS)) {
        const exists = await tableExists(tableName);
        if (!exists) {
          overallOk = false;
          tables[tableName] = { exists: false, missingColumns: requiredColumns };
          continue;
        }

        const columns = await getColumns(tableName);
        const missingColumns = requiredColumns.filter((column) => !columns.includes(column));
        if (missingColumns.length > 0) overallOk = false;
        tables[tableName] = {
          exists: true,
          missingColumns,
          columnCount: columns.length,
        };
      }

      const relationshipChecks: Record<string, unknown> = {};

      if (Boolean((tables.dispute_cases as any)?.exists) && Boolean((tables.dispute_attempts as any)?.exists)) {
        const result = await query<{ orphan_attempts: string }>(`
          SELECT COUNT(*)::text AS orphan_attempts
            FROM dispute_attempts da
           WHERE NOT EXISTS (SELECT 1 FROM dispute_cases dc WHERE dc.id = da.case_id)
        `);
        const orphanAttempts = Number(result.rows[0]?.orphan_attempts ?? 0);
        relationshipChecks.disputeAttemptsToCases = { ok: orphanAttempts === 0, orphanAttempts };
        if (orphanAttempts !== 0) overallOk = false;
      }

      if (Boolean((tables.refund_requests as any)?.exists) && Boolean((tables.dispute_cases as any)?.exists)) {
        const result = await query<{ orphan_refund_requests: string }>(`
          SELECT COUNT(*)::text AS orphan_refund_requests
            FROM refund_requests rr
           WHERE rr.dispute_case_id IS NOT NULL
             AND NOT EXISTS (SELECT 1 FROM dispute_cases dc WHERE dc.id = rr.dispute_case_id)
        `);
        const orphanRefundRequests = Number(result.rows[0]?.orphan_refund_requests ?? 0);
        relationshipChecks.refundRequestsToCases = { ok: orphanRefundRequests === 0, orphanRefundRequests };
        if (orphanRefundRequests !== 0) overallOk = false;
      }

      if (Boolean((tables.refund_transactions as any)?.exists) && Boolean((tables.refund_requests as any)?.exists)) {
        const result = await query<{ orphan_refund_transactions: string }>(`
          SELECT COUNT(*)::text AS orphan_refund_transactions
            FROM refund_transactions rt
           WHERE rt.refund_request_id IS NOT NULL
             AND NOT EXISTS (SELECT 1 FROM refund_requests rr WHERE rr.id = rt.refund_request_id)
        `);
        const orphanRefundTransactions = Number(result.rows[0]?.orphan_refund_transactions ?? 0);
        relationshipChecks.refundTransactionsToRequests = { ok: orphanRefundTransactions === 0, orphanRefundTransactions };
        if (orphanRefundTransactions !== 0) overallOk = false;
      }

      const writePaths: Record<string, unknown> = {};
      if (Boolean((tables.dispute_cases as any)?.exists)) {
        const result = await query<{ open_cases: string; settled_cases: string }>(`
          SELECT
            COUNT(*) FILTER (WHERE lower(COALESCE(status, '')) IN ('open','under_review','awaiting_response'))::text AS open_cases,
            COUNT(*) FILTER (WHERE lower(COALESCE(status, '')) IN ('resolved','closed'))::text AS settled_cases
          FROM dispute_cases
        `);
        writePaths.disputeCases = result.rows[0] ?? null;
      }
      if (Boolean((tables.refund_transactions as any)?.exists)) {
        const result = await query<{ refund_transactions: string }>(`SELECT COUNT(*)::text AS refund_transactions FROM refund_transactions`);
        writePaths.refundTransactions = result.rows[0] ?? null;
      }
      if (Boolean((tables.audit_events as any)?.exists)) {
        const result = await query<{ seller_resolution_events: string }>(`
          SELECT COUNT(*)::text AS seller_resolution_events
            FROM audit_events
           WHERE event_type IN ('seller_replacement_confirmed','seller_dispute_rejected','seller_refund_confirmed')
        `);
        writePaths.auditEvents = result.rows[0] ?? null;
      }

      const database = await query<{ current_database: string; server_version: string }>(`
        SELECT current_database() AS current_database, current_setting('server_version') AS server_version
      `);

      return res.status(overallOk ? 200 : 503).json({
        ok: overallOk,
        diagnostic: 'seller-dispute-runtime',
        durationMs: Date.now() - startedAt,
        database: database.rows[0] ?? null,
        tables,
        relationships: relationshipChecks,
        state: writePaths,
      });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        diagnostic: 'seller-dispute-runtime',
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  return router;
}
