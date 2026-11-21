import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { CHECK, latestRun, rerunAfterEdit } from "./rerun-org-pr-standard.mjs";

const event = (changes = { body: { from: "old" } }) => ({
  action: "edited",
  changes,
  pull_request: { number: 7, head: { sha: "abc1234def" } },
});
const REQUIRED = "https://api.github.com/repos/o/r/actions/required_workflows/425892824";
const run = (id, status, created_at, name = CHECK, head_sha = "abc1234def", extra = {}) => ({
  id, status, created_at, name, head_sha, workflow_url: REQUIRED, ...extra,
});

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
  assert.equal(calls.at(-1), "POST /actions/runs/5/rerun");
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

test("ignores a newer same-named decoy workflow that a pull request could add", async () => {
  const decoy = run(8, "completed", "2026-01-05T00:00:00Z", CHECK, "abc1234def", {
    workflow_url: "https://api.github.com/repos/o/r/actions/workflows/404308042",
  });
  const { api, calls } = fakeApi([[run(2, "completed", "2026-01-02T00:00:00Z"), decoy]]);
  assert.equal(await rerunAfterEdit({ api, event: event(), sleep }), `re-ran ${CHECK} run 2`);
  assert.equal(calls.at(-1), "POST /actions/runs/2/rerun");
  const { api: onlyDecoy, calls: none } = fakeApi([[decoy]]);
  assert.match(await rerunAfterEdit({ api: onlyDecoy, event: event(), sleep }), /no Org PR standard run/);
  assert.ok(!none.some((call) => call.startsWith("POST")));
});

test("leaves runs awaiting approval alone", async () => {
  for (const extra of [{ status: "action_required" }, { status: "waiting" }, { status: "completed", conclusion: "action_required" }]) {
    const { api, calls } = fakeApi([[run(4, extra.status, "2026-01-01T00:00:00Z", CHECK, "abc1234def", extra)]]);
    assert.match(await rerunAfterEdit({ api, event: event(), sleep }), /awaiting approval/);
    assert.ok(!calls.some((call) => call.startsWith("POST")));
  }
});

test("explains how to recover when GitHub refuses the re-run", async () => {
  const api = async (method) => {
    if (method === "POST") throw new Error("GitHub POST /actions/runs/3/rerun failed: 403");
    return { workflow_runs: [run(3, "completed", "2026-01-01T00:00:00Z")] };
  };
  await assert.rejects(rerunAfterEdit({ api, event: event(), sleep }), /Push a commit, or close and reopen the pull request/);
});
