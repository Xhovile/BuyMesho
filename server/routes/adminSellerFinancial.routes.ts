import express, { type RequestHandler } from "express";
import { query, withTransaction } from "../postgres.js";
import {
  getSellerFinancialAccount,
  listSellerFinancialLedger,
  recordManualRecoveryCredit,
  setSellerPayoutHold,
} from "../modules/financial/sellerFinancialLedger.js";

function sellerUid(req: express.Request): string {
  const value = String(req.params.sellerId ?? "").trim();
  if (!value) throw new Error("sellerId is required");
  return value;
}

function requireAdmin(req: express.Request): void {
  if (!req.user?.is_admin) throw new Error("Admin access required");
}

export function createAdminSellerFinancialRouter(requireAuth: RequestHandler): express.Router {
  const router = express.Router();

  router.get("/:sellerId", requireAuth, async (req, res) => {
    try {
      requireAdmin(req);
      const uid = sellerUid(req);
      const currency = String(req.query.currency ?? "MWK").trim().toUpperCase() || "MWK";
      const account = await getSellerFinancialAccount(uid, currency);
      const ledger = await listSellerFinancialLedger(uid, currency, Number(req.query.limit ?? 100));
      return res.json({ account, ledger });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load seller financial account";
      return res.status(/Admin access required/i.test(message) ? 403 : 400).json({ error: message });
    }
  });

  router.post("/:sellerId/hold", requireAuth, async (req, res) => {
    try {
      requireAdmin(req);
      const uid = sellerUid(req);
      const held = req.body?.held === true;
      const reason = req.body?.reason == null ? null : String(req.body.reason).trim();
      const currency = String(req.body?.currency ?? "MWK").trim().toUpperCase() || "MWK";
      const account = await withTransaction((client) => setSellerPayoutHold(client, {
        sellerUid: uid,
        currency,
        held,
        reason,
        actorId: req.user?.uid ?? null,
      }));
      return res.json({ account });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update seller payout hold";
      return res.status(/Admin access required/i.test(message) ? 403 : 400).json({ error: message });
    }
  });

  router.post("/:sellerId/recovery-credit", requireAuth, async (req, res) => {
    try {
      requireAdmin(req);
      const uid = sellerUid(req);
      const amount = Number(req.body?.amount);
      const reason = String(req.body?.reason ?? "").trim();
      const currency = String(req.body?.currency ?? "MWK").trim().toUpperCase() || "MWK";
      const reference = String(req.body?.reference ?? "").trim() || null;
      if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: "amount must be positive" });
      if (!reason) return res.status(400).json({ error: "reason is required" });

      const result = await withTransaction((client) => recordManualRecoveryCredit(client, {
        sellerUid: uid,
        currency,
        amount,
        reason,
        actorId: req.user?.uid ?? "admin",
        reference,
      }));

      return res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to record seller recovery credit";
      return res.status(/Admin access required/i.test(message) ? 403 : 400).json({ error: message });
    }
  });

  return router;
}
