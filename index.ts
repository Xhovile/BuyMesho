import "dotenv/config";

import fs from "node:fs";
import { Client } from "pg";

// Debugging
console.log("Working directory:", process.cwd());
console.log(
  "DATABASE_URL:",
  process.env.DATABASE_URL ? "Loaded ✅" : "Missing ❌"
);

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing");
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
  ca: fs.readFileSync("./ca.pem", "utf8"),
  },
});

async function main() {
  console.log("Connecting to Aiven...");

  await client.connect();

  console.log("Connected successfully!");

  const result = await client.query("SELECT version();");

  console.log(result.rows[0].version);

  await client.end();

  console.log("Connection closed.");
}

main().catch(async (err) => {
  console.error("Connection failed:");
  console.error(err);

  try {
    await client.end();
  } catch {}

  process.exit(1);
});