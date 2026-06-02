import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { createApp } from "./app.js";
import { getDatabase } from "./db/connection.js";
import { runMigrations } from "./db/migrations/index.js";
import { registerRoutes } from "./routes/index.js";
import { getConfiguredAdminEmails } from "./auth/adminAccess.js";
import { requireAuth } from "./middleware/requireAuth.js";
import { requireFirebaseUser } from "./middleware/requireFirebaseUser.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function startServer() {
  const app = createApp();
  const db = runMigrations();

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

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(require("express").static(path.join(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = Number(process.env.PORT ?? 3000);
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
