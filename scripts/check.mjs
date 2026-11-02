import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const tests = readdirSync(new URL("./worktree/", import.meta.url))
  .filter((name) => name.endsWith(".test.mjs"))
  .map((name) => `scripts/worktree/${name}`);
tests.push("scripts/pr-standard.test.mjs", "scripts/enforce-pr-standard.test.mjs");
const result = spawnSync(process.execPath, ["--test", ...tests], { cwd: root, stdio: "inherit" });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
