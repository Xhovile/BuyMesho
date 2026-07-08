import fs from "node:fs";
import { Client } from "pg";
import dotenv from "dotenv";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing");
}

const client = new Client({
  connectionString,
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync("./ca.pem", "utf8"),
  },
});

async function main() {
  await client.connect();
  const result = await client.query("SELECT version()");
  console.log(result.rows[0].version);
  await client.end();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await client.end();
  } catch {}
  process.exit(1);
});
