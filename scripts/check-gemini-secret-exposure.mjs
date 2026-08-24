import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const CLIENT_ROOTS = ["src", "public"];
const CLIENT_FILES = ["index.html", "vite.config.ts", "vite.config.js", "vite.config.mjs"];
const TEXT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".html", ".css", ".scss", ".md", ".env"]);

const forbiddenPatterns = [
  { label: "GEMINI_API_KEY", pattern: /GEMINI_API_KEY/g },
  { label: "VITE_GEMINI_*", pattern: /VITE_[A-Z0-9_]*GEMINI[A-Z0-9_]*/gi },
  { label: "process.env.GEMINI_*", pattern: /process\.env\.[A-Z0-9_]*GEMINI[A-Z0-9_]*/gi },
  { label: "import.meta.env.*GEMINI*", pattern: /import\.meta\.env\.[A-Z0-9_]*GEMINI[A-Z0-9_]*/gi },
];

async function collectFiles(targetPath) {
  const info = await stat(targetPath);
  if (info.isFile()) return [targetPath];

  const entries = await readdir(targetPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist" || entry.name === "dist-server") continue;
    const child = path.join(targetPath, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(child));
    else files.push(child);
  }
  return files;
}

function isTextFile(filePath) {
  return TEXT_EXTENSIONS.has(path.extname(filePath).toLowerCase()) || path.basename(filePath).startsWith(".env");
}

async function main() {
  const targets = [
    ...CLIENT_ROOTS.map((root) => path.join(ROOT, root)),
    ...CLIENT_FILES.map((file) => path.join(ROOT, file)),
  ];
  const files = [];
  for (const target of targets) {
    try {
      files.push(...await collectFiles(target));
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }

  const violations = [];
  for (const file of [...new Set(files)].filter(isTextFile)) {
    const text = await readFile(file, "utf8");
    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const { label, pattern } of forbiddenPatterns) {
        pattern.lastIndex = 0;
        if (pattern.test(line)) {
          violations.push(`${path.relative(ROOT, file)}:${index + 1}: forbidden client secret reference (${label})`);
        }
      }
    });
  }

  if (violations.length > 0) {
    console.error("Gemini secret exposure guard failed:");
    for (const violation of violations) console.error(`- ${violation}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Gemini secret exposure guard passed (${new Set(files).size} client-facing files scanned).`);
}

await main();
