import fs from "node:fs";
import path from "node:path";

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return undefined;
}

function loadSslCaCertificate(
  sslEnabled: boolean,
  rejectUnauthorized: boolean,
): string | undefined {
  if (!sslEnabled || !rejectUnauthorized) return undefined;

  const inlineCa = process.env.PGSSL_CA?.trim();
  if (inlineCa) return inlineCa;

  const caPath =
    process.env.PGSSL_CA_PATH?.trim() || path.resolve(process.cwd(), "ca.pem");

  try {
    return fs.readFileSync(caPath, "utf8");
  } catch (error) {
    const message =
      "PostgreSQL SSL certificate verification is enabled, but the CA certificate could not be loaded " +
      `from ${caPath}. Set PGSSL_CA to the Aiven project CA or set PGSSL_CA_PATH to a readable CA file.`;

    throw new Error(
      `${message} ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export type PostgresSslOptions =
  | false
  | {
      rejectUnauthorized: boolean;
      ca?: string;
    };

export function getPostgresSslOptions(): PostgresSslOptions {
  const sslMode = process.env.PGSSLMODE?.trim().toLowerCase();
  const sslEnabled = sslMode !== "disable";
  const rejectUnauthorized =
    parseBoolean(process.env.PGSSL_REJECT_UNAUTHORIZED) ?? false;
  const ca = loadSslCaCertificate(sslEnabled, rejectUnauthorized);

  return sslEnabled
    ? {
        rejectUnauthorized,
        ...(ca ? { ca } : {}),
      }
    : false;
}
