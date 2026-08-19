import dotenv from "dotenv";
import express from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, type ViteDevServer } from "vite";
import { createApp } from "./app.js";
import { runMigrations } from "./db/migrations/index.js";
import { registerRoutes } from "./routes/index.js";
import { registerMarketplaceRoutes } from "./routes/marketplace.routes.js";
import { registerSellerProfileRoutes } from "./routes/sellerProfile.routes.js";
import { getConfiguredAdminEmails } from "./auth/adminAccess.js";
import { requireAuth } from "./middleware/requireAuth.js";
import { requireFirebaseUser } from "./middleware/requireFirebaseUser.js";
import { createIdempotencyMiddleware } from "./idempotency/middleware.js";
import { startPayoutReconciliationScheduler } from "./modules/payouts/payout.reconciliation.scheduler.js";
import { startEventOwnershipReconciliationScheduler } from "./modules/events/event-ownership.reconciliation.js";
import { createEventTicketIdentityRouter } from "./modules/events/eventTicketIdentity.routes.js";
import { createAdminEventTransactionRouter } from "./modules/admin/adminEventTransaction.routes.js";

dotenv.config();

const getDirname = () => {
  try {
    return path.dirname(fileURLToPath(import.meta.url));
  } catch {
    return process.cwd();
  }
};
const __dirname = getDirname();

function registerFallbackHandlers(app: express.Express) {
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) {
      res.status(404).json({ error: "API route not found", path: req.path });
      return;
    }

    next();
  });

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("Global error:", err);
    res.status(500).json({
      error: "Internal Server Error",
      message: err instanceof Error ? err.message : "Unknown error",
      stack: process.env.NODE_ENV === "development" && err instanceof Error ? err.stack : undefined,
    });
  });
}

async function serveSpaShell(req: express.Request, res: express.Response, vite: ViteDevServer | null) {
  const staticDir = path.join(process.cwd(), "dist");
  const indexPath = path.join(staticDir, "index.html");

  if (process.env.NODE_ENV !== "production" && vite) {
    const indexHtml = await fs.readFile(path.join(process.cwd(), "index.html"), "utf-8");
    const transformedHtml = await vite.transformIndexHtml(req.originalUrl, indexHtml);
    res.status(200).setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(transformedHtml);
    return;
  }

  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(500).json({
        error: "Failed to load app shell",
        path: req.path,
      });
    }
  });
}

export async function startServer() {
  const app = createApp();
  const db: any = runMigrations();

  if (getConfiguredAdminEmails().length === 0) {
    console.warn(
      "Admin email list is empty. Set ADMIN_EMAILS (or VITE_ADMIN_EMAILS) to enable admin access."
    );
  }

  app.use(
    "/api/messages/:conversationId/messages",
    requireAuth,
    createIdempotencyMiddleware("messages.send"),
  );

  // These canonical event-transaction GET handlers intentionally precede the
  // broader admin event router so legacy moderation actions remain unchanged
  // while reads come from the shared event ticket transaction source of truth.
  app.use("/api/admin", createAdminEventTransactionRouter({ db, requireAuth }));

  registerRoutes(app, {
    db,
    requireAuth,
    requireFirebaseUser,
  });

  app.use("/api/event-tickets", createEventTicketIdentityRouter({ db, requireAuth }));

  // Temporary Validator diagnostic endpoint. It is registered immediately
  // after registerRoutes() so the live Render process can prove that this
  // backend is the process serving the Validator API.
  app.get("/api/validator/health", (_req, res) => {
    res.status(200).json({
      ok: true,
      service: "buymesho-validator-api",
      timestamp: new Date().toISOString(),
    });
  });

  console.log("[Validator] registerRoutes() completed; health endpoint registered.");

  registerMarketplaceRoutes(app, { db });
  registerSellerProfileRoutes(app, { db });

  let vite: ViteDevServer | null = null;

  if (process.env.NODE_ENV !== "production") {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    app.use(vite.middlewares);
  } else {
    const staticDir = path.join(process.cwd(), "dist");
    app.use(express.static(staticDir));
    app.get(/^\/(?!api\/).*/, (_req, res) => {
      res.sendFile(path.join(staticDir, "index.html"));
    });
  }

  app.get(/^\/(?!api\/).*/, async (req, res, next) => {
    try {
      await serveSpaShell(req, res, vite);
    } catch (error) {
      next(error);
    }
  });

  registerFallbackHandlers(app);

  const PORT = Number(process.env.PORT ?? 3000);
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log("[Validator] Health endpoint: /api/validator/health");

    setImmediate(() => {
      startPayoutReconciliationScheduler();
      startEventOwnershipReconciliationScheduler();
    });
  });
}
