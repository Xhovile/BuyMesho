import dotenv from "dotenv";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { createApp } from "./app.js";
import { runMigrations } from "./db/migrations/index.js";
import { registerRoutes } from "./routes/index.js";
import { getConfiguredAdminEmails } from "./auth/adminAccess.js";
import { requireAuth } from "./middleware/requireAuth.js";
import { requireFirebaseUser } from "./middleware/requireFirebaseUser.js";
import { startPayoutReconciliationScheduler } from "./modules/payouts/payout.reconciliation.scheduler.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function registerFallbackHandlers(app: express.Express) {
  app.use((req, res) => {
    if (req.path.startsWith("/api/")) {
      res.status(404).json({ error: "API route not found", path: req.path });
      return;
    }

    res.status(404).json({ error: "Not found", path: req.path });
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

export async function startServer() {
  const app = createApp();
  const db: any = runMigrations();

  if (getConfiguredAdminEmails().length === 0) {
    console.warn(
      "Admin email list is empty. Set ADMIN_EMAILS (or VITE_ADMIN_EMAILS) to enable admin access."
    );
  }

  registerRoutes(app, {
    db,
    requireAuth,
    requireFirebaseUser,
  });

  registerFallbackHandlers(app);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const staticDir = path.join(process.cwd(), "dist");
    app.use(express.static(staticDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(staticDir, "index.html"));
    });
   }
  
 const PORT = Number(process.env.PORT ?? 3000);
    app.listen(PORT, "0.0.0.0", () => {
     console.log(`Server running on http://localhost:${PORT}`);

  setImmediate(() => {
    startPayoutReconciliationScheduler();
  });
});
}
