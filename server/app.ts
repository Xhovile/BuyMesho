import express, { type Express, type NextFunction, type Request, type Response } from "express";

export function createApp(): Express {
  const app = express();

  app.use("/api/payments/paychangu/webhook", express.raw({ type: "application/json" }));
  app.use("/api/payments/paychangu-payout/webhook", express.raw({ type: "application/json" }));

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  app.use((req: Request, res: Response) => {
    if (req.path.startsWith("/api/")) {
      res.status(404).json({ error: "API route not found", path: req.path });
      return;
    }

    res.status(404).json({ error: "Not found", path: req.path });
  });

  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    console.error("Global error:", err);
    res.status(500).json({
      error: "Internal Server Error",
      message: err instanceof Error ? err.message : "Unknown error",
      stack: process.env.NODE_ENV === "development" && err instanceof Error ? err.stack : undefined,
    });
    next();
  });

  return app;
}
