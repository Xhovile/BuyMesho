import { createHash, randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import { getFirebaseAdmin } from "./firebaseAdmin.js";
import { getPaymentDb } from "../postgresCompat.js";

type AuthenticatedValidatorRequestUser = {
  uid: string;
  email: string | null;
  email_verified: boolean;
  is_admin: boolean;
};

type EventCreatorRow = {
  uid: string;
  status: string;
  active_until: string | null;
};

const VALIDATOR_CLIENT = "ticket-validator";
const HANDOFF_TTL_SECONDS = 60;
const HANDOFF_TTL_MS = HANDOFF_TTL_SECONDS * 1000;

function hashHandoffCode(code: string) {
  return createHash("sha256").update(code, "utf8").digest("hex");
}

function createHandoffCode() {
  return randomBytes(32).toString("base64url");
}

function loadActiveEventCreator(uid: string) {
  const creator = getPaymentDb()
    .prepare("SELECT uid, status, active_until FROM event_creators WHERE uid = ? LIMIT 1")
    .get(uid) as EventCreatorRow | undefined;

  if (!creator || creator.status !== "approved") return null;
  if (creator.active_until) {
    const activeUntil = new Date(creator.active_until).getTime();
    if (Number.isFinite(activeUntil) && activeUntil < Date.now()) return null;
  }
  return creator;
}

export function validatorHandoffHandler(req: Request, res: Response) {
  const user = req.user as AuthenticatedValidatorRequestUser | undefined;
  if (!user) return res.status(401).json({ error: "Authentication required" });

  if (!loadActiveEventCreator(user.uid)) {
    return res.status(403).json({ error: "Approved event creator access is required" });
  }

  try {
    const code = createHandoffCode();
    const codeHash = hashHandoffCode(code);
    const expiresAt = new Date(Date.now() + HANDOFF_TTL_MS).toISOString();
    const db = getPaymentDb();

    db.prepare(
      `DELETE FROM validator_auth_handoffs
       WHERE expires_at <= CURRENT_TIMESTAMP
          OR (consumed_at IS NOT NULL AND consumed_at <= CURRENT_TIMESTAMP - INTERVAL '1 hour')`,
    ).run();

    db.prepare(
      `INSERT INTO validator_auth_handoffs (code_hash, client, uid, expires_at)
       VALUES (?, ?, ?, ?)`,
    ).run(codeHash, VALIDATOR_CLIENT, user.uid, expiresAt);

    return res.json({
      success: true,
      code,
      expiresInSeconds: HANDOFF_TTL_SECONDS,
    });
  } catch (error) {
    console.error("Failed to create Ticket Validator auth handoff:", error);
    return res.status(500).json({ error: "Unable to create Ticket Validator sign-in handoff" });
  }
}

export function validatorHandoffExchangeHandler(req: Request, res: Response) {
  const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
  if (!code || code.length > 256) {
    return res.status(400).json({ error: "A valid Ticket Validator handoff code is required" });
  }

  const codeHash = hashHandoffCode(code);
  const db = getPaymentDb();

  try {
    let handoff: { id: number; uid: string } | undefined;

    db.transaction(() => {
      db.prepare(
        `DELETE FROM validator_auth_handoffs
         WHERE expires_at <= CURRENT_TIMESTAMP
            OR (consumed_at IS NOT NULL AND consumed_at <= CURRENT_TIMESTAMP - INTERVAL '1 hour')`,
      ).run();

      handoff = db
        .prepare(
          `SELECT id, uid
           FROM validator_auth_handoffs
           WHERE code_hash = ?
             AND client = ?
             AND consumed_at IS NULL
             AND expires_at > CURRENT_TIMESTAMP
           LIMIT 1`,
        )
        .get(codeHash, VALIDATOR_CLIENT) as { id: number; uid: string } | undefined;

      if (!handoff) return;

      const consumed = db
        .prepare(
          `UPDATE validator_auth_handoffs
           SET consumed_at = CURRENT_TIMESTAMP
           WHERE id = ?
             AND consumed_at IS NULL
             AND expires_at > CURRENT_TIMESTAMP`,
        )
        .run(handoff.id);

      if (consumed.changes !== 1) {
        handoff = undefined;
      }
    });

    if (!handoff) {
      return res.status(401).json({ error: "Invalid, expired, or already-used Ticket Validator handoff" });
    }

    const creator = loadActiveEventCreator(handoff.uid);
    if (!creator) {
      return res.status(403).json({ error: "Approved event creator access is required" });
    }

    void (async () => {
      try {
        const firebaseUser = await getFirebaseAdmin().auth().getUser(handoff.uid);
        const customToken = await getFirebaseAdmin().auth().createCustomToken(handoff.uid, {
          client: VALIDATOR_CLIENT,
          role: userRole(firebaseUser.customClaims),
        });

        return res.json({
          success: true,
          customToken,
        });
      } catch (error) {
        console.error("Failed to create Ticket Validator session token from handoff:", error);
        return res.status(500).json({ error: "Unable to create Ticket Validator session" });
      }
    })();
  } catch (error) {
    console.error("Failed to redeem Ticket Validator auth handoff:", error);
    return res.status(500).json({ error: "Unable to redeem Ticket Validator sign-in handoff" });
  }
}

function userRole(customClaims: Record<string, unknown> | undefined) {
  if (customClaims?.admin === true || customClaims?.role === "admin") return "admin";
  return "validator";
}
