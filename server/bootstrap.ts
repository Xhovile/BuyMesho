import dotenv from "dotenv";
import express from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, type ViteDevServer } from "vite";
import { createApp } from "./app.js";
import { runMigrations } from "./db/migrations/index.js";
import { postgresDb } from "./db.js";
import { ensurePaymentWebhookEventSchema } from "./modules/payments/payment.webhook.schema.js";
import { registerRoutes } from "./routes/index.js";
import { registerMarketplaceRoutes } from "./routes/marketplace.routes.js";
import { registerSellerProfileRoutes } from "./routes/sellerProfile.routes.js";
import { registerSitemapRoutes } from "./routes/sitemap.routes.js";
import { injectSeoDocument, isSeoDocumentPath, renderSeoDocument } from "./seo/publicSeoShell.js";
import { getConfiguredAdminEmails } from "./auth/adminAccess.js";
import { requireAuth } from "./middleware/requireAuth.js";
import { requireFirebaseUser } from "./middleware/requireFirebaseUser.js";
import { createIdempotencyMiddleware } from "./idempotency/middleware.js";
import { startPayoutReconciliationScheduler } from "./modules/payouts/payout.reconciliation.scheduler.js";
import { startEventOwnershipReconciliationScheduler } from "./modules/events/event-ownership.reconciliation.js";
import { createEventTicketIdentityRouter } from "./modules/events/eventTicketIdentity.routes.js";
import { createAdminEventTransactionRouter } from "./modules/admin/adminEventTransaction.routes.js";
import { createAdminTicketTransactionSearchRouter } from "./modules/admin/adminTicketTransactionSearch.routes.js";
import { createServicePaymentRouter } from "./modules/services/service-payment.routes.js";
import { createXhovileStudioAdminRouter } from "./modules/services/studio-admin.routes.js";
import { logGeminiConfiguration } from "./lib/gemini.js";
import {
  checkoutRateLimit,
  publicPaymentStatusRateLimit,
  publicServicePaymentRateLimit,
  publicServicePaymentStatusRateLimit,
  paymentWebhookRateLimit,
  payoutWebhookRateLimit,
  messageSendRateLimit,
  messageReportRateLimit,
  validatorRateLimit,
} from "./middleware/platformRateLimits.js";

dotenv.config();
logGeminiConfiguration();

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

async function serveSpaShell(
  req: express.Request,
  res: express.Response,
  vite: ViteDevServer | null,
  db: typeof postgresDb,
) {
  const staticDir = path.join(process.cwd(), "dist");
  const indexPath = path.join(staticDir, "index.html");
  const indexHtml =
    process.env.NODE_ENV !== "production" && vite
      ? await vite.transformIndexHtml(
          req.originalUrl,
          await fs.readFile(path.join(process.cwd(), "index.html"), "utf-8"),
        )
      : await fs.readFile(indexPath, "utf-8");

  const rendered = renderSeoDocument(req, db);
  const documentHtml = injectSeoDocument(indexHtml, rendered);

  res
    .status(200)
    .setHeader("Content-Type", "text/html; charset=utf-8")
    .setHeader("X-BuyMesho-SEO", "server-rendered")
    .send(documentHtml);
}
export async function startServer() {
  const app = createApp();
  runMigrations();
  const db = postgresDb;

  // Normalize public URLs before serving the SPA so search engines and
  // browsers receive a real permanent redirect for legacy homepage URLs.
  // IMPORTANT: API requests must never be redirected here. Redirecting an
  // authenticated API fetch across hosts can strip/alter request credentials.
  app.use((req, res, next) => {
    const isApiRequest = req.path.startsWith("/api/");
    if (isApiRequest) {
      next();
      return;
    }

    const forwardedHost = req.get("x-forwarded-host");
    const host = (forwardedHost ?? req.get("host") ?? "").split(",")[0].trim().toLowerCase();
    const isLegacyHost = host === "www.buymesho.app" || host.startsWith("www.buymesho.app:");
    const isLegacyHomePath = req.path === "/home";

    if (!isLegacyHost && !isLegacyHomePath) {
      next();
      return;
    }

    const targetPath = isLegacyHomePath ? "/" : req.path;
    const query = req.originalUrl.includes("?") ? req.originalUrl.slice(req.originalUrl.indexOf("?")) : "";
    res.redirect(308, `https://buymesho.app${targetPath}${query}`);
  });

  // Keep the live payment webhook audit schema compatible with the current
  // webhook persistence layer. This is idempotent and runs on every startup.
  ensurePaymentWebhookEventSchema(db);

  if (getConfiguredAdminEmails().length === 0) {
    console.warn(
      "Admin email list is empty. Set ADMIN_EMAILS (or VITE_ADMIN_EMAILS) to enable admin access."
    );
  }

  app.use(
    "/api/messages/:conversationId/messages",
    requireAuth,
    messageSendRateLimit,
    createIdempotencyMiddleware("messages.send"),
  );

  app.use(
    "/api/messages/:conversationId/report",
    requireAuth,
    messageReportRateLimit,
  );

  app.use("/api/payments/checkout", checkoutRateLimit);
  app.use("/api/payments/public-status", publicPaymentStatusRateLimit);
  app.use(
    "/api/admin/xhovile-studio",
    createXhovileStudioAdminRouter(requireAuth),
  );
  app.use(
    "/api/public/service-payments",
    createServicePaymentRouter(
      publicServicePaymentRateLimit,
      publicServicePaymentStatusRateLimit,
    ),
  );
  app.use("/api/payments/webhooks/paychangu", paymentWebhookRateLimit);
  app.use("/api/payments/webhooks/payouts", payoutWebhookRateLimit);
  app.use("/api/validator", validatorRateLimit);

  // Canonical event-transaction reads precede the broader admin event router.
  app.use("/api/admin", createAdminEventTransactionRouter({ db, requireAuth }));
  app.use("/api/admin", createAdminTicketTransactionSearchRouter({ db, requireAuth }));

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
  registerSitemapRoutes(app, { db });

  let vite: ViteDevServer | null = null;

  if (process.env.NODE_ENV !== "production") {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    app.use(vite.middlewares);
  }

  // Public extensionless document routes receive a server-rendered SEO shell
  // before production static assets are handled. The browser still boots the SPA.
  app.get(/^\/(?!api\/).*/, async (req, res, next) => {
    if (!isSeoDocumentPath(req.path)) {
      next();
      return;
    }

    try {
      await serveSpaShell(req, res, vite, db);
    } catch (error) {
      next(error);
    }
  });

  if (process.env.NODE_ENV === "production") {
    const staticDir = path.join(process.cwd(), "dist");
    app.use(express.static(staticDir));
  }

  registerFallbackHandlers(app);

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log("[Validator] Health endpoint: /api/validator/health");

    setImmediate(() => {
      startPayoutReconciliationScheduler();
      startEventOwnershipReconciliationScheduler();
    });
  });
}
