import "dotenv/config";
import { after } from "node:test";

function getDatabaseName(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    return decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  } catch {
    throw new Error("TEST_DATABASE_URL is not a valid PostgreSQL connection string.");
  }
}

function normalizeConnectionString(value: string): string {
  try {
    const url = new URL(value);
    url.searchParams.delete("sslmode");
    url.searchParams.delete("ssl");
    url.searchParams.delete("sslcert");
    url.searchParams.delete("sslkey");
    url.searchParams.delete("sslrootcert");
    return url.toString();
  } catch {
    return value.trim();
  }
}

if (process.env.NODE_ENV === "test") {
  const productionUrl = process.env.DATABASE_URL?.trim();
  const testUrl = process.env.TEST_DATABASE_URL?.trim();

  if (!testUrl) {
    throw new Error(
      "TEST DATABASE SAFETY: TEST_DATABASE_URL is required when NODE_ENV=test. " +
        "Refusing to run tests without an explicitly configured test database.",
    );
  }

  const normalizedTestUrl = normalizeConnectionString(testUrl);
  const normalizedProductionUrl = productionUrl ? normalizeConnectionString(productionUrl) : undefined;

  if (normalizedProductionUrl && normalizedTestUrl === normalizedProductionUrl) {
    throw new Error(
      "TEST DATABASE SAFETY: TEST_DATABASE_URL is identical to DATABASE_URL. " +
        "Refusing to run tests against the configured production database.",
    );
  }

  const testDatabaseName = getDatabaseName(testUrl);
  if (!/(^|[_-])test([_-]|$)/i.test(testDatabaseName)) {
    throw new Error(
      `TEST DATABASE SAFETY: TEST_DATABASE_URL must point to a database explicitly named as a test database. Received: ${testDatabaseName}`,
    );
  }

  process.env.DATABASE_URL = testUrl;
  process.env.ALLOW_MOCK_DATABASE = "false";

  const { postgresDb } = await import("./postgresCompat.js");
  const { repairPaymentWebhookTestSchema } = await import("./testDatabaseSchemaRepair.js");

  repairPaymentWebhookTestSchema();

  after(async () => {
    try {
      await postgresDb.close();
    } catch (error) {
      console.warn(
        "[BuyMesho] PostgreSQL test cleanup failed:",
        error instanceof Error ? error.message : String(error),
      );
    }
  });
}
