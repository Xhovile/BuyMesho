
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing in .env");
}

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false,
});

export async function query(text: string, params: any[] = []) {
  return pool.query(text, params);
}
