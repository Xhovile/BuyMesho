import { startServer } from "./server/bootstrap.js";

void startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
