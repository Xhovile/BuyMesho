// Deprecated compatibility entry point.
// The diagnostic implementation now lives in the modular diagnostics under ./index.ts.
// Keep this re-export temporarily for any legacy imports; no diagnostic logic belongs here.
export { registerDiagnosticsRoutes } from "./index.js";
