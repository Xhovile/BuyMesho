import express, { type Express } from "express";
import { payoutWebhookHandler } from "./modules/payouts/payout.webhooks.js";

export function createApp(): Express {
  const app = express();

  app.set("trust proxy", 1);

  // Ticket Validator authenticates with a Firebase Bearer token, not cookies.
  // Reflect the requesting origin so the validator can call BuyMesho's API
  // from its Vercel deployment without depending on a hard-coded hostname.
  app.use((req, res, next) => {
    const origin = req.headers.origin;

    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }

    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    next();
  });

  app.use("/api/payments/paychangu/webhook", express.raw({ type: "application/json" }));
  app.use("/api/payments/paychangu-payout/webhook", express.raw({ type: "application/json" }));
  app.post("/api/payments/paychangu-payout/webhook", payoutWebhookHandler);

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  app.use((req, _res, next) => {
    if (process.env.NODE_ENV !== "test") {
      console.log(`[HTTP] ${req.method} ${req.url}`);
    }
    next();
  });

  return app;
}
