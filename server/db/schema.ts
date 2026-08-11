import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const schemaSql = fs.readFileSync(path.join(__dirname, "../schema.sql"), "utf8");
