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
    `Ignoring file filters (${extraArgs.join(
      ", ",
    )}) and running full TypeScript lint with project config.`,
  );
}

const result = spawnSync(
  "tsc",
  ["--noEmit", "-p", "tsconfig.json"],
  { stdio: "inherit", shell: true },
);

process.exit(result.status ?? 1);
