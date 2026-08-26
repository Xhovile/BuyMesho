import express, { type Express } from "express";
import { paymentWebhookHandler } from "./modules/payments/payment.webhooks.js";
import { payoutWebhookHandler } from "./modules/payouts/payout.webhooks.js";
import { payChanguCallbackHandler, payChanguReturnHandler } from "./modules/payments/paychangu.callback.js";
import { verifyPayChanguWebhookSignature } from "./modules/payments/paychangu.webhook.auth.js";

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
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Signature, X-PayChangu-Signature");

    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    next();
  });

  // PayChangu webhooks must receive the exact raw JSON body so the Signature
  // HMAC can be verified before JSON parsing.
  app.use("/api/payments/paychangu/webhook", express.raw({ type: "application/json" }));
  app.use("/api/payments/paychangu-payout/webhook", express.raw({ type: "application/json" }));

  app.post("/api/payments/paychangu/webhook", (req, res, next) => {
    const signature =
      typeof req.headers.signature === "string"
        ? req.headers.signature
        : typeof req.headers["x-paychangu-signature"] === "string"
          ? req.headers["x-paychangu-signature"]
          : undefined;

    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
    if (!verifyPayChanguWebhookSignature(rawBody, signature, process.env.PAYCHANGU_WEBHOOK_SECRET)) {
      res.status(403).json({ error: "Invalid PayChangu webhook signature" });
      return;
    }

    next();
  }, paymentWebhookHandler);
  app.post("/api/payments/paychangu-payout/webhook", payoutWebhookHandler);

  // PayChangu Standard Checkout uses callback_url for the successful-payment
  // browser redirect/IPN flow. This is intentionally separate from the POST
  // webhook endpoint above.
  app.get("/api/payments/paychangu/callback", payChanguCallbackHandler);
  app.get("/api/payments/paychangu/return", payChanguReturnHandler);

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
