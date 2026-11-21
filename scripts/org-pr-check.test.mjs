import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { checkPullRequest, report } from "./org-pr-check.mjs";

const good = {
  title: "docs: update readme",
  user: { login: "someone" },
  body: "## Summary\nUpdate docs.\nNo ticket: typo fix\n## What\nFix a typo.\n## Why\nIt was wrong.\n## Evidence\nUI changes: No\n```text\nchecks passed\n```\n## Agent\n- Agent: Codex\n- Session/thread ID: s1",
};
const api = (pr, commits) => async (path) =>
  path.endsWith("/1") ? pr : path.includes("/files") ? [] : commits;

test("passes a conforming PR and fails a non-conforming one with an explanation", async () => {
  const ok = await checkPullRequest({ api: api(good, [{ sha: "a", commit: { message: "docs: x\n\nNo-ticket: typo" } }]), number: 1 });
  assert.deepEqual(ok.errors, []);
  assert.match(report(ok), /passed/);
  const bad = await checkPullRequest({ api: api({ ...good, body: "" }, [{ sha: "b", commit: { message: "docs: x" } }]), number: 1 });
  assert.ok(bad.errors.length);
  const text = report(bad);
  assert.match(text, /@someone/);
  assert.match(text, /cannot merge/);
});

test("the org workflow is read-only and runs only trusted code from this repository", async () => {
  const workflow = await readFile(new URL("../.github/workflows/org-pr-standard.yml", import.meta.url), "utf8");
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /pull-requests: read/);
  assert.doesNotMatch(workflow, /: write/);
  assert.match(workflow, /repository: FantasticDevHQ\/\.github/);
  assert.doesNotMatch(workflow, /pull_request_target/);
});
