import express, { type Express } from "express";

export function createApp(): Express {
  const app = express();

  app.use("/api/payments/paychangu/webhook", express.raw({ type: "application/json" }));
  app.use("/api/payments/paychangu-payout/webhook", express.raw({ type: "application/json" }));

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  return app;
}
