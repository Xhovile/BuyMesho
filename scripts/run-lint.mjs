import { spawnSync } from "node:child_process";

const check = spawnSync(
  process.execPath,
  [
    "-e",
    "try { require('typescript'); } catch (e) { process.exit(1); }",
  ],
  { stdio: "ignore" },
);

if (check.status !== 0) {
  console.error("Dependencies are missing. Run npm ci before npm run lint.");
  process.exit(1);
}

const extraArgs = process.argv.slice(2);
if (extraArgs.length > 0) {
  console.warn(
    `Ignoring file filters (${extraArgs.join(", ")}) and running full TypeScript lint with project configs.`,
  );
}

function runTypecheck(project) {
  console.log(`[lint] Type-checking ${project}...`);
  const result = spawnSync("tsc", ["--noEmit", "-p", project], {
    stdio: "inherit",
    shell: true,
  });

  if (result.error) {
    console.error(`[lint] Failed to start TypeScript for ${project}:`, result.error);
    return 1;
  }

  return result.status ?? 1;
}

for (const project of ["tsconfig.client.json", "tsconfig.server.json"]) {
  const status = runTypecheck(project);
  if (status !== 0) {
    process.exit(status);
  }
}
