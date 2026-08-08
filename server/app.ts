import express, { type Express } from "express";
import { paymentWebhookHandler } from "./modules/payments/payment.webhooks.js";
import { payoutWebhookHandler } from "./modules/payouts/payout.webhooks.js";
import { registerSessionRoutes } from "./auth/sessionRoutes.js";

export function createApp(): Express {
  const app = express();

  app.use("/api/payments/paychangu/webhook", express.raw({ type: "application/json" }));
  app.use("/api/payments/paychangu-payout/webhook", express.raw({ type: "application/json" }));

  app.post("/api/payments/paychangu/webhook", paymentWebhookHandler);
  app.post("/api/payments/paychangu-payout/webhook", payoutWebhookHandler);

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  registerSessionRoutes(app);

  return app;
}