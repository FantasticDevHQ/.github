import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { CHECK, latestRun, rerunAfterEdit } from "./rerun-org-pr-standard.mjs";

const event = (changes = { body: { from: "old" } }) => ({
  action: "edited",
  changes,
  pull_request: { number: 7, head: { sha: "abc1234def" } },
});
const run = (id, status, created_at, name = CHECK, head_sha = "abc1234def") => ({ id, status, created_at, name, head_sha });

function fakeApi(sequence) {
  const calls = [];
  let i = 0;
  const api = async (method, path) => {
    calls.push(`${method} ${path}`);
    if (method === "GET") return { workflow_runs: sequence[Math.min(i++, sequence.length - 1)] };
  };
  return { api, calls };
}
const sleep = async () => {};

test("re-runs the newest completed Org PR standard run for the head", async () => {
  const { api, calls } = fakeApi([[run(1, "completed", "2026-01-01T00:00:00Z"), run(2, "completed", "2026-01-02T00:00:00Z"), run(3, "completed", "2026-01-03T00:00:00Z", "Other")]]);
  assert.equal(await rerunAfterEdit({ api, event: event(), sleep }), `re-ran ${CHECK} run 2`);
  assert.deepEqual(calls.at(-1), "POST /actions/runs/2/rerun");
});

test("waits for an in-progress run before re-running it", async () => {
  const { api, calls } = fakeApi([[run(5, "in_progress", "2026-01-01T00:00:00Z")], [run(5, "completed", "2026-01-01T00:00:00Z")]]);
  assert.equal(await rerunAfterEdit({ api, event: event(), sleep }), `re-ran ${CHECK} run 5`);
  assert.equal(calls.filter((call) => call.startsWith("GET")).length, 2);
});

test("ignores edits that change neither title nor description, and other events", async () => {
  const { api, calls } = fakeApi([[]]);
  assert.match(await rerunAfterEdit({ api, event: event({ base: { ref: { from: "dev" } } }), sleep }), /unchanged/);
  assert.match(await rerunAfterEdit({ api, event: { action: "opened", pull_request: {} }, sleep }), /not an edit/);
  assert.deepEqual(calls, []);
});

test("reports when no run exists yet, and fails clearly if a run never finishes", async () => {
  assert.match(await rerunAfterEdit({ api: fakeApi([[]]).api, event: event(), sleep }), /no Org PR standard run/);
  await assert.rejects(
    rerunAfterEdit({ api: fakeApi([[run(9, "queued", "2026-01-01T00:00:00Z")]]).api, event: event(), sleep, attempts: 3 }),
    /did not finish in time/,
  );
});

test("latestRun only considers the org check on the given head", () => {
  assert.equal(latestRun([run(1, "completed", "2026-01-01T00:00:00Z", CHECK, "other")], "abc1234def"), undefined);
});

test("the re-run workflow runs only trusted code and only on title or description edits", async () => {
  const workflow = await readFile(new URL("../workflow-templates/pr-standard-rerun.yml", import.meta.url), "utf8");
  assert.match(workflow, /pull_request_target:\n\s+types: \[edited\]/);
  assert.match(workflow, /if: github\.event\.changes\.title \|\| github\.event\.changes\.body/);
  assert.match(workflow, /repository: FantasticDevHQ\/\.github/);
  assert.match(workflow, /persist-credentials: false/);
  assert.doesNotMatch(workflow, /github\.event\.pull_request\.head/);
  assert.match(workflow, /actions: write\n\s+contents: read\n/);
  assert.match(workflow, /ubicloud-standard-2-ubuntu-2404/);
});
