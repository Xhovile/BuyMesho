import { registerDiagnosticsRoutes as registerLegacyDiagnosticsRoutes } from "./legacy.core.js";
import { registerDatabaseDiagnosticsRoutes } from "./database.js";
import { registerBusinessDiagnosticsRoutes } from "./business.js";
import { registerPaymentDiagnosticsRoutes } from "./payments.js";
import { registerInfrastructureDiagnosticsRoutes } from "./infrastructure.js";
import { registerApiDiagnosticsRoutes } from "./api.js";
import { registerMessagingDiagnosticsRoutes } from "./messaging.js";
import type { Express } from "express";

export function registerDiagnosticsRoutes(app: Express, deps: { db: any }) {
  registerLegacyDiagnosticsRoutes(app, deps);
  registerDatabaseDiagnosticsRoutes(app);
  registerBusinessDiagnosticsRoutes(app);
  registerPaymentDiagnosticsRoutes(app);
  registerInfrastructureDiagnosticsRoutes(app);
  registerApiDiagnosticsRoutes(app);
  registerMessagingDiagnosticsRoutes(app);
}
