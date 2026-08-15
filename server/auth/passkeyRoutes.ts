import { rateLimit } from "express-rate-limit";
import type { Express, Request } from "express";
import {
  createDiscoverableAuthenticationOptions,
  createRegistrationOptions,
  verifyAuthentication,
  verifyRegistration,
} from "@xhovile/platform/passkeys/server";
import { getFirebaseAdmin } from "./firebaseAdmin.js";
import { requireFirebaseUser } from "../middleware/requireFirebaseUser.js";
import { BuyMeshoPasskeyCeremonyRepository, BuyMeshoPasskeyCredentialRepository } from "./passkeyStore.js";

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many passkey attempts. Please try again later." },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many passkey attempts. Please try again later." },
});

function getPasskeyConfig() {
  const rpID = String(process.env.PASSKEY_RP_ID ?? "").trim();
  const configuredOrigins = String(process.env.PASSKEY_ORIGINS ?? process.env.PASSKEY_ORIGIN ?? "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);

  if (!rpID || configuredOrigins.length === 0) {
    throw new Error("PASSKEY_RP_ID and PASSKEY_ORIGIN(S) must be configured before enabling passkeys");
  }

  return {
    rpName: String(process.env.PASSKEY_RP_NAME ?? "BuyMesho").trim() || "BuyMesho",
    rpID,
    origin: configuredOrigins.length === 1 ? configuredOrigins[0] : configuredOrigins,
  };
}

function getUserUid(req: Request): string | null {
  const uid = String((req as any).user?.uid ?? "").trim();
  return uid || null;
}

export function registerPasskeyRoutes(app: Express) {
  const credentialRepository = new BuyMeshoPasskeyCredentialRepository();
  const ceremonyRepository = new BuyMeshoPasskeyCeremonyRepository();

  app.post("/api/auth/passkey/register/options", registerLimiter, requireFirebaseUser, async (req: any, res) => {
    try {
      const uid = getUserUid(req);
      if (!uid) return res.status(401).json({ error: "Authentication required" });

      const credentials = await credentialRepository.listByUser(uid);
      if (credentials.length > 0) {
        return res.status(409).json({
          error: "A BuyMesho passkey is already registered for this account",
          code: "PASSKEY_ALREADY_REGISTERED",
        });
      }

      const firebaseUser = await getFirebaseAdmin().auth().getUser(uid);
      const result = await createRegistrationOptions(
        {
          id: uid,
          name: firebaseUser.email ?? uid,
          displayName: firebaseUser.displayName ?? firebaseUser.email ?? uid,
        },
        credentials,
        ceremonyRepository,
        getPasskeyConfig(),
      );

      return res.json(result);
    } catch (error) {
      console.error("[passkeys] failed to create registration options", error);
      return res.status(500).json({ error: "Unable to start passkey registration" });
    }
  });

  app.post("/api/auth/passkey/register/verify", registerLimiter, requireFirebaseUser, async (req: any, res) => {
    try {
      const uid = getUserUid(req);
      if (!uid) return res.status(401).json({ error: "Authentication required" });

      // Enforce the one-active-passkey rule again at verification time to
      // prevent duplicate registrations from racing each other.
      const existingCredentials = await credentialRepository.listByUser(uid);
      if (existingCredentials.length > 0) {
        return res.status(409).json({
          error: "A BuyMesho passkey is already registered for this account",
          code: "PASSKEY_ALREADY_REGISTERED",
        });
      }

      const result = await verifyRegistration(
        req.body?.response,
        String(req.body?.ceremonyId ?? ""),
        ceremonyRepository,
        credentialRepository,
        getPasskeyConfig(),
      );

      if (!result.verified || result.credential?.userId !== uid) {
        return res.status(400).json({ error: "Passkey registration could not be verified" });
      }

      return res.json({ success: true, credentialId: result.credential.id });
    } catch (error) {
      console.error("[passkeys] failed to verify registration", error);
      return res.status(400).json({ error: "Passkey registration could not be verified" });
    }
  });

  app.get("/api/auth/passkey/login/options", loginLimiter, async (_req, res) => {
    try {
      const result = await createDiscoverableAuthenticationOptions(ceremonyRepository, getPasskeyConfig());
      return res.json(result);
    } catch (error) {
      console.error("[passkeys] failed to create authentication options", error);
      return res.status(500).json({ error: "Unable to start passkey sign-in" });
    }
  });

  app.post("/api/auth/passkey/login/verify", loginLimiter, async (req, res) => {
    try {
      const result = await verifyAuthentication(
        req.body?.response,
        String(req.body?.ceremonyId ?? ""),
        ceremonyRepository,
        credentialRepository,
        getPasskeyConfig(),
      );

      if (!result.verified || !result.userId) {
        return res.status(401).json({ error: "Passkey sign-in failed" });
      }

      const firebaseUser = await getFirebaseAdmin().auth().getUser(result.userId);
      if (firebaseUser.disabled) {
        return res.status(403).json({ error: "This account is disabled" });
      }

      const customToken = await getFirebaseAdmin().auth().createCustomToken(result.userId, {
        auth_method: "passkey",
      });

      return res.json({
        success: true,
        customToken,
        uid: result.userId,
        credentialId: result.credentialId,
      });
    } catch (error) {
      console.error("[passkeys] failed to verify authentication", error);
      return res.status(401).json({ error: "Passkey sign-in failed" });
    }
  });

  app.get("/api/auth/passkey/status", requireFirebaseUser, async (req: any, res) => {
    try {
      const uid = getUserUid(req);
      if (!uid) return res.status(401).json({ error: "Authentication required" });
      const credentials = await credentialRepository.listByUser(uid);
      return res.json({
        enabled: credentials.length > 0,
        count: credentials.length,
        credentials: credentials.map((credential) => ({
          id: credential.id,
          name: credential.name ?? "Passkey",
          createdAt: credential.createdAt.toISOString(),
          lastUsedAt: credential.lastUsedAt?.toISOString() ?? null,
          deviceType: credential.deviceType ?? null,
          backedUp: credential.backedUp ?? null,
        })),
      });
    } catch (error) {
      console.error("[passkeys] failed to load status", error);
      return res.status(500).json({ error: "Unable to load passkey status" });
    }
  });

  app.delete("/api/auth/passkey/:credentialId", registerLimiter, requireFirebaseUser, async (req: any, res) => {
    try {
      const uid = getUserUid(req);
      const credentialId = String(req.params.credentialId ?? "").trim();
      if (!uid) return res.status(401).json({ error: "Authentication required" });
      if (!credentialId) return res.status(400).json({ error: "Credential ID is required" });

      const credential = await credentialRepository.findByCredentialId(credentialId);
      if (!credential || credential.userId !== uid) {
        return res.status(404).json({ error: "Passkey not found" });
      }

      await credentialRepository.revoke(credentialId);
      return res.json({ success: true });
    } catch (error) {
      console.error("[passkeys] failed to revoke credential", error);
      return res.status(500).json({ error: "Unable to remove passkey" });
    }
  });
}
